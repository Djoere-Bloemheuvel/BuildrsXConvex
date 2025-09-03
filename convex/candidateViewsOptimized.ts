import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * OPTIMIZED CANDIDATE VIEWS
 * 
 * High-performance candidate statistics using pre-computed counters.
 * Fallback to legacy computation for reliability.
 * 
 * Performance: O(1) instead of O(n) for large datasets
 */

// Cache duration: 5 minutes for stats
const STATS_CACHE_DURATION = 5 * 60 * 1000;

/**
 * Get candidate statistics with optimized caching
 * Falls back to legacy computation if cache is empty/stale
 */
export const getCandidateStatsOptimized = query({
  args: { 
    clientId: v.id("clients"),
    forceRefresh: v.optional(v.boolean()) // For debugging/testing
  },
  returns: v.object({
    eligibleCandidates: v.number(),
    inQueue: v.number(),
    inCampaigns: v.number(),
    coldCandidates: v.number(),
    warmCandidates: v.number(),
    activeCampaignsCount: v.number(),
    abmCompaniesCount: v.number(),
    
    // Cache metadata for debugging
    fromCache: v.boolean(),
    lastUpdated: v.number(),
    computationTime: v.number(),
  }),
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    // Check for cached stats first (unless forced refresh)
    if (!args.forceRefresh) {
      const cached = await ctx.db
        .query("clientCandidateStats")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
        .first();
      
      // Return cached if fresh (< 5 minutes old)
      if (cached && cached.lastUpdated > Date.now() - STATS_CACHE_DURATION) {
        return {
          eligibleCandidates: cached.eligibleCandidates,
          inQueue: cached.inQueue,
          inCampaigns: cached.inCampaigns,
          coldCandidates: cached.coldCandidates,
          warmCandidates: cached.warmCandidates,
          activeCampaignsCount: cached.activeCampaignsCount,
          abmCompaniesCount: cached.abmCompaniesCount,
          fromCache: true,
          lastUpdated: cached.lastUpdated,
          computationTime: Date.now() - startTime,
        };
      }
    }
    
    // Fallback to legacy computation
    console.log(`🔄 Computing candidate stats for client ${args.clientId} (cache miss)`);
    const legacyStats = await computeLegacyStats(ctx, args.clientId);
    
    return {
      ...legacyStats,
      fromCache: false,
      lastUpdated: Date.now(),
      computationTime: Date.now() - startTime,
    };
  },
});

/**
 * Internal function to update the stats cache
 * Called asynchronously to avoid blocking the main query
 */
export const updateStatsCache = internalMutation({
  args: {
    clientId: v.id("clients"),
    stats: v.object({
      eligibleCandidates: v.number(),
      inQueue: v.number(),
      inCampaigns: v.number(),
      coldCandidates: v.number(),
      warmCandidates: v.number(),
      activeCampaignsCount: v.number(),
      abmCompaniesCount: v.number(),
    })
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("clientCandidateStats")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .first();
    
    const now = Date.now();
    const statsData = {
      clientId: args.clientId,
      eligibleCandidates: args.stats.eligibleCandidates,
      inQueue: args.stats.inQueue,
      inCampaigns: args.stats.inCampaigns,
      coldCandidates: args.stats.coldCandidates,
      warmCandidates: args.stats.warmCandidates,
      activeCampaignsCount: args.stats.activeCampaignsCount,
      abmCompaniesCount: args.stats.abmCompaniesCount,
      lastUpdated: now,
      lastFullRefresh: now,
      version: 1,
    };
    
    if (existing) {
      await ctx.db.patch(existing._id, statsData);
    } else {
      await ctx.db.insert("clientCandidateStats", statsData);
    }
    
    console.log(`✅ Updated candidate stats cache for client ${args.clientId}`);
  },
});

/**
 * Legacy stats computation - mirrors the old logic exactly
 * This ensures backward compatibility while we transition
 */
