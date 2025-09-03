import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ===============================
// SIMPLE WORKFLOW ACTIONS
// ===============================

// Email Campaign Workflow Action
export const runEmailCampaignWorkflow = action({
  args: {
    campaignId: v.id("campaigns"),
    contactIds: v.array(v.id("contacts")),
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    console.log(`Starting email campaign workflow for ${args.contactIds.length} contacts`);

    try {
      // Step 1: Validate campaign
      const campaign = await ctx.runQuery(internal.campaigns.getCampaignById, {
        campaignId: args.campaignId,
      });

      if (!campaign || !campaign.isActive) {
        throw new Error("Campaign not active or not found");
      }

      // Step 2: Process contacts in batches
      const batchSize = 50;
      const contactBatches = [];
      
      for (let i = 0; i < args.contactIds.length; i += batchSize) {
        contactBatches.push(args.contactIds.slice(i, i + batchSize));
      }

      const results = [];
      
      for (const [batchIndex, batch] of contactBatches.entries()) {
        console.log(`Processing batch ${batchIndex + 1}/${contactBatches.length}`);
        
        // Send emails for this batch
        const batchResult = await ctx.runMutation(internal.campaigns.sendEmailBatch, {
          campaignId: args.campaignId,
          contactIds: batch,
          clientId: args.clientId,
        });

        results.push(batchResult);

        // Wait between batches to avoid rate limits
        if (batchIndex < contactBatches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // 5 minutes
        }
      }

      // Step 3: Update campaign statistics
      await ctx.runMutation(internal.campaigns.updateCampaignStats, {
        campaignId: args.campaignId,
        emailsSent: args.contactIds.length,
        batchResults: results,
      });

      console.log(`Email campaign workflow completed: ${args.contactIds.length} emails sent`);

      return {
        success: true,
        emailsSent: args.contactIds.length,
        batchesProcessed: contactBatches.length,
        results,
      };
    } catch (error) {
      console.error("Email campaign workflow failed:", error);
      throw error;
    }
  },
});

// Lead Nurturing Workflow Action
export const runLeadNurturingWorkflow = action({
  args: {
    contactId: v.id("contacts"),
    clientId: v.id("clients"),
    nurturingSteps: v.array(v.object({
      stepName: v.string(),
      delayDays: v.number(),
      actionType: v.union(v.literal("email"), v.literal("linkedin"), v.literal("followup")),
      templateId: v.optional(v.id("automationTemplates")),
    })),
  },
  handler: async (ctx, args) => {
    console.log(`Starting lead nurturing workflow for contact ${args.contactId}`);

    try {
      // Step 1: Validate contact
      const contact = await ctx.runQuery(internal.contacts.getContactById, {
        contactId: args.contactId,
      });

      if (!contact || contact.status === "converted") {
        return { success: false, reason: "Contact not eligible for nurturing" };
      }

      const results = [];

      // Execute nurturing sequence
      for (const [stepIndex, step] of args.nurturingSteps.entries()) {
        console.log(`Executing nurturing step: ${step.stepName}`);

        // Wait for the specified delay (except first step)
        if (stepIndex > 0 && step.delayDays > 0) {
          console.log(`Waiting ${step.delayDays} days...`);
          await new Promise(resolve => 
            setTimeout(resolve, step.delayDays * 24 * 60 * 60 * 1000)
          );
        }

        // Check if contact is still eligible
        const currentContact = await ctx.runQuery(internal.contacts.getContactById, {
          contactId: args.contactId,
        });

        if (!currentContact || currentContact.status === "converted" || currentContact.status === "do_not_contact") {
          results.push({
            step: step.stepName,
            skipped: true,
            reason: "Contact no longer eligible",
          });
          break;
        }

        // Execute the nurturing action
        let actionResult;
        switch (step.actionType) {
          case "email":
            actionResult = await ctx.runMutation(internal.campaigns.sendNurturingEmail, {
              contactId: args.contactId,
              templateId: step.templateId,
              clientId: args.clientId,
            });
            break;
          case "linkedin":
            actionResult = await ctx.runMutation(internal.campaigns.sendLinkedInMessage, {
              contactId: args.contactId,
              templateId: step.templateId,
              clientId: args.clientId,
            });
            break;
          case "followup":
            actionResult = await ctx.runMutation(internal.contacts.createFollowupTask, {
              contactId: args.contactId,
              clientId: args.clientId,
              note: `Nurturing step: ${step.stepName}`,
            });
            break;
          default:
            throw new Error(`Unknown action type: ${step.actionType}`);
        }

        results.push({
          step: step.stepName,
          success: true,
          result: actionResult,
        });
      }

      console.log(`Lead nurturing workflow completed: ${results.length} steps executed`);

      return {
        success: true,
        contactId: args.contactId,
        stepsCompleted: results.length,
        results,
      };
    } catch (error) {
      console.error("Lead nurturing workflow failed:", error);
      throw error;
    }
  },
});

