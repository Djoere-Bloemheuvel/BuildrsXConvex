import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ===============================
// WORKFLOW MANAGEMENT FUNCTIONS
// ===============================

// Start an email campaign workflow
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

    // Start the workflow
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

// Start a lead nurturing workflow
export const startLeadNurturingWorkflow = mutation({
  args: {
    contactId: v.id("contacts"),
    clientId: v.id("clients"),
    nurturingSequenceId: v.id("automationTemplates"),
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

    // Get nurturing sequence
    const template = await ctx.db.get(args.nurturingSequenceId);
    if (!template || !template.isActive) {
      throw new Error("Nurturing sequence not found or inactive");
    }

    // Parse nurturing sequence steps
    const nurturingSequence = template.steps.map((step: any) => ({
      stepName: step.name,
      delayDays: step.delayDays || 0,
      actionType: step.actionType,
      templateId: step.templateId,
    }));

    // Start the workflow
    const workflowId = await ctx.scheduler.enqueue("workflows:leadNurturingWorkflow", {
      contactId: args.contactId,
      clientId: args.clientId,
      nurturingSequence,
    });

    // Log workflow start
    await ctx.db.insert("workflowExecutions", {
      workflowId,
      workflowType: "lead_nurturing",
      clientId: args.clientId,
      contactId: args.contactId,
      status: "running",
      startedAt: Date.now(),
      sequenceSteps: nurturingSequence.length,
    });

    return { workflowId, status: "started" };
  },
});

// Start bulk lead conversion workflow
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

    const conversionSettings = {
      maxCreditsToUse: args.maxCreditsToUse,
      priorityFunctionGroups: args.priorityFunctionGroups || [
        "Marketing Decision Makers",
        "Sales Decision Makers",
        "IT Decision Makers"
      ],
      skipDuplicates: true,
    };

    // Start the workflow
    const workflowId = await ctx.scheduler.enqueue("workflows:bulkLeadConversionWorkflow", {
      clientId: args.clientId,
      leadIds: args.leadIds,
      conversionSettings,
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

// Cancel a running workflow
export const cancelWorkflow = mutation({
  args: {
    workflowId: v.string(),
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    // Find workflow execution record
    const execution = await ctx.db
      .query("workflowExecutions")
      .filter((q) => q.and(
        q.eq(q.field("workflowId"), args.workflowId),
        q.eq(q.field("clientId"), args.clientId)
      ))
      .unique();

    if (!execution) {
      throw new Error("Workflow not found");
    }

    // Cancel the workflow
    await ctx.scheduler.cancel(args.workflowId);

    // Update execution record
    await ctx.db.patch(execution._id, {
      status: "cancelled",
      endedAt: Date.now(),
    });

    return { success: true, status: "cancelled" };
  },
});

// Get workflow status
export const getWorkflowStatus = query({
  args: {
    workflowId: v.string(),
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("workflowExecutions")
      .filter((q) => q.and(
        q.eq(q.field("workflowId"), args.workflowId),
        q.eq(q.field("clientId"), args.clientId)
      ))
      .unique();

    if (!execution) {
      return null;
    }

    return {
      workflowId: execution.workflowId,
      workflowType: execution.workflowType,
      status: execution.status,
      startedAt: execution.startedAt,
      endedAt: execution.endedAt,
      progress: execution.progress || {},
    };
  },
});

// List all workflows for a client
export const listClientWorkflows = query({
  args: {
    clientId: v.id("clients"),
    status: v.optional(v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("workflowExecutions")
      .filter((q) => q.eq(q.field("clientId"), args.clientId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const executions = await query
      .order("desc")
      .take(args.limit || 50);

    return executions.map(execution => ({
      workflowId: execution.workflowId,
      workflowType: execution.workflowType,
      status: execution.status,
      startedAt: execution.startedAt,
      endedAt: execution.endedAt,
      progress: execution.progress || {},
      metadata: {
        contactCount: execution.contactCount,
        leadCount: execution.leadCount,
        sequenceSteps: execution.sequenceSteps,
        maxCredits: execution.maxCredits,
      },
    }));
  },
});

// ===============================
// WORKFLOW PROGRESS TRACKING
// ===============================

// Update workflow progress
export const updateWorkflowProgress = mutation({
  args: {
    workflowId: v.string(),
    progress: v.object({
      currentStep: v.string(),
      completedSteps: v.number(),
      totalSteps: v.number(),
      data: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("workflowExecutions")
      .filter((q) => q.eq(q.field("workflowId"), args.workflowId))
      .unique();

    if (execution) {
      await ctx.db.patch(execution._id, {
        progress: args.progress,
        lastUpdatedAt: Date.now(),
      });
    }
  },
});

// Mark workflow as completed
export const completeWorkflow = mutation({
  args: {
    workflowId: v.string(),
    result: v.any(),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("workflowExecutions")
      .filter((q) => q.eq(q.field("workflowId"), args.workflowId))
      .unique();

    if (execution) {
      await ctx.db.patch(execution._id, {
        status: args.success ? "completed" : "failed",
        endedAt: Date.now(),
        result: args.result,
      });
    }
  },
});