import { internalMutation } from "./_generated/server";

// ===============================
// WORKFLOW TEMPLATE SEEDS
// ===============================

export const seedWorkflowTemplates = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if templates already exist
    const existingTemplates = await ctx.db.query("workflowTemplates").collect();
    if (existingTemplates.length > 0) {
      return { message: "Workflow templates already exist" };
    }

    const now = Date.now();

    // Email Campaign Workflow Template
    await ctx.db.insert("workflowTemplates", {
      name: "Standard Email Campaign",
      description: "Multi-step email campaign with rate limiting and follow-ups",
      workflowType: "email_campaign",
      steps: [
        {
          name: "prepare_campaign",
          type: "validation",
          delayDays: 0,
          settings: {
            validateRecipients: true,
            checkCreditBalance: true,
          },
        },
        {
          name: "send_initial_batch",
          type: "email_send",
          delayDays: 0,
          settings: {
            batchSize: 50,
            rateLimit: "5 minutes",
          },
        },
        {
          name: "follow_up_sequence",
          type: "email_followup",
          delayDays: 3,
          settings: {
            maxFollowups: 2,
            followupDelay: "7 days",
          },
        },
      ],
      isActive: true,
      isSystem: true,
      totalExecutions: 0,
      successRate: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    });

    // Lead Nurturing Workflow Template
    await ctx.db.insert("workflowTemplates", {
      name: "7-Day Lead Nurturing",
      description: "Automated lead nurturing sequence over 7 days",
      workflowType: "lead_nurturing",
      steps: [
        {
          name: "welcome_email",
          type: "email",
          actionType: "email",
          delayDays: 0,
          settings: {
            templateType: "welcome",
          },
        },
        {
          name: "value_proposition",
          type: "email",
          actionType: "email",
          delayDays: 2,
          settings: {
            templateType: "value_prop",
          },
        },
        {
          name: "linkedin_connection",
          type: "linkedin",
          actionType: "linkedin",
          delayDays: 4,
          settings: {
            connectionMessage: "personalized",
          },
        },
        {
          name: "final_followup",
          type: "email",
          actionType: "email",
          delayDays: 7,
          settings: {
            templateType: "final_followup",
          },
        },
      ],
      targetingCriteria: {
        functionGroups: ["Marketing Decision Makers", "Sales Decision Makers"],
        employeeMin: 10,
      },
      isActive: true,
      isSystem: true,
      totalExecutions: 0,
      successRate: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    });

    // Bulk Lead Conversion Template
    await ctx.db.insert("workflowTemplates", {
      name: "Bulk Lead Conversion",
      description: "Convert leads to contacts in batches with credit management",
      workflowType: "bulk_conversion",
      steps: [
        {
          name: "validate_credits",
          type: "validation",
          delayDays: 0,
          settings: {
            creditCheck: true,
            reserveCredits: true,
          },
        },
        {
          name: "process_batches",
          type: "conversion",
          delayDays: 0,
          settings: {
            batchSize: 25,
            delayBetweenBatches: "30 seconds",
            skipDuplicates: true,
          },
        },
        {
          name: "update_statistics",
          type: "reporting",
          delayDays: 0,
          settings: {
            updateClientStats: true,
            logActivity: true,
          },
        },
      ],
      isActive: true,
      isSystem: true,
      totalExecutions: 0,
      successRate: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    });

    // Deal Pipeline Automation Template
    await ctx.db.insert("workflowTemplates", {
      name: "Deal Pipeline Automation",
      description: "Automated deal progression with notifications and tasks",
      workflowType: "deal_pipeline",
      steps: [
        {
          name: "initial_qualification",
          type: "stage_check",
          delayDays: 0,
          conditions: ["stage == 'qualification'"],
          settings: {
            autoAdvance: false,
            createTask: true,
          },
        },
        {
          name: "follow_up_reminder",
          type: "notification",
          delayDays: 3,
          conditions: ["stage == 'qualification'"],
          settings: {
            notificationType: "email",
            assignedUser: true,
          },
        },
        {
          name: "stale_deal_alert",
          type: "alert",
          delayDays: 14,
          conditions: ["stage == 'qualification'", "no_activity > 7 days"],
          settings: {
            escalate: true,
            priorityLevel: "high",
          },
        },
      ],
      isActive: true,
      isSystem: true,
      totalExecutions: 0,
      successRate: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    });

    return { 
      message: "Workflow templates seeded successfully",
      templatesCreated: 4
    };
  },
});