// Bulk Lead Conversion Workflow Action
export const runBulkConversionWorkflow = action({
  args: {
    clientId: v.id("clients"),
    leadIds: v.array(v.id("leads")),
    maxCreditsToUse: v.number(),
    priorityFunctionGroups: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`Starting bulk conversion workflow for ${args.leadIds.length} leads`);

    try {
      // Step 1: Validate client credits
      const client = await ctx.runQuery(internal.clients.getClientById, {
        clientId: args.clientId,
      });

      if (!client || client.credits < args.maxCreditsToUse) {
        throw new Error("Insufficient credits for bulk conversion");
      }

      // Step 2: Process leads in smaller batches
      const batchSize = 25;
      const leadBatches = [];
      
      for (let i = 0; i < args.leadIds.length; i += batchSize) {
        leadBatches.push(args.leadIds.slice(i, i + batchSize));
      }

      const conversionResults = [];
      let totalCreditsUsed = 0;

      for (const [batchIndex, batch] of leadBatches.entries()) {
        // Check if we still have credits
        if (totalCreditsUsed >= args.maxCreditsToUse) {
          console.log("Credit limit reached, stopping conversion");
          break;
        }

        console.log(`Processing batch ${batchIndex + 1}/${leadBatches.length}`);

        const batchResult = await ctx.runMutation(internal.leadConversion.convertLeadBatch, {
          clientId: args.clientId,
          leadIds: batch,
          settings: {
            maxCreditsToUse: args.maxCreditsToUse - totalCreditsUsed,
            priorityFunctionGroups: args.priorityFunctionGroups,
            skipDuplicates: true,
          },
        });

        conversionResults.push(batchResult);
        totalCreditsUsed += batchResult.creditsUsed || 0;

        // Small delay between batches
        if (batchIndex < leadBatches.length - 1 && totalCreditsUsed < args.maxCreditsToUse) {
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
        }
      }

      // Step 3: Update client statistics
      await ctx.runMutation(internal.clients.updateBulkConversionStats, {
        clientId: args.clientId,
        creditsUsed: totalCreditsUsed,
        leadsProcessed: conversionResults.reduce((sum, result) => sum + (result.leadsProcessed || 0), 0),
        contactsCreated: conversionResults.reduce((sum, result) => sum + (result.contactsCreated || 0), 0),
      });

      console.log(`Bulk conversion workflow completed: ${totalCreditsUsed} credits used`);

      return {
        success: true,
        totalCreditsUsed,
        batchesProcessed: conversionResults.length,
        results: conversionResults,
      };
    } catch (error) {
      console.error("Bulk conversion workflow failed:", error);
      throw error;
    }
  },
});

// ===============================
// WORKFLOW STARTER FUNCTIONS
// ===============================

export const startEmailCampaignWorkflow = mutation({
  args: {
    campaignId: v.id("campaigns"),
    contactIds: v.array(v.id("contacts")),
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    // Validate campaign exists and is active
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || !campaign.isActive) {
      throw new Error("Campaign not found or inactive");
    }

    // Validate client has access
    if (campaign.clientId !== args.clientId) {
      throw new Error("Access denied");
    }

    // Schedule the workflow action
    const workflowId = await ctx.scheduler.runAfter(0, internal.simpleWorkflows.runEmailCampaignWorkflow, {
      campaignId: args.campaignId,
      contactIds: args.contactIds,
      clientId: args.clientId,
    });

    // Log workflow start
    await ctx.db.insert("workflowExecutions", {
      workflowId,
      workflowType: "email_campaign",
      clientId: args.clientId,
      campaignId: args.campaignId,
      status: "running",
      startedAt: Date.now(),
      contactCount: args.contactIds.length,
    });

    return { workflowId, status: "started" };
  },
});

export const startLeadNurturingWorkflow = mutation({
  args: {
    contactId: v.id("contacts"),
    clientId: v.id("clients"),
    nurturingSteps: v.array(v.object({
      stepName: v.string(),
      delayDays: v.number(),
      actionType: v.union(v.literal("email"), v.literal("linkedin"), v.literal("followup")),
      templateId: v.optional(v.id("automationTemplates")),
    })),
  },
  handler: async (ctx, args) => {
    // Get contact
    const contact = await ctx.db.get(args.contactId);
    if (!contact) {
      throw new Error("Contact not found");
    }

    // Validate client access
    if (contact.clientId !== args.clientId) {
      throw new Error("Access denied");
    }

    // Schedule the workflow action
    const workflowId = await ctx.scheduler.runAfter(0, internal.simpleWorkflows.runLeadNurturingWorkflow, {
      contactId: args.contactId,
      clientId: args.clientId,
      nurturingSteps: args.nurturingSteps,
    });

    // Log workflow start
    await ctx.db.insert("workflowExecutions", {
      workflowId,
      workflowType: "lead_nurturing",
      clientId: args.clientId,
      contactId: args.contactId,
      status: "running",
      startedAt: Date.now(),
      sequenceSteps: args.nurturingSteps.length,
    });

    return { workflowId, status: "started" };
  },
});

export const startBulkConversionWorkflow = mutation({
  args: {
    clientId: v.id("clients"),
    leadIds: v.array(v.id("leads")),
    maxCreditsToUse: v.number(),
    priorityFunctionGroups: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Validate client
    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new Error("Client not found");
    }

    // Check credits
    if (client.credits < args.maxCreditsToUse) {
      throw new Error("Insufficient credits");
    }

    const priorityGroups = args.priorityFunctionGroups || [
      "Marketing Decision Makers",
      "Sales Decision Makers",
      "IT Decision Makers"
    ];

    // Schedule the workflow action
    const workflowId = await ctx.scheduler.runAfter(0, internal.simpleWorkflows.runBulkConversionWorkflow, {
      clientId: args.clientId,
      leadIds: args.leadIds,
      maxCreditsToUse: args.maxCreditsToUse,
      priorityFunctionGroups: priorityGroups,
    });

    // Log workflow start
    await ctx.db.insert("workflowExecutions", {
      workflowId,
      workflowType: "bulk_conversion",
      clientId: args.clientId,
      status: "running",
      startedAt: Date.now(),
      leadCount: args.leadIds.length,
      maxCredits: args.maxCreditsToUse,
    });

    return { workflowId, status: "started" };
  },
});