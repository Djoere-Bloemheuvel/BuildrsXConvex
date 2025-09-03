import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * TEST DEALS OPTIMIZATION
 * Compare original vs optimized deals functions for identical results
 */

export const compareDealsPerformance = query({
  args: { 
    pipelineId: v.id("pipelines"),
    runOptimizedTest: v.optional(v.boolean())
  },
  returns: v.object({
    originalCount: v.number(),
    optimizedCount: v.number(),
    originalTime: v.number(),
    optimizedTime: v.number(),
    dataMatches: v.boolean(),
    originalSample: v.array(v.object({
      _id: v.id("deals"),
      title: v.string(),
      companyName: v.optional(v.string()),
    })),
    optimizedSample: v.array(v.object({
      _id: v.id("deals"),
      title: v.string(),
      companyName: v.optional(v.string()),
    })),
    message: v.string()
  }),
  handler: async (ctx, args) => {
    console.log(`🧪 Testing deals optimization for pipeline ${args.pipelineId}`);
    
    try {
      // Test original function
      console.log("Testing ORIGINAL getByPipeline...");
      const startOriginal = Date.now();
      
      const originalDeals = await ctx.runQuery("deals:getByPipeline", {
        pipelineId: args.pipelineId
      });
      
      const endOriginal = Date.now();
      const originalTime = endOriginal - startOriginal;
      
      console.log(`✅ Original function: ${originalDeals.length} deals in ${originalTime.toFixed(2)}ms`);
      
      // Test optimized function (only if requested to avoid overwhelming logs)
      let optimizedDeals: any[] = [];
      let optimizedTime = 0;
      
      if (args.runOptimizedTest) {
        console.log("Testing OPTIMIZED getByPipelineOptimized...");
        const startOptimized = Date.now();
        
        optimizedDeals = await ctx.runQuery("deals:getByPipelineOptimized", {
          pipelineId: args.pipelineId
        });
        
        const endOptimized = Date.now();
        optimizedTime = endOptimized - startOptimized;
        
        console.log(`✅ Optimized function: ${optimizedDeals.length} deals in ${optimizedTime.toFixed(2)}ms`);
      }
      
      // Compare data integrity
      const dataMatches = args.runOptimizedTest ? 
        originalDeals.length === optimizedDeals.length &&
        originalDeals.every(orig => 
          optimizedDeals.some(opt => 
            opt._id === orig._id && 
            opt.title === orig.title &&
            opt.companies?.name === orig.companies?.name
          )
        ) : true;
      
      // Create samples for comparison
      const originalSample = originalDeals.slice(0, 3).map(deal => ({
        _id: deal._id,
        title: deal.title,
        companyName: deal.companies?.name
      }));
      
      const optimizedSample = optimizedDeals.slice(0, 3).map(deal => ({
        _id: deal._id,
        title: deal.title,
        companyName: deal.companies?.name
      }));
      
      const message = args.runOptimizedTest ? 
        `Performance comparison: ${originalTime.toFixed(2)}ms vs ${optimizedTime.toFixed(2)}ms (${((originalTime - optimizedTime) / originalTime * 100).toFixed(1)}% improvement)` :
        `Original function baseline: ${originalTime.toFixed(2)}ms with ${originalDeals.length} deals`;
      
      return {
        originalCount: originalDeals.length,
        optimizedCount: optimizedDeals.length,
        originalTime,
        optimizedTime,
        dataMatches,
        originalSample,
        optimizedSample,
        message
      };
      
    } catch (error) {
      console.error("Error in deals performance test:", error);
      return {
        originalCount: 0,
        optimizedCount: 0,
        originalTime: 0,
        optimizedTime: 0,
        dataMatches: false,
        originalSample: [],
        optimizedSample: [],
        message: `Test failed: ${error}`
      };
    }
  }
});

export const getFirstPipelineForTesting = query({
  args: { 
    clientId: v.id("clients") 
  },
  returns: v.object({
    pipeline: v.optional(v.object({
      _id: v.id("pipelines"),
      name: v.string(),
      dealsCount: v.number()
    })),
    message: v.string()
  }),
  handler: async (ctx, args) => {
    console.log(`🔍 Finding first pipeline for client ${args.clientId}`);
    
    const pipelines = await ctx.db
      .query("pipelines")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .first();
      
    if (!pipelines) {
      return {
        pipeline: undefined,
        message: "No pipelines found for this client"
      };
    }
    
    // Count deals in this pipeline
    const deals = await ctx.db
      .query("deals")
      .withIndex("by_pipeline", (q) => q.eq("pipelineId", pipelines._id))
      .collect();
    
    return {
      pipeline: {
        _id: pipelines._id,
        name: pipelines.name,
        dealsCount: deals.length
      },
      message: `Found pipeline "${pipelines.name}" with ${deals.length} deals`
    };
  }
});