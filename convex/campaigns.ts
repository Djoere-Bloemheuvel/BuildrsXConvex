import { query, mutation, action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";


// Get campaigns with optional filters
export const list = query({
  args: { 
    clientId: v.optional(v.union(v.id("clients"), v.string())),
    type: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  returns: v.array(v.object({
    _id: v.id("campaigns"),
    _creationTime: v.number(),
    clientId: v.optional(v.id("clients")),
    propositionId: v.optional(v.id("propositions")),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    status: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    autoAssignEnabled: v.optional(v.boolean()),
    audienceFilter: v.optional(v.object({
      functionGroups: v.optional(v.array(v.string())),
      industries: v.optional(v.array(v.string())),
      subindustries: v.optional(v.array(v.string())),
      countries: v.optional(v.array(v.string())),
      states: v.optional(v.array(v.string())),
      companySizeMin: v.optional(v.number()),
      companySizeMax: v.optional(v.number()),
    })),
    priority: v.optional(v.number()),
    sendingWindow: v.optional(v.object({
      dailyConnectLimit: v.optional(v.number()),
      dailyMessageLimit: v.optional(v.number()),
    })),
    stats: v.optional(v.object({
      sent_count: v.optional(v.number()),
      accepted_count: v.optional(v.number()),
      replied_count: v.optional(v.number()),
      booked_count: v.optional(v.number()),
    })),
    campaignPurpose: v.optional(v.string()),
    channel: v.optional(v.string()),
    dailyLimit: v.optional(v.number()),
    instantlyId: v.optional(v.string()),
    campaignGoal: v.optional(v.string()),
    customGoal: v.optional(v.string()),
    companySummary: v.optional(v.string()),
    shortCompanySummary: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    company_id: v.optional(v.string()),
    external_id: v.optional(v.string()),
    emailA: v.optional(v.string()),
    subjectA: v.optional(v.string()),
    followupA: v.optional(v.string()),
    emailB: v.optional(v.string()),
    subjectB: v.optional(v.string()),
    followupB: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    // Resolve clientId - if it's passed as a convex ID, use it directly
    let actualClientId = args.clientId;
    
    // Only try to resolve as domain if it's a plain string (not a convex ID)
    if (args.clientId && typeof args.clientId === "string" && !args.clientId.startsWith("jh")) {
      const client = await ctx.db
        .query("clients")
        .filter((q) => q.eq(q.field("domain"), args.clientId))
        .first();
      
      if (!client) {
        console.error(`❌ Client with domain ${args.clientId} not found - returning empty campaigns list`);
        return [];
      }
      actualClientId = client._id;
    }

    // Start with the most specific index
    let campaigns;
    
    if (actualClientId) {
      campaigns = ctx.db.query("campaigns").withIndex("by_client", (q) => q.eq("clientId", actualClientId));
    } else if (args.type) {
      campaigns = ctx.db.query("campaigns").withIndex("by_type", (q) => q.eq("type", args.type));
    } else if (args.status) {
      campaigns = ctx.db.query("campaigns").withIndex("by_status", (q) => q.eq("status", args.status));
    } else {
      campaigns = ctx.db.query("campaigns");
    }
    
    campaigns = campaigns.order("desc");
    
    // Collect all results first, then apply additional filters
    let campaignsList = await campaigns.collect();
    
    // Apply additional filters if needed
    if (args.type && actualClientId) {
      campaignsList = campaignsList.filter(campaign => campaign.type === args.type);
    }
    
    if (args.status && (actualClientId || args.type)) {
      campaignsList = campaignsList.filter(campaign => campaign.status === args.status);
    }
    
    // Apply limit if specified
    if (args.limit) {
      campaignsList = campaignsList.slice(0, args.limit);
    }
    
    return campaignsList;
  },
});

// Get campaign by ID
export const getById = query({
  args: { id: v.id("campaigns") },
  returns: v.union(v.object({
    _id: v.id("campaigns"),
    _creationTime: v.number(),
    clientId: v.optional(v.id("clients")),
    propositionId: v.optional(v.id("propositions")),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    status: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    autoAssignEnabled: v.optional(v.boolean()),
    audienceFilter: v.optional(v.object({
      functionGroups: v.optional(v.array(v.string())),
      industries: v.optional(v.array(v.string())),
      subindustries: v.optional(v.array(v.string())),
      countries: v.optional(v.array(v.string())),
      states: v.optional(v.array(v.string())),
      companySizeMin: v.optional(v.number()),
      companySizeMax: v.optional(v.number()),
    })),
    priority: v.optional(v.number()),
    sendingWindow: v.optional(v.object({
      dailyConnectLimit: v.optional(v.number()),
      dailyMessageLimit: v.optional(v.number()),
    })),
    stats: v.optional(v.object({
      sent_count: v.optional(v.number()),
      accepted_count: v.optional(v.number()),
      replied_count: v.optional(v.number()),
      booked_count: v.optional(v.number()),
    })),
    campaignPurpose: v.optional(v.string()),
    channel: v.optional(v.string()),
    dailyLimit: v.optional(v.number()),
    instantlyId: v.optional(v.string()),
    campaignGoal: v.optional(v.string()),
    customGoal: v.optional(v.string()),
    companySummary: v.optional(v.string()),
    shortCompanySummary: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    company_id: v.optional(v.string()),
    external_id: v.optional(v.string()),
    emailA: v.optional(v.string()),
    subjectA: v.optional(v.string()),
    followupA: v.optional(v.string()),
    emailB: v.optional(v.string()),
    subjectB: v.optional(v.string()),
    followupB: v.optional(v.string()),
  }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create new campaign
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    status: v.optional(v.string()),
    clientId: v.id("clients"),
    propositionId: v.optional(v.id("propositions")),
    targetingCriteria: v.optional(v.object({
      functionGroups: v.optional(v.array(v.string())),
      industries: v.optional(v.array(v.string())),
      subindustries: v.optional(v.array(v.string())),
      countries: v.optional(v.array(v.string())),
      states: v.optional(v.array(v.string())),
      companySizeMin: v.optional(v.number()),
      companySizeMax: v.optional(v.number()),
    })),
    settings: v.optional(v.object({
      dailyConnectLimit: v.optional(v.number()),
      dailyMessageLimit: v.optional(v.number()),
    })),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    priority: v.optional(v.number()),
    dailyLimit: v.optional(v.number()),
    userId: v.optional(v.string()), // Voor activity logging
    campaignGoal: v.optional(v.string()),
    customGoal: v.optional(v.string()),
    companySummary: v.optional(v.string()),
    shortCompanySummary: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    company_id: v.optional(v.string()),
  },
  returns: v.id("campaigns"),
  handler: async (ctx, args) => {
    const { userId, ...campaignArgs } = args;
    
    const campaignData: any = {
      name: campaignArgs.name,
      description: campaignArgs.description,
      type: campaignArgs.type,
      status: campaignArgs.status || "draft",
      clientId: campaignArgs.clientId,
      propositionId: campaignArgs.propositionId,
      startDate: campaignArgs.startDate,
      endDate: campaignArgs.endDate,
      priority: campaignArgs.priority || 0,
      dailyLimit: campaignArgs.dailyLimit || campaignArgs.settings?.dailyMessageLimit || campaignArgs.settings?.dailyConnectLimit || 50,
      autoAssignEnabled: false,
      audienceFilter: campaignArgs.targetingCriteria || {},
      sendingWindow: campaignArgs.settings || {},
      campaignGoal: campaignArgs.campaignGoal,
      customGoal: campaignArgs.customGoal,
      stats: {
        sent_count: 0,
        accepted_count: 0,
        replied_count: 0,
        booked_count: 0,
      },
    };

    const campaignId = await ctx.db.insert("campaigns", campaignData);
    
    // Log activity
    const typeDisplay = campaignArgs.type === "linkedin" ? "LinkedIn" : 
                       campaignArgs.type === "email" ? "Email" : 
                       campaignArgs.type;
    
    await ctx.runMutation(internal.activityLogger.logActivityInternal, {
      clientId: campaignArgs.clientId,
      userId: userId,
      action: "campaign_created",
      description: `Created ${typeDisplay} campaign: ${campaignArgs.name}`,
      campaignId: campaignId,
      category: "campaign",
      priority: "high",
      metadata: {
        type: campaignArgs.type,
        status: campaignData.status,
        dailyLimit: campaignData.dailyLimit,
        targetingCriteria: campaignArgs.targetingCriteria,
        startDate: campaignArgs.startDate,
        endDate: campaignArgs.endDate,
      },
    });
    
    return campaignId;
  },
});

// Update campaign
export const update = mutation({
  args: {
    id: v.id("campaigns"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    targetingCriteria: v.optional(v.object({
      functionGroups: v.optional(v.array(v.string())),
      industries: v.optional(v.array(v.string())),
      subindustries: v.optional(v.array(v.string())),
      countries: v.optional(v.array(v.string())),
      states: v.optional(v.array(v.string())),
      companySizeMin: v.optional(v.number()),
      companySizeMax: v.optional(v.number()),
    })),
    settings: v.optional(v.object({
      dailyConnectLimit: v.optional(v.number()),
      dailyMessageLimit: v.optional(v.number()),
    })),
    stats: v.optional(v.object({
      sent_count: v.optional(v.number()),
      accepted_count: v.optional(v.number()),
      replied_count: v.optional(v.number()),
      booked_count: v.optional(v.number()),
    })),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    priority: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;
    
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    // Convert targeting criteria to audienceFilter format
    if (args.targetingCriteria) {
      cleanData.audienceFilter = args.targetingCriteria;
      delete cleanData.targetingCriteria;
    }

    // Convert settings to sendingWindow format
    if (args.settings) {
      cleanData.sendingWindow = args.settings;
      cleanData.dailyLimit = args.settings.dailyConnectLimit || cleanData.dailyLimit;
      delete cleanData.settings;
    }
    
    if (Object.keys(cleanData).length > 0) {
      await ctx.db.patch(id, cleanData);
    }
    
    return null;
  },
});

// Update campaign with email content (for n8n workflow)
export const updateEmailContent = mutation({
  args: {
    id: v.id("campaigns"),
    email_a: v.optional(v.string()),
    subject_a: v.optional(v.string()),
    followup_a: v.optional(v.string()),
    email_b: v.optional(v.string()),
    subject_b: v.optional(v.string()),
    followup_b: v.optional(v.string()),
    companySummary: v.optional(v.string()),
    shortCompanySummary: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    company_id: v.optional(v.string()),
    external_id: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;
    
    // Remove undefined values and map to schema field names
    const cleanData: any = {};
    if (updateData.email_a !== undefined) cleanData.emailA = updateData.email_a;
    if (updateData.subject_a !== undefined) cleanData.subjectA = updateData.subject_a;
    if (updateData.followup_a !== undefined) cleanData.followupA = updateData.followup_a;
    if (updateData.email_b !== undefined) cleanData.emailB = updateData.email_b;
    if (updateData.subject_b !== undefined) cleanData.subjectB = updateData.subject_b;
    if (updateData.followup_b !== undefined) cleanData.followupB = updateData.followup_b;
    if (updateData.companySummary !== undefined) cleanData.companySummary = updateData.companySummary;
    if (updateData.shortCompanySummary !== undefined) cleanData.shortCompanySummary = updateData.shortCompanySummary;
    if (updateData.industryLabel !== undefined) cleanData.industryLabel = updateData.industryLabel;
    if (updateData.subindustryLabel !== undefined) cleanData.subindustryLabel = updateData.subindustryLabel;
    if (updateData.company_id !== undefined) cleanData.company_id = updateData.company_id;
    if (updateData.external_id !== undefined) cleanData.external_id = updateData.external_id;
    
    if (Object.keys(cleanData).length > 0) {
      await ctx.db.patch(id, cleanData);
    }
    
    return null;
  },
});

// Delete campaign
export const remove = mutation({
  args: { id: v.id("campaigns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

// Get campaigns by client
// Create campaign with N8N webhook integration (server-side to avoid CORS)
export const createWithWebhook = action({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    status: v.optional(v.string()),
    clientId: v.id("clients"),
    propositionId: v.optional(v.id("propositions")),
    targetingCriteria: v.optional(v.object({
      functionGroups: v.optional(v.array(v.string())),
      industries: v.optional(v.array(v.string())),
      subindustries: v.optional(v.array(v.string())),
      countries: v.optional(v.array(v.string())),
      states: v.optional(v.array(v.string())),
      companySizeMin: v.optional(v.number()),
      companySizeMax: v.optional(v.number()),
    })),
    settings: v.optional(v.object({
      dailyConnectLimit: v.optional(v.number()),
      dailyMessageLimit: v.optional(v.number()),
    })),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    priority: v.optional(v.number()),
    dailyLimit: v.optional(v.number()),
    userId: v.optional(v.string()),
    campaignGoal: v.optional(v.string()),
    customGoal: v.optional(v.string()),
    companySummary: v.optional(v.string()),
    shortCompanySummary: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    company_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log('🚀 Starting createWithWebhook action on server-side');
    
    // First create the campaign using the mutation
    const campaignId = await ctx.runMutation(internal.campaigns.create, args);
    
    // Get proposition details from propositions table
    let propositionData = null;
    if (args.propositionId) {
      try {
        propositionData = await ctx.db
          .query("propositions")
          .filter((q) => q.eq(q.field("_id"), args.propositionId))
          .first();
        console.log('Found proposition:', propositionData);
      } catch (error) {
        console.log('Could not fetch proposition details:', error);
      }
    }

    // Send webhook to N8N with complete data
    try {
      const webhookPayload = {
        campaign_id: campaignId,
        client_id: args.clientId,
        proposition_id: args.propositionId,
        campaign_name: args.name,
        campaign_description: args.description,
        campaign_type: args.type,
        campaign_goal: args.campaignGoal,
        custom_goal: args.customGoal,
        audience_filter: args.targetingCriteria || {},
        proposition: propositionData ? {
          id: propositionData._id,
          name: propositionData.name,
          description: propositionData.description,
          content: propositionData.content,
          category: propositionData.category,
          tags: propositionData.tags,
          industry: propositionData.industry,
          target_audience: propositionData.targetAudience,
          pain_points: propositionData.painPoints,
          value_propositions: propositionData.valuePropositions,
          call_to_action: propositionData.callToAction,
          tone: propositionData.tone,
          email_subject_templates: propositionData.emailSubjectTemplates,
          email_content_templates: propositionData.emailContentTemplates,
          linkedin_message_templates: propositionData.linkedinMessageTemplates,
          status: propositionData.status
        } : null,
        settings: args.settings || {}
      };

      const response = await fetch('https://djoere.app.n8n.cloud/webhook/5fd94198-71d7-49e2-9bd4-2f18a2731106', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });
      
      console.log('📡 Webhook response status:', response.status);
      const responseText = await response.text();
      console.log('📡 Webhook response body:', responseText);
      
      if (response.ok) {
        console.log('✅ Webhook sent successfully');
      } else {
        console.log('❌ Webhook failed with status:', response.status);
      }
    } catch (error) {
      console.log('⚠️ Webhook error:', error);
    }
    
    return campaignId;
  }
});

export const getByClient = query({
  args: { 
    clientId: v.union(v.id("clients"), v.string()),
    type: v.optional(v.string())
  },
  returns: v.array(v.object({
    _id: v.id("campaigns"),
    _creationTime: v.number(),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    status: v.optional(v.string()),
    stats: v.optional(v.object({
      sent_count: v.optional(v.number()),
      accepted_count: v.optional(v.number()),
      replied_count: v.optional(v.number()),
      booked_count: v.optional(v.number()),
    })),
  })),
  handler: async (ctx, args) => {
    // Convert clientId to proper ID if it's a string
    let actualClientId = args.clientId;
    if (typeof args.clientId === "string") {
      const client = await ctx.db
        .query("clients")
        .filter((q) => q.eq(q.field("domain"), args.clientId))
        .first();
      
      if (!client) {
        return [];
      }
      actualClientId = client._id;
    }

    let query = ctx.db
      .query("campaigns")
      .withIndex("by_client", (q) => q.eq("clientId", actualClientId));

    if (args.type) {
      // Additional filter by type if needed
      const allCampaigns = await query.collect();
      return allCampaigns.filter(campaign => campaign.type === args.type);
    }

    return await query.order("desc").collect();
  },
});

// ===============================
// SMART ASSIGNMENT
// ===============================

/**
 * OLD Smart Assignment - DISABLED
 * Replaced with new version at end of file
 */
export const smartAssignCandidatesOLD_DISABLED = mutation({
  args: {
    clientId: v.union(v.id("clients"), v.string()),
    dailyLimit: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    assigned: v.number(),
    campaignsUsed: v.number(),
    errors: v.array(v.string()),
    details: v.array(v.object({
      campaignId: v.id("campaigns"),
      campaignName: v.string(),
      assignedCount: v.number(),
    })),
    automationId: v.optional(v.id("clientAutomations")),
  }),
  handler: async (ctx, args) => {
    console.log(`🚀 Smart Assignment started for client: ${args.clientId}`);
    
    // Convert clientId to proper ID if it's a string
    let actualClientId = args.clientId;
    if (typeof args.clientId === "string") {
      const client = await ctx.db
        .query("clients")
        .filter((q) => q.eq(q.field("domain"), args.clientId))
        .first();
      
      if (!client) {
        return {
          success: false,
          assigned: 0,
          campaignsUsed: 0,
          errors: [`Client with identifier ${args.clientId} not found`],
          details: [],
        };
      }
      actualClientId = client._id;
    }
    
    try {
      // 1. Get all email candidates with suggested campaigns
      console.log(`📋 Getting candidates with suggested campaigns...`);
      const candidates = await ctx.runQuery("candidateViews:coldEmailCandidates", {
        clientId: actualClientId,
        includeAssignable: true  // Only candidates with suggestedCampaignId
      });
      
      console.log(`🎯 Found ${candidates.length} candidates with suggested campaigns`);
      
      if (candidates.length === 0) {
        return {
          success: true,
          assigned: 0,
          campaignsUsed: 0,
          errors: ["No candidates available with suggested campaigns"],
          details: [],
        };
      }
      
      // 2. Apply daily limit if specified  
      const candidatesToAssign = args.dailyLimit 
        ? candidates.slice(0, args.dailyLimit)
        : candidates;
      
      console.log(`⚡ Processing ${candidatesToAssign.length} candidates (daily limit: ${args.dailyLimit || 'unlimited'})`);
      
      // 3. Group candidates by their suggested campaign
      const campaignGroups = new Map<string, any[]>();
      candidatesToAssign.forEach(candidate => {
        if (candidate.suggestedCampaignId) {
          if (!campaignGroups.has(candidate.suggestedCampaignId)) {
            campaignGroups.set(candidate.suggestedCampaignId, []);
          }
          campaignGroups.get(candidate.suggestedCampaignId)!.push(candidate);
        }
      });
      
      console.log(`📊 Grouped into ${campaignGroups.size} campaigns`);
      
      // 4. Create campaignContacts entries for each group
      let totalAssigned = 0;
      const errors: string[] = [];
      const details: any[] = [];
      
      for (const [campaignId, campaignCandidates] of campaignGroups) {
        try {
          // Get campaign info for details
          const campaign = await ctx.db.get(campaignId as any);
          if (!campaign) {
            errors.push(`Campaign ${campaignId} not found`);
            continue;
          }
          
          let assignedInThisCampaign = 0;
          
          // Assign each candidate to this campaign
          for (const candidate of campaignCandidates) {
            try {
              // Check if already assigned to avoid duplicates
              const existingAssignment = await ctx.db
                .query("campaignContacts")
                .filter((q) => q.and(
                  q.eq(q.field("campaignId"), campaignId),
                  q.eq(q.field("contactId"), candidate.contactId)
                ))
                .first();
              
              if (!existingAssignment) {
                await ctx.db.insert("campaignContacts", {
                  campaignId: campaignId as any,
                  contactId: candidate.contactId,
                  clientId: actualClientId,
                  status: "planned",
                  addedAt: Date.now(),
                });
                
                assignedInThisCampaign++;
                totalAssigned++;
              } else {
                console.log(`⚠️ Contact ${candidate.contactId} already assigned to campaign ${campaignId}`);
              }
              
            } catch (error) {
              errors.push(`Failed to assign contact ${candidate.contactId} to campaign ${campaign.name}: ${error.message}`);
            }
          }
          
          details.push({
            campaignId: campaignId as any,
            campaignName: campaign.name,
            assignedCount: assignedInThisCampaign,
          });
          
          console.log(`✅ Assigned ${assignedInThisCampaign} candidates to campaign: ${campaign.name}`);
          
        } catch (error) {
          errors.push(`Failed to process campaign ${campaignId}: ${error.message}`);
        }
      }
      
      const result = {
        success: totalAssigned > 0,
        assigned: totalAssigned,
        campaignsUsed: details.length,
        errors,
        details,
      };
      
      console.log(`🎉 Smart Assignment complete: ${totalAssigned} candidates assigned to ${details.length} campaigns`);
      
      // Create automation entry for tracking and n8n integration
      try {
        const smartAssignmentTemplate = await ctx.runQuery("automations:getTemplateByKey", {
          key: "smart-assignment-email"
        });
        
        if (smartAssignmentTemplate) {
          console.log(`📋 Creating automation entry for Smart Assignment...`);
          
          const automationId = await ctx.db.insert("clientAutomations", {
            clientId: actualClientId,
            templateId: smartAssignmentTemplate._id,
            customName: `Smart Assignment - ${new Date().toDateString()}`,
            isActive: true,
            dailyLimit: args.dailyLimit || 0,
            targetingCriteria: {
              functionGroups: [], // Auto-determined by Smart Assignment
              industries: [],
              countries: [],
            },
            totalConverted: totalAssigned,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastExecuted: Date.now(),
            lastExecutionStatus: "success",
          });
          
          console.log(`✅ Created automation entry: ${automationId}`);
          
          // Prepare detailed assignment info for n8n webhook
          const detailedAssignmentInfo = [];
          for (const detail of details) {
            // Get contact IDs for this campaign from our assignment process
            const campaignContactIds = [];
            for (const [campaignId, campaignCandidates] of campaignGroups) {
              if (campaignId === detail.campaignId) {
                campaignContactIds.push(...campaignCandidates.map(c => c.contactId));
              }
            }
            
            detailedAssignmentInfo.push({
              campaignId: detail.campaignId,
              campaignName: detail.campaignName,
              assignedCount: detail.assignedCount,
              contactIds: campaignContactIds,
            });
          }
          
          // Trigger n8n webhook (if configured)
          const webhookUrl = smartAssignmentTemplate.defaultSettings.webhookUrl;
          if (webhookUrl) {
            console.log(`🔗 Triggering n8n webhook...`);
            
            const webhookResult = await ctx.runMutation("campaigns:triggerN8nWebhook", {
              automationId,
              assignmentDetails: detailedAssignmentInfo,
              webhookUrl,
            });
            
            if (webhookResult.success) {
              console.log(`✅ n8n webhook triggered successfully`);
            } else {
              console.warn(`⚠️ n8n webhook failed: ${webhookResult.error}`);
              errors.push(`n8n webhook failed: ${webhookResult.error}`);
            }
          } else {
            console.log(`⚠️ No webhook URL configured for Smart Assignment`);
          }
          
          // Add automation ID to result for tracking
          result.automationId = automationId;
        } else {
          console.warn(`⚠️ Smart Assignment template not found. Please run automations:seedAutomationTemplates`);
          errors.push("Smart Assignment template not found. Contact administrator.");
        }
        
      } catch (automationError) {
        console.error(`❌ Failed to create automation entry:`, automationError);
        errors.push(`Automation tracking failed: ${automationError.message}`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Smart Assignment failed:`, error);
      return {
        success: false,
        assigned: 0,
        campaignsUsed: 0,
        errors: [`Smart Assignment failed: ${error.message}`],
        details: [],
      };
    }
  },
});

// ===============================
// CAMPAIGN STATUS MANAGEMENT
// ===============================

/**
 * Toggle campaign status between active/inactive with Instantly API integration
 * ATOMIC OPERATION: If Instantly API fails, the entire operation fails
 */
export const toggleCampaignStatus = action({
  args: {
    campaignId: v.id("campaigns"),
  },
  returns: v.object({
    success: v.boolean(),
    newStatus: v.string(),
    campaignName: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get campaign details using runQuery since we're in an action
    const campaign = await ctx.runQuery("campaigns:getById", { id: args.campaignId });
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    
    // Determine new status
    const currentStatus = campaign.status;
    const isCurrentlyActive = currentStatus === "active" || currentStatus === "actief";
    const newStatus = isCurrentlyActive ? "paused" : "active";
    
    console.log(`🔄 Toggling campaign "${campaign.name}" from "${currentStatus}" to "${newStatus}"`);
    
    // STEP 1: Call Instantly API v2 first (ATOMIC - if this fails, nothing changes)
    // NOTE: Currently only ACTIVATE is synced with Instantly, PAUSE is local-only
    if (campaign.external_id && newStatus === "active") {
      try {
        console.log(`📡 Calling Instantly API v2 for campaign ${campaign.external_id}...`);
        
        const instantlyApiKey = process.env.INSTANTLY_API_KEY;
        if (!instantlyApiKey) {
          throw new Error("External service configuration missing. Contact administrator.");
        }
        
        // Only activate campaigns in Instantly (pause is local-only for now)
        const instantlyAction = "activate";
        const instantlyUrl = `https://api.instantly.ai/api/v2/campaigns/${campaign.external_id}/${instantlyAction}`;
        
        console.log(`📡 Sending ${instantlyAction} request to Instantly API v2...`);
        
        const response = await fetch(instantlyUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${instantlyApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}), // Empty JSON body required by Instantly API v2
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error(`❌ Instantly API v2 error: ${response.status} ${errorText}`);
          
          // Handle specific Instantly API errors
          if (response.status === 401) {
            throw new Error("External service authentication failed. Please contact administrator.");
          } else if (response.status === 404) {
            throw new Error("Campaign not found in external service. Please verify the campaign exists.");
          } else if (response.status === 429) {
            throw new Error("External service rate limit exceeded. Please try again in a few minutes.");
          } else {
            throw new Error(`External service request failed (${response.status}). Please try again or contact support.`);
          }
        }
        
        const responseData = await response.text();
        console.log(`✅ Instantly API v2 success: ${responseData}`);
        
      } catch (error: any) {
        console.error(`❌ Instantly API v2 integration failed:`, error);
        
        // Re-throw with user-friendly message (no "Instantly" mentions)
        if (error.message.includes('External service')) {
          throw error; // Already user-friendly
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new Error("Unable to connect to external service. Check your internet connection and try again.");
        } else if (error.message.includes('authentication')) {
          throw error; // Already user-friendly
        } else if (error.message.includes('rate limit')) {
          throw error; // Already user-friendly
        } else {
          throw new Error("External service integration failed. Please try again or contact support.");
        }
      }
    } else if (campaign.external_id && newStatus === "paused") {
      console.log(`⏸️ Campaign ${campaign.name} paused locally only (Instantly remains active)`);
    } else {
      console.log(`⚠️ Campaign ${campaign.name} has no external_id, updating locally only`);
    }
    
    // STEP 2: Only update local status if external API succeeded (or no external_id)
    await ctx.runMutation("campaigns:update", {
      id: args.campaignId,
      status: newStatus,
    });
    
    console.log(`✅ Campaign "${campaign.name}" status updated to "${newStatus}"`);
    
    return {
      success: true,
      newStatus,
      campaignName: campaign.name,
    };
  },
});

/**
 * Set specific campaign status
 */
export const setCampaignStatus = mutation({
  args: {
    campaignId: v.id("campaigns"),
    status: v.union(
      v.literal("active"),
      v.literal("actief"), 
      v.literal("paused"),
      v.literal("gepauzeerd"),
      v.literal("draft"),
      v.literal("concept"),
      v.literal("completed"),
      v.literal("afgerond")
    ),
  },
  returns: v.object({
    success: v.boolean(),
    oldStatus: v.optional(v.string()),
    newStatus: v.string(),
    campaignName: v.string(),
  }),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    
    const oldStatus = campaign.status;
    
    console.log(`📝 Setting campaign "${campaign.name}" status from "${oldStatus}" to "${args.status}"`);
    
    // Update campaign status
    await ctx.db.patch(args.campaignId, {
      status: args.status,
    });
    
    return {
      success: true,
      oldStatus,
      newStatus: args.status,
      campaignName: campaign.name,
    };
  },
});

// ===============================
// N8N WEBHOOK INTEGRATION  
// ===============================

/**
 * Trigger n8n webhook with automation details for instantly integration
 */
export const triggerN8nWebhook = mutation({
  args: {
    automationId: v.id("clientAutomations"),
    assignmentDetails: v.array(v.object({
      campaignId: v.id("campaigns"),
      campaignName: v.string(),
      assignedCount: v.number(),
      contactIds: v.array(v.id("contacts")),
    })),
    webhookUrl: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    webhookResponse: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    if (!args.webhookUrl) {
      console.log("⚠️ No webhook URL provided, skipping n8n trigger");
      return { success: true, webhookResponse: "No webhook URL configured" };
    }
    
    try {
      console.log(`🔗 Triggering n8n webhook: ${args.webhookUrl}`);
      
      const automation = await ctx.db.get(args.automationId);
      if (!automation) {
        return { success: false, error: "Automation not found" };
      }
      
      // Prepare webhook payload for n8n
      const webhookPayload = {
        automationId: args.automationId,
        clientId: automation.clientId,
        timestamp: Date.now(),
        assignmentDetails: args.assignmentDetails,
        totalContacts: args.assignmentDetails.reduce((sum, detail) => sum + detail.assignedCount, 0),
        totalCampaigns: args.assignmentDetails.length,
      };
      
      // Make HTTP request to n8n webhook
      const response = await fetch(args.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log(`✅ n8n webhook successful: ${responseText}`);
      
      return { 
        success: true, 
        webhookResponse: responseText 
      };
      
    } catch (error) {
      console.error(`❌ n8n webhook failed:`, error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },
});

// Smart Assignment action - NEW QUEUE-BASED APPROACH
export const smartAssignCandidates = action({
  args: {
    clientId: v.union(v.id("clients"), v.string()),
    dailyLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log(`🚀 Smart Assignment (Queue Populator) starting for client: ${args.clientId}`);
    
    try {
      // Step 1: Get candidates with suggested campaigns using the same query as UI
      console.log(`📞 Calling coldEmailCandidates query...`);
      const candidates = await ctx.runQuery(internal.candidateViews.coldEmailCandidates, {
        clientId: args.clientId as any,
        includeAssignable: true,
      });
      
      console.log(`📊 Found ${candidates.length} candidates for Smart Assignment`);
      
      // Step 2: Filter candidates that have suggested campaigns
      const candidatesWithSuggestions = candidates.filter(candidate => 
        candidate.suggestedCampaignId && candidate.suggestedCampaignId !== null
      );
      
      if (candidatesWithSuggestions.length === 0) {
        console.log('📝 No candidates with suggested campaigns found');
        return {
          success: true,
          queuedForAssignment: 0,
          skipped: 0,
          errors: [],
          message: 'No candidates with suggested campaigns available'
        };
      }
      
      // Step 3: Apply daily limit if specified
      const candidatesToQueue = args.dailyLimit 
        ? candidatesWithSuggestions.slice(0, args.dailyLimit)
        : candidatesWithSuggestions;
        
      console.log(`🎯 Queuing ${candidatesToQueue.length} candidates for assignment (daily limit: ${args.dailyLimit || 'unlimited'})`);
      
      // Step 4: Add candidates to assignment queue
      let queuedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      
      for (const candidate of candidatesToQueue) {
        try {
          const wasQueued = await ctx.runMutation("smartAssignmentQueue:setSuggestedCampaign", {
            contactId: candidate.contactId,
            suggestedCampaignId: candidate.suggestedCampaignId!,
          });
          
          if (wasQueued) {
            queuedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          errors.push(`${candidate.contactId}: ${error.message}`);
          skippedCount++;
        }
      }
      
      console.log(`✅ Smart Assignment queue population complete: ${queuedCount} queued, ${skippedCount} skipped`);
      
      return {
        success: true,
        queuedForAssignment: queuedCount,
        skipped: skippedCount,
        errors: errors,
        message: `Successfully queued ${queuedCount} candidates for assignment. Processing by cronjob within 5 minutes.`
      };
      
    } catch (error: any) {
      console.error('❌ Smart Assignment (queue population) failed:', error);
      
      return {
        success: false,
        queuedForAssignment: 0,
        skipped: 0,
        errors: [error.message],
        message: `Smart Assignment failed: ${error.message}`
      };
    }
  },
});

// Daily Smart Assignment for all active clients
export const dailySmartAssignment = internalAction({
  args: {
    dailyLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const dailyLimit = args.dailyLimit || 200;
    
    console.log(`🌅 Starting Daily Smart Assignment for all clients (limit: ${dailyLimit} per client)`);

    // Get all active clients
    const clients = await ctx.runQuery("clients:getAllClients", {});
    
    console.log(`👥 Found ${clients.length} clients to process`);

    let totalQueued = 0;
    let totalSkipped = 0;
    const results = [];

    for (const client of clients) {
      try {
        console.log(`🎯 Processing client: ${client.companyName || client._id}`);

        const result = await ctx.runAction("campaigns:smartAssignCandidates", {
          clientId: client._id,
          dailyLimit: dailyLimit,
        });

        totalQueued += result.queuedForAssignment || 0;
        totalSkipped += result.skipped || 0;

        results.push({
          clientId: client._id,
          companyName: client.companyName,
          queued: result.queuedForAssignment || 0,
          skipped: result.skipped || 0,
          success: result.success,
          errors: result.errors || [],
        });

        console.log(`✅ Client ${client.companyName || client._id}: ${result.queuedForAssignment} queued, ${result.skipped} skipped`);

      } catch (error) {
        console.error(`❌ Failed to process client ${client._id}:`, error);
        results.push({
          clientId: client._id,
          companyName: client.companyName,
          queued: 0,
          skipped: 0,
          success: false,
          errors: [error.message],
        });
      }
    }

    const summary = {
      clientsProcessed: clients.length,
      totalQueued,
      totalSkipped,
      results,
    };

    console.log(`🎉 Daily Smart Assignment complete:`, JSON.stringify(summary, null, 2));
    
    return summary;
  },
});