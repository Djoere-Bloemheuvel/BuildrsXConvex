import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// ===============================
// AUTOMATION TEMPLATES
// ===============================

export const getAutomationTemplates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("automationTemplates")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const createAutomationTemplate = mutation({
  args: {
    key: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    executionFunction: v.string(), // Which Convex function to execute
    handlerFunction: v.optional(v.string()), // Optional pre-processing function
    defaultSettings: v.object({
      dailyLimit: v.number(),
      executionTime: v.string(),
      targetingOptions: v.array(v.string()),
    }),
    version: v.string(),
    compatibility: v.optional(v.array(v.string())), // Compatible client types
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.insert("automationTemplates", {
      ...args,
      isActive: true,
      totalExecutions: 0,
      successRate: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ===============================
// CLIENT AUTOMATIONS
// ===============================

export const getClientAutomations = query({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const clientAutomations = await ctx.db
      .query("clientAutomations")
      .filter((q) => q.eq(q.field("clientId"), args.clientId))
      .collect();

    // Enrich with template data
    const enrichedAutomations = await Promise.all(
      clientAutomations.map(async (automation) => {
        const template = await ctx.db.get(automation.templateId);
        return {
          ...automation,
          template,
          displayName: automation.customName || template?.name || "Unnamed Automation",
        };
      })
    );

    return enrichedAutomations;
  },
});

export const createClientAutomation = mutation({
  args: {
    clientId: v.string(),
    templateKey: v.string(), // Use template key instead of ID for easier usage
    customName: v.optional(v.string()),
    dailyLimit: v.number(),
    executionTime: v.optional(v.string()),
    targetingCriteria: v.optional(v.object({
      functionGroups: v.optional(v.array(v.string())),
      industries: v.optional(v.array(v.string())),
      countries: v.optional(v.array(v.string())),
      employeeMin: v.optional(v.number()),
      employeeMax: v.optional(v.number()),
      customFilters: v.optional(v.object({}))
    })),
    // Legacy fields for backward compatibility
    targetFunctionGroups: v.optional(v.array(v.string())),
    targetIndustries: v.optional(v.array(v.string())),
    targetCountries: v.optional(v.array(v.string())),
    targetEmployeeMin: v.optional(v.number()),
    targetEmployeeMax: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get the template by key
    const template = await ctx.runQuery("automations:getTemplateByKey", {
      key: args.templateKey,
    });
    
    if (!template) {
      throw new Error(`Template with key '${args.templateKey}' not found. Available templates: bulk-lead-conversion, email-campaign-automation, linkedin-outreach-automation, smart-assignment-email`);
    }

    // VALIDATION: Ensure client exists
    const clientExists = await ctx.db
      .query("clients")
      .filter((q) => q.eq(q.field("_id"), args.clientId as any))
      .first();
    
    if (!clientExists) {
      throw new Error(`Client with ID ${args.clientId} does not exist. Use a valid client ID from the clients table.`);
    }
    
    console.log(`✅ Creating ${template.name} automation for client: ${clientExists.name || clientExists.domain} (${args.clientId})`);
    
    const now = Date.now();
    
    // Merge targeting criteria (prefer new format, fallback to legacy)
    const targetingCriteria = args.targetingCriteria || {
      functionGroups: args.targetFunctionGroups,
      industries: args.targetIndustries,
      countries: args.targetCountries,
      employeeMin: args.targetEmployeeMin,
      employeeMax: args.targetEmployeeMax,
    };
    
    return await ctx.db.insert("clientAutomations", {
      clientId: args.clientId,
      templateId: template._id,
      customName: args.customName || template.name,
      isActive: true,
      targetingCriteria: targetingCriteria,
      // Legacy fields for backward compatibility
      targetFunctionGroups: args.targetFunctionGroups,
      targetIndustries: args.targetIndustries,
      targetCountries: args.targetCountries,
      targetEmployeeMin: args.targetEmployeeMin,
      targetEmployeeMax: args.targetEmployeeMax,
      dailyLimit: args.dailyLimit,
      executionTime: args.executionTime || template.defaultSettings.executionTime,
      totalConverted: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateClientAutomation = mutation({
  args: {
    automationId: v.id("clientAutomations"),
    customName: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    targetFunctionGroups: v.optional(v.array(v.string())),
    targetIndustries: v.optional(v.array(v.string())),
    targetCountries: v.optional(v.array(v.string())),
    targetEmployeeMin: v.optional(v.number()),
    targetEmployeeMax: v.optional(v.number()),
    dailyLimit: v.optional(v.number()),
    executionTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { automationId, ...updates } = args;
    
    return await ctx.db.patch(automationId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const toggleClientAutomation = mutation({
  args: {
    automationId: v.id("clientAutomations"),
  },
  handler: async (ctx, args) => {
    const automation = await ctx.db.get(args.automationId);
    if (!automation) {
      throw new Error("Automation not found");
    }
    
    return await ctx.db.patch(args.automationId, {
      isActive: !automation.isActive,
      updatedAt: Date.now(),
    });
  },
});

export const deleteClientAutomation = mutation({
  args: {
    automationId: v.id("clientAutomations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.automationId);
  },
});

// ===============================
// AUTOMATION EXECUTION
// ===============================

export const executeClientAutomation = mutation({
  args: {
    clientAutomationId: v.id("clientAutomations"),
  },
  handler: async (ctx, args) => {
    const automation = await ctx.db.get(args.clientAutomationId);
    if (!automation || !automation.isActive) {
      throw new Error("Automation not found or inactive");
    }

    const template = await ctx.db.get(automation.templateId);
    if (!template) {
      throw new Error("Automation template not found");
    }

    const now = Date.now();
    
    try {
      // Use the template's execution function or fallback based on category
      let executionFunction = template.executionFunction;
      if (!executionFunction) {
        // Fallback for existing templates without executionFunction
        if (template.category === "lead-conversion" || template.key === "bulk-lead-conversion") {
          executionFunction = "exactLeadConversion:convertExactMatchLeads";
        } else {
          throw new Error(`Template ${template.name} does not specify an execution function and no fallback available`);
        }
      }

      // Execute the specific function defined in the template using client-specific settings
      let conversionResult;
      if (executionFunction === "exactLeadConversion:convertExactMatchLeads") {
        // First get matching leads using client's specific targeting criteria
        const targetingCriteria = automation.targetingCriteria || {
          functionGroups: automation.targetFunctionGroups,
          industries: automation.targetIndustries,
          countries: automation.targetCountries,
          employeeMin: automation.targetEmployeeMin,
          employeeMax: automation.targetEmployeeMax,
        };

        const leadMatches = await ctx.runMutation("exactLeadConversion:getExactMatchLeads", {
          functionGroups: targetingCriteria.functionGroups,
          industries: targetingCriteria.industries,
          countries: targetingCriteria.countries,
          minEmployeeCount: targetingCriteria.employeeMin,
          maxEmployeeCount: targetingCriteria.employeeMax,
          maxResults: automation.dailyLimit, // Client's specific daily limit
          clientIdentifier: automation.clientId,
        });

        if (leadMatches.totalMatches === 0) {
          // Log successful execution with 0 conversions
          await ctx.db.insert("automationExecutions", {
            clientAutomationId: args.clientAutomationId,
            clientId: automation.clientId,
            templateId: automation.templateId,
            executedAt: now,
            leadsProcessed: 0,
            leadsConverted: 0,
            success: true,
            executionDetails: {
              criteria: {
                targetFunctionGroups: automation.targetFunctionGroups,
                targetIndustries: automation.targetIndustries,
                targetCountries: automation.targetCountries,
                targetEmployeeMin: automation.targetEmployeeMin,
                targetEmployeeMax: automation.targetEmployeeMax,
              },
              matchedLeads: 0,
              convertedLeadIds: [],
            },
          });
          
          // Update last executed
          await ctx.db.patch(args.clientAutomationId, {
            lastExecuted: now,
            updatedAt: now,
          });
          
          return { success: true, convertedCount: 0, message: "No leads found matching criteria" };
        }

        // Convert the matched leads using the template's specified function
        const leadIds = leadMatches.leads.map(lead => lead.leadId);
        conversionResult = await ctx.runMutation(executionFunction, {
          leadIds: leadIds,
          clientIdentifier: automation.clientId,
        });
      } else {
        // Generic execution for other automation types (email, linkedin, etc.)
        // Pass client-specific settings to the template's execution function
        const targetingCriteria = automation.targetingCriteria || {
          functionGroups: automation.targetFunctionGroups,
          industries: automation.targetIndustries,
          countries: automation.targetCountries,
          employeeMin: automation.targetEmployeeMin,
          employeeMax: automation.targetEmployeeMax,
        };

        conversionResult = await ctx.runMutation(executionFunction, {
          clientIdentifier: automation.clientId,
          dailyLimit: automation.dailyLimit, // Client's specific daily limit
          targetingCriteria: targetingCriteria, // Client's specific targeting
          executionTime: automation.executionTime, // Client's specific execution time
          customName: automation.customName, // Client's custom name for this automation
        });
      }

      // Log execution
      await ctx.db.insert("automationExecutions", {
        clientAutomationId: args.clientAutomationId,
        clientId: automation.clientId,
        templateId: automation.templateId,
        executedAt: now,
        leadsProcessed: leadsToConvert.length,
        leadsConverted: conversionResult.convertedCount,
        success: conversionResult.success,
        errorMessage: conversionResult.success ? undefined : conversionResult.errors.join(", "),
        executionDetails: {
          criteria: {
            targetFunctionGroups: automation.targetFunctionGroups,
            targetIndustries: automation.targetIndustries,
            targetCountries: automation.targetCountries,
            targetEmployeeMin: automation.targetEmployeeMin,
            targetEmployeeMax: automation.targetEmployeeMax,
          },
          matchedLeads: targetResult.totalMatches,
          convertedLeadIds: leadIds,
        },
      });

      // Update automation stats
      await ctx.db.patch(args.clientAutomationId, {
        lastExecuted: now,
        totalConverted: automation.totalConverted + conversionResult.convertedCount,
        updatedAt: now,
      });

      return {
        success: conversionResult.success,
        convertedCount: conversionResult.convertedCount,
        totalMatches: targetResult.totalMatches,
        errors: conversionResult.errors,
      };

    } catch (error) {
      // Log failed execution
      await ctx.db.insert("automationExecutions", {
        clientAutomationId: args.clientAutomationId,
        clientId: automation.clientId,
        templateId: automation.templateId,
        executedAt: now,
        leadsProcessed: 0,
        leadsConverted: 0,
        success: false,
        errorMessage: error.message,
      });

      throw error;
    }
  },
});

export const getAutomationExecutions = query({
  args: {
    clientAutomationId: v.optional(v.id("clientAutomations")),
    clientId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("automationExecutions");
    
    if (args.clientAutomationId) {
      query = query.withIndex("by_client_automation", (q) => 
        q.eq("clientAutomationId", args.clientAutomationId)
      );
    } else if (args.clientId) {
      query = query.withIndex("by_client", (q) => 
        q.eq("clientId", args.clientId as Id<"clients">)
      );
    }
    
    const executions = await query
      .order("desc")
      .take(args.limit || 50);
    
    return executions;
  },
});

// ===============================
// MIGRATION & SETUP FUNCTIONS
// ===============================

export const seedAutomationTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const templates = [
      {
        key: "bulk-lead-conversion",
        name: "Bulk Lead Conversion",
        description: "Automated conversion of leads to contacts based on targeting criteria",
        category: "lead-conversion",
        type: "scheduled", // Required field from existing schema
        defaultSettings: {
          dailyLimit: 25,
          executionTime: "09:00",
          targetingOptions: ["functionGroups", "industries", "countries", "employeeCount", "customFilters"],
        },
        version: "1.0.0",
      },
      {
        key: "email-campaign-automation",
        name: "Email Campaign Automation",
        description: "Automated email outreach campaigns with sequences",
        category: "email-outreach",
        type: "scheduled",
        defaultSettings: {
          dailyLimit: 50,
          executionTime: "10:00",
          targetingOptions: ["functionGroups", "industries", "countries", "campaignStatus"],
        },
        version: "1.0.0",
      },
      {
        key: "linkedin-outreach-automation",
        name: "LinkedIn Outreach Automation",
        description: "Automated LinkedIn connection requests and messages",
        category: "linkedin-outreach",
        type: "scheduled",
        defaultSettings: {
          dailyLimit: 30,
          executionTime: "11:00",
          targetingOptions: ["functionGroups", "industries", "countries", "connectionStatus"],
        },
        version: "1.0.0",
      },
      {
        key: "smart-assignment-email",
        name: "Smart Assignment - Email Campaigns",
        description: "Automatically assign candidates to their best matching email campaigns and trigger n8n workflow",
        category: "email-outreach",
        type: "manual", // Manual trigger via Smart Assignment button
        executionFunction: "campaigns:smartAssignCandidates",
        defaultSettings: {
          dailyLimit: 50,
          executionTime: "09:30", 
          targetingOptions: ["automatic", "dailyLimit"],
          webhookUrl: "https://djoere.app.n8n.cloud/webhook/35f92b6a-b750-422e-ae90-a746c6e3fd6b",
        },
        version: "1.0.0",
      },
    ];

    const results = [];
    for (const template of templates) {
      // Check if template already exists
      const existing = await ctx.db
        .query("automationTemplates")
        .withIndex("by_key", (q) => q.eq("key", template.key))
        .first();

      if (!existing) {
        const templateId = await ctx.db.insert("automationTemplates", {
          ...template,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        results.push({ key: template.key, id: templateId, status: "created" });
      } else {
        results.push({ key: template.key, id: existing._id, status: "exists" });
      }
    }

    return { success: true, templates: results };
  },
});

export const getTemplateByKey = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("automationTemplates")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    return template;
  },
});

export const getBulkLeadConversionTemplate = query({
  args: {},
  handler: async (ctx) => {
    // Try to find the bulk-lead-conversion template first
    let template = await ctx.db
      .query("automationTemplates")
      .withIndex("by_key", (q) => q.eq("key", "bulk-lead-conversion"))
      .first();

    // Fallback to any lead-conversion template if bulk-lead-conversion doesn't exist
    if (!template) {
      template = await ctx.db
        .query("automationTemplates")
        .filter((q) => q.eq(q.field("category"), "lead-conversion"))
        .first();
    }

    return template;
  },
});