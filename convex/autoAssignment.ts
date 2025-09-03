import { mutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ===============================
// AUTOMATIC CANDIDATE ASSIGNMENT
// Automatically assigns eligible candidates to their suggested campaigns
// ===============================

/**
 * Main automatic assignment function that processes all clients
 * This runs via cron job to keep assignments always up-to-date
 */
export const autoAssignCandidatesToCampaigns = action({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    stats: v.object({
      clientsProcessed: v.number(),
      candidatesProcessed: v.number(),
      assignmentsCreated: v.number(),
      campaignsUpdated: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const startTime = Date.now();
    console.log("🚀 Starting automatic candidate assignment process...");

    let stats = {
      clientsProcessed: 0,
      candidatesProcessed: 0,
      assignmentsCreated: 0,
      campaignsUpdated: 0,
    };

    try {
      // Get all active clients
      const clients = await ctx.runMutation(internal.autoAssignment.getAllActiveClients, {});
      
      for (const client of clients) {
        console.log(`📋 Processing client: ${client.name} (${client._id})`);
        
        const clientStats = await ctx.runMutation(
          internal.autoAssignment.processClientAssignments,
          { clientId: client._id }
        );
        
        stats.clientsProcessed += 1;
        stats.candidatesProcessed += clientStats.candidatesProcessed;
        stats.assignmentsCreated += clientStats.assignmentsCreated;
        stats.campaignsUpdated += clientStats.campaignsUpdated;
      }

      const duration = Date.now() - startTime;
      const message = `✅ Auto-assignment completed in ${duration}ms: ${stats.assignmentsCreated} new assignments across ${stats.clientsProcessed} clients`;
      
      console.log(message);
      return {
        success: true,
        message,
        stats,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = `❌ Auto-assignment failed after ${duration}ms: ${error}`;
      
      console.error(errorMessage);
      return {
        success: false,
        message: errorMessage,
        stats,
      };
    }
  },
});

/**
 * Get all active clients that need candidate processing
 */
export const getAllActiveClients = mutation({
    args: {},
    returns: v.array(v.object({
      _id: v.id("clients"),
      name: v.string(),
      domain: v.string(),
    })),
    handler: async (ctx) => {
      const clients = await ctx.db
        .query("clients")
        .filter((q) => q.neq(q.field("subscriptionStatus"), "cancelled"))
        .collect();
      
      return clients.map(client => ({
        _id: client._id,
        name: client.name,
        domain: client.domain,
      }));
    },
  });

/**
 * Process automatic assignments for a specific client
 */
export const processClientAssignments = mutation({
    args: { 
      clientId: v.id("clients"),
    },
    returns: v.object({
      candidatesProcessed: v.number(),
      assignmentsCreated: v.number(),
      campaignsUpdated: v.number(),
    }),
    handler: async (ctx, { clientId }) => {
      let stats = {
        candidatesProcessed: 0,
        assignmentsCreated: 0,
        campaignsUpdated: 0,
      };

      try {
        // Get all eligible candidates with suggested campaigns for this client
        const candidates = await ctx.runQuery(internal.candidateViews.coldEmailCandidates, {
          clientId,
          includeAssignable: true, // Only candidates with suggested campaigns
        });

        console.log(`  📊 Found ${candidates.length} eligible candidates for client ${clientId}`);

        // Group candidates by suggested campaign for efficient processing
        const candidatesByCampaign = new Map<string, any[]>();
        for (const candidate of candidates) {
          if (candidate.suggestedCampaignId) {
            if (!candidatesByCampaign.has(candidate.suggestedCampaignId)) {
              candidatesByCampaign.set(candidate.suggestedCampaignId, []);
            }
            candidatesByCampaign.get(candidate.suggestedCampaignId)!.push(candidate);
          }
        }

        // Process each campaign's candidates
        for (const [campaignId, campaignCandidates] of candidatesByCampaign) {
          console.log(`  🎯 Processing ${campaignCandidates.length} candidates for campaign ${campaignId}`);
          
          // Get campaign details and check daily limits
          const campaign = await ctx.db.get(campaignId as any);
          if (!campaign) {
            console.log(`  ⚠️ Campaign ${campaignId} not found, skipping`);
            continue;
          }

          // Check daily assignment limit
          const today = new Date().toISOString().split('T')[0];
          const todayAssignments = await ctx.db
            .query("campaignContacts")
            .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId as any))
            .filter((q) => q.gte(q.field("_creationTime"), new Date(today).getTime()))
            .collect();

          const dailyLimit = campaign.dailyLimit || 50; // Default to 50 if not set
          const remainingCapacity = Math.max(0, dailyLimit - todayAssignments.length);
          
          if (remainingCapacity === 0) {
            console.log(`  🚫 Campaign ${campaign.name} has reached daily limit (${dailyLimit})`);
            continue;
          }

          // Assign candidates up to the daily limit
          const candidatesToAssign = campaignCandidates.slice(0, remainingCapacity);
          
          for (const candidate of candidatesToAssign) {
            // Check if candidate is already assigned to this campaign
            const existingAssignment = await ctx.db
              .query("campaignContacts")
              .withIndex("by_contact", (q) => q.eq("contactId", candidate.contactId))
              .filter((q) => q.eq(q.field("campaignId"), campaignId as any))
              .first();

            if (existingAssignment) {
              console.log(`  ⏭️ Candidate ${candidate.contactId} already assigned to campaign ${campaignId}`);
              continue;
            }

            // Create the assignment
            await ctx.db.insert("campaignContacts", {
              campaignId: campaignId as any,
              contactId: candidate.contactId,
              status: "planned",
              addedAt: Date.now(),
              source: "auto_assignment",
              priority: 0,
            });

            stats.assignmentsCreated += 1;
            console.log(`  ✅ Assigned candidate ${candidate.contactId} to campaign ${campaign.name}`);
          }

          if (candidatesToAssign.length > 0) {
            stats.campaignsUpdated += 1;
          }
        }

        stats.candidatesProcessed = candidates.length;
        
        console.log(`  📈 Client ${clientId} processed: ${stats.assignmentsCreated} assignments created`);
        return stats;

      } catch (error) {
        console.error(`  ❌ Error processing client ${clientId}:`, error);
        return stats;
      }
    },
  });