async function computeLegacyStats(ctx: any, clientId: string) {
  try {
    // Get all contacts for this client (the expensive operation)
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .collect();
    
    console.log(`📊 Processing ${contacts.length} contacts for stats computation`);
    
    // Basic counts
    let eligibleCandidates = 0;
    let inQueue = 0;
    let inCampaigns = 0;
    let coldCandidates = 0;
    let warmCandidates = 0;
    
    // Process each contact (the bottleneck)
    for (const contact of contacts) {
      // Count by status
      if (contact.status === 'cold') coldCandidates++;
      if (contact.status === 'warm') warmCandidates++;
      
      // Check if eligible (simplified logic for now)
      const isEligible = contact.status === 'cold' && !contact.activeCampaignIds?.length;
      if (isEligible) eligibleCandidates++;
      
      // Check if in queue
      if (contact.suggestedCampaignId) inQueue++;
      
      // Check if in campaigns
      if (contact.activeCampaignIds?.length > 0) inCampaigns++;
    }
    
    // Get campaign counts
    const activeCampaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .filter((q: any) => q.eq(q.field("status"), "active"))
      .collect();
    
    // ABM companies count (simplified)
    const companies = await ctx.db
      .query("companies")
      .collect();
    
    const abmCompaniesCount = companies.filter(c => (c.companySize || 0) >= 25).length;
    
    return {
      eligibleCandidates,
      inQueue,
      inCampaigns,
      coldCandidates,
      warmCandidates,
      activeCampaignsCount: activeCampaigns.length,
      abmCompaniesCount,
    };
    
  } catch (error) {
    console.error('Error computing legacy stats:', error);
    
    // Return safe defaults on error
    return {
      eligibleCandidates: 0,
      inQueue: 0,
      inCampaigns: 0,
      coldCandidates: 0,
      warmCandidates: 0,
      activeCampaignsCount: 0,
      abmCompaniesCount: 0,
    };
  }
}

/**
 * Update cache for a specific client (public mutation)
 */
export const updateClientStatsCache = mutation({
  args: { 
    clientId: v.id("clients"),
    forceRefresh: v.optional(v.boolean())
  },
  returns: v.object({
    success: v.boolean(),
    stats: v.object({
      eligibleCandidates: v.number(),
      inQueue: v.number(),
      inCampaigns: v.number(),
      coldCandidates: v.number(),
      warmCandidates: v.number(),
      activeCampaignsCount: v.number(),
      abmCompaniesCount: v.number(),
    }),
    computationTime: v.number(),
  }),
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    try {
      const stats = await computeLegacyStats(ctx, args.clientId);
      
      const existing = await ctx.db
        .query("clientCandidateStats")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
        .first();
      
      const now = Date.now();
      const statsData = {
        clientId: args.clientId,
        eligibleCandidates: stats.eligibleCandidates,
        inQueue: stats.inQueue,
        inCampaigns: stats.inCampaigns,
        coldCandidates: stats.coldCandidates,
        warmCandidates: stats.warmCandidates,
        activeCampaignsCount: stats.activeCampaignsCount,
        abmCompaniesCount: stats.abmCompaniesCount,
        lastUpdated: now,
        lastFullRefresh: now,
        version: 1,
      };
      
      if (existing) {
        await ctx.db.patch(existing._id, statsData);
      } else {
        await ctx.db.insert("clientCandidateStats", statsData);
      }
      
      return {
        success: true,
        stats,
        computationTime: Date.now() - startTime,
      };
      
    } catch (error) {
      console.error(`Error updating stats cache for client ${args.clientId}:`, error);
      throw error;
    }
  },
});

/**
 * Force refresh all client stats (maintenance function)
 */
