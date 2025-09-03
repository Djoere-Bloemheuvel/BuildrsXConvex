import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * 🎯 SMART ASSIGNMENT QUEUE MANAGEMENT
 * 
 * Producer-Consumer pattern for robust campaign assignments:
 * 1. Smart Assignment → Populate queue (suggestedCampaignId)
 * 2. Cronjob → Process queue → Create campaignContacts + clear queue (lastAssignmentAt)
 */

// ===============================
// QUEUE POPULATION (PRODUCER)
// ===============================

/**
 * Set suggested campaign for contact (adds to assignment queue)
 */
export const setSuggestedCampaign = mutation({
  args: {
    contactId: v.id("contacts"),
    suggestedCampaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    // Verify contact exists
    const contact = await ctx.db.get(args.contactId);
    if (!contact) {
      throw new Error(`Contact ${args.contactId} not found`);
    }

    // Verify campaign exists and is active
    const campaign = await ctx.db.get(args.suggestedCampaignId);
    if (!campaign) {
      throw new Error(`Campaign ${args.suggestedCampaignId} not found`);
    }

    if (campaign.status !== "active" && campaign.status !== "actief") {
      throw new Error(`Campaign ${campaign.name} is not active`);
    }

    // Check if contact already has this campaign (CRITICAL duplicate prevention)
    const existingAssignment = await ctx.db
      .query("campaignContacts")
      .withIndex("by_campaign_contact", (q) => 
        q.eq("campaignId", args.suggestedCampaignId).eq("contactId", args.contactId)
      )
      .first();

    if (existingAssignment) {
      console.log(`⚠️ Contact ${args.contactId} already assigned to campaign ${args.suggestedCampaignId}`);
      return false; // Already assigned, skip
    }

    // Check if contact is already in queue for ANY campaign
    if (contact.suggestedCampaignId) {
      console.log(`⚠️ Contact ${args.contactId} already in queue for campaign ${contact.suggestedCampaignId}`);
      return false; // Already queued, skip
    }

    // Add to queue
    await ctx.db.patch(args.contactId, {
      suggestedCampaignId: args.suggestedCampaignId,
      // lastAssignmentAt remains unchanged
    });

    console.log(`✅ Contact ${args.contactId} added to assignment queue for campaign ${campaign.name}`);
    return true;
  },
});

/**
 * Clear suggested campaign (remove from queue)
 */
export const clearSuggestedCampaign = mutation({
  args: {
    contactId: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.contactId, {
      suggestedCampaignId: null,
    });
  },
});

// ===============================
// QUEUE QUERIES
// ===============================

/**
 * Get contacts pending assignment (in queue)
 */
export const getPendingAssignments = query({
  args: {
    clientId: v.optional(v.id("clients")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let contacts;

    if (args.clientId) {
      contacts = await ctx.db
        .query("contacts")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
        .filter((q) => q.neq(q.field("suggestedCampaignId"), null))
        .order("desc")
        .take(args.limit || 100);
    } else {
      contacts = await ctx.db
        .query("contacts")
        .filter((q) => q.neq(q.field("suggestedCampaignId"), null))
        .order("desc")
        .take(args.limit || 100);
    }

    // Enrich with campaign info
    const enrichedContacts = await Promise.all(
      contacts.map(async (contact) => {
        const campaign = contact.suggestedCampaignId 
          ? await ctx.db.get(contact.suggestedCampaignId)
          : null;

        return {
          contactId: contact._id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          companyId: contact.companyId,
          suggestedCampaignId: contact.suggestedCampaignId,
          campaignName: campaign?.name,
          clientId: contact.clientId,
          companyName: contact.name,
        };
      })
    );

    return enrichedContacts;
  },
});

/**
 * Get pending assignment count for client
 */
export const getPendingAssignmentCount = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.neq(q.field("suggestedCampaignId"), null))
      .collect();

    return contacts.length;
  },
});

/**
 * Get recent assignments (completed in last 24h)
 */
export const getRecentAssignments = query({
  args: {
    clientId: v.id("clients"),
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const hoursBack = args.hours || 24;
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);

    const recentContacts = await ctx.db
      .query("contacts")
      .withIndex("by_client_assignment", (q) => 
        q.eq("clientId", args.clientId).gte("lastAssignmentAt", cutoffTime)
      )
      .order("desc")
      .take(50);

    return recentContacts.map(contact => ({
      contactId: contact._id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      lastAssignmentAt: contact.lastAssignmentAt,
      companyName: contact.name,
    }));
  },
});

// ===============================
// ASSIGNMENT COMPLETION (CONSUMER)
// ===============================

/**
 * Complete assignment atomically:
 * 1. Clear queue (suggestedCampaignId = null)
 * 2. Set assignment timestamp (lastAssignmentAt = now)
 * 3. Create campaignContacts entry
 */
export const completeAssignment = internalMutation({
  args: {
    contactId: v.id("contacts"),
    campaignId: v.id("campaigns"),
    clientId: v.id("clients"),
    assignedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Clear queue and set assignment timestamp
    await ctx.db.patch(args.contactId, {
      suggestedCampaignId: null,
      lastAssignmentAt: args.assignedAt,
    });

    // 2. Create campaignContacts entry (with duplicate protection)
    try {
      await ctx.db.insert("campaignContacts", {
        campaignId: args.campaignId,
        contactId: args.contactId,
        clientId: args.clientId,
        status: "planned",
        addedAt: args.assignedAt,
      });
    } catch (error) {
      // If duplicate constraint fails, that's actually OK - it means assignment already exists
      if (error.message?.includes("unique")) {
        console.log(`⚠️ Campaign contact already exists for ${args.contactId} + ${args.campaignId}`);
      } else {
        throw error;
      }
    }

    console.log(`✅ Assignment completed: Contact ${args.contactId} → Campaign ${args.campaignId}`);
  },
});