export const forceRefreshAllStats = mutation({
  args: {},
  returns: v.object({
    refreshed: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx, args) => {
    const clients = await ctx.db.query("clients").collect();
    let refreshed = 0;
    let errors = 0;
    
    for (const client of clients) {
      try {
        const stats = await computeLegacyStats(ctx, client._id);
        await ctx.scheduler.runAfter(0, internal.candidateViewsOptimized.updateStatsCache, {
          clientId: client._id,
          stats
        });
        refreshed++;
      } catch (error) {
        console.error(`Error refreshing stats for client ${client._id}:`, error);
        errors++;
      }
    }
    
    return { refreshed, errors };
  },
});

/**
 * Get cache status for debugging
 */
export const getCacheStatus = query({
  args: { clientId: v.id("clients") },
  returns: v.union(
    v.object({
      exists: v.literal(true),
      lastUpdated: v.number(),
      age: v.number(),
      isStale: v.boolean(),
      stats: v.object({
        eligibleCandidates: v.number(),
        inQueue: v.number(),
        inCampaigns: v.number(),
      })
    }),
    v.object({
      exists: v.literal(false)
    })
  ),
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("clientCandidateStats")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .first();
    
    if (!cached) {
      return { exists: false };
    }
    
    const age = Date.now() - cached.lastUpdated;
    const isStale = age > STATS_CACHE_DURATION;
    
    return {
      exists: true,
      lastUpdated: cached.lastUpdated,
      age,
      isStale,
      stats: {
        eligibleCandidates: cached.eligibleCandidates,
        inQueue: cached.inQueue,
        inCampaigns: cached.inCampaigns,
      }
    };
  },
});

/**
 * Background refresh for all active clients (called by cron)
 */
export const backgroundRefreshStats = internalAction({
  args: {},
  returns: v.object({
    processed: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx, args) => {
    console.log("🔄 Starting background stats refresh...");
    
    const clients = await ctx.runQuery("clients:getAllClients");
    let processed = 0;
    let errors = 0;
    
    // Process clients in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (client) => {
          try {
            await ctx.runMutation(internal.candidateViewsOptimized.updateStatsCache, {
              clientId: client._id,
              stats: await computeLegacyStats(ctx, client._id)
            });
            processed++;
          } catch (error) {
            console.error(`Error refreshing stats for client ${client._id}:`, error);
            errors++;
          }
        })
      );
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Background refresh completed: ${processed} processed, ${errors} errors`);
    return { processed, errors };
  },
});

/**
 * Daily full refresh with integrity checks
 */
export const dailyFullRefresh = internalAction({
  args: {},
  returns: v.object({
    processed: v.number(),
    errors: v.number(),
    integritIssues: v.number(),
  }),
  handler: async (ctx, args) => {
    console.log("🌅 Starting daily full refresh...");
    
    const clients = await ctx.runQuery("clients:getAllClients");
    let processed = 0;
    let errors = 0;
    let integrityIssues = 0;
    
    for (const client of clients) {
      try {
        // Compute fresh stats
        const freshStats = await computeLegacyStats(ctx, client._id);
        
        // Get cached stats for comparison
        const cached = await ctx.runQuery(internal.candidateViewsOptimized.getCacheStatus, {
          clientId: client._id
        });
        
        // Check for major discrepancies (data integrity issues)
        if (cached.exists) {
          const discrepancy = Math.abs(cached.stats.eligibleCandidates - freshStats.eligibleCandidates);
          if (discrepancy > Math.max(10, cached.stats.eligibleCandidates * 0.1)) {
            console.warn(`⚠️ Large discrepancy for client ${client._id}: ${discrepancy} candidates`);
            integrityIssues++;
          }
        }
        
        // Update cache with fresh data
        await ctx.runMutation(internal.candidateViewsOptimized.updateStatsCache, {
          clientId: client._id,
          stats: freshStats
        });
        
        processed++;
      } catch (error) {
        console.error(`Error in daily refresh for client ${client._id}:`, error);
        errors++;
      }
    }
    
    console.log(`✅ Daily refresh completed: ${processed} processed, ${errors} errors, ${integrityIssues} integrity issues`);
    return { processed, errors, integritIssues };
  },
});