/**
 * Batch complete assignments (used by cronjob)
 */
export const batchCompleteAssignments = internalMutation({
  args: {
    assignments: v.array(v.object({
      contactId: v.id("contacts"),
      campaignId: v.id("campaigns"),
      clientId: v.id("clients"),
    })),
    assignedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const assignment of args.assignments) {
      try {
        await ctx.runMutation(internal.smartAssignmentQueue.completeAssignment, {
          ...assignment,
          assignedAt: args.assignedAt,
        });
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${assignment.contactId}: ${error.message}`);
        console.error(`❌ Failed to complete assignment:`, error);
      }
    }

    return results;
  },
});

// ===============================
// QUEUE PROCESSING (CRONJOB LOGIC)
// ===============================

/**
 * Process assignment queue - called by cronjob
 */
export const processAssignmentQueue = internalAction({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 50;
    
    console.log(`🔄 Processing Smart Assignment queue (batch size: ${batchSize})`);

    // Get pending assignments using comprehensive view
    const pendingQueueItems = await ctx.runQuery("views:smartAssignmentQueueView", {
      limit: batchSize,
    });

    if (pendingQueueItems.length === 0) {
      console.log(`📭 No pending assignments in queue`);
      return { processed: 0, successful: 0, failed: 0 };
    }

    console.log(`📋 Found ${pendingQueueItems.length} contacts in assignment queue`);

    // Group by campaign for efficient webhook calls
    const campaignGroups = new Map<string, typeof pendingQueueItems>();
    
    for (const queueItem of pendingQueueItems) {
      const campaignId = queueItem.suggestedCampaignId;
      if (!campaignGroups.has(campaignId)) {
        campaignGroups.set(campaignId, []);
      }
      campaignGroups.get(campaignId)!.push(queueItem);
    }

    console.log(`🎯 Processing ${campaignGroups.size} campaigns`);

    let totalSuccessful = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    // Process each campaign group
    for (const [campaignId, queueItems] of campaignGroups.entries()) {
      try {
        console.log(`📧 Processing campaign ${campaignId} with ${queueItems.length} contacts`);

        // Send to n8n webhook with complete payload
        const webhookUrl = "https://djoere.app.n8n.cloud/webhook/35f92b6a-b750-422e-ae90-a746c6e3fd6b";
        
        const webhookPayload = {
          type: "smart-assignment-batch",
          campaignId,
          contacts: queueItems.map(item => ({
            // Required identifiers
            contactId: item.contactId,
            clientId: item.clientId,
            companyId: item.companyId,
            suggestedCampaignId: item.suggestedCampaignId,
            
            // Contact names and details
            firstName: item.firstName,
            lastName: item.lastName,
            email: item.email,
            jobTitle: item.jobTitle,
            functionGroup: item.functionGroup,
            linkedinUrl: item.linkedinUrl,
            
            // Company information
            companyName: item.companyName,
            companySummary: item.companySummary, // Company summary from companies table
            companyDomain: item.companyDomain,
            companyWebsite: item.companyWebsite,
            industryLabel: item.industryLabel,
            subindustryLabel: item.subindustryLabel,
            companySize: item.companySize,
            
            // Client information
            instantlyemaillistid: item.instantlyemaillistid, // From clients table
            
            // Complete campaign data (all campaign columns)
            campaign: item.campaign,
            
            // Metadata
            queuedAt: item.queuedAt,
          })),
          timestamp: Date.now(),
        };

        console.log(`🔗 Webhook payload for campaign ${campaignId}:`, JSON.stringify(webhookPayload, null, 2));

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!response.ok) {
          throw new Error(`Webhook failed with status ${response.status}`);
        }

        console.log(`✅ Webhook successful for campaign ${campaignId}`);

        // If webhook successful, complete assignments atomically
        const assignments = queueItems.map(item => ({
          contactId: item.contactId,
          campaignId: item.suggestedCampaignId,
          clientId: item.clientId,
        }));

        const results = await ctx.runMutation(
          internal.smartAssignmentQueue.batchCompleteAssignments,
          {
            assignments,
            assignedAt: Date.now(),
          }
        );

        totalSuccessful += results.successful;
        totalFailed += results.failed;
        allErrors.push(...results.errors);

        console.log(`✅ Completed ${results.successful} assignments for campaign ${campaignId}`);

      } catch (error) {
        console.error(`❌ Failed to process campaign ${campaignId}:`, error);
        allErrors.push(`Campaign ${campaignId}: ${error.message}`);
        totalFailed += queueItems.length;
      }
    }

    const result = {
      processed: pendingQueueItems.length,
      successful: totalSuccessful,
      failed: totalFailed,
      errors: allErrors,
      campaignsProcessed: campaignGroups.size,
    };

    console.log(`🎯 Queue processing complete:`, JSON.stringify(result, null, 2));
    return result;
  },
});

/**
 * Test function to check pending assignments data structure
 */
export const debugPendingAssignments = query({
  args: {
    clientId: v.optional(v.id("clients")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log(`🔍 Debug: Getting pending assignments for client ${args.clientId}`);
    
    const pendingAssignments = await ctx.runQuery("smartAssignmentQueue:getPendingAssignments", {
      clientId: args.clientId,
      limit: args.limit || 5,
    });

    console.log(`🔍 Debug: Found ${pendingAssignments.length} pending assignments`);
    console.log(`🔍 Debug: Sample data:`, JSON.stringify(pendingAssignments.slice(0, 2), null, 2));

    return pendingAssignments;
  },
});