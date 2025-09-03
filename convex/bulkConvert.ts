import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";

// ===============================
// ULTRA SIMPLE BULK CONVERT
// ===============================

// Just store: client + daily limit. That's it.
export const setBulkConvertSettings = mutation({
  args: {
    clientIdentifier: v.string(),
    dailyLimit: v.number(),
    isEnabled: v.boolean(),
    targetingCriteria: v.optional(v.object({
      functionGroups: v.optional(v.array(v.string())),
      industries: v.optional(v.array(v.string())),
      countries: v.optional(v.array(v.string())),
      employeeMin: v.optional(v.number()),
      employeeMax: v.optional(v.number()),
      customFilters: v.optional(v.object({}))
    }))
  },
  handler: async (ctx, args) => {
    // Find or create setting for this client
    const existing = await ctx.db
      .query("clientAutomations")
      .filter((q) => q.and(
        q.eq(q.field("clientId"), args.clientIdentifier),
        q.eq(q.field("customName"), "Bulk Convert")
      ))
      .first();

    // Get the bulk lead conversion template (there's only one!)
    const template = await ctx.runQuery("automations:getBulkLeadConversionTemplate");
    
    if (!template) {
      throw new Error("Bulk Lead Conversion template not found. Please run automations:seedAutomationTemplates first.");
    }

    if (existing) {
      // Update existing automation with new client-specific settings
      await ctx.db.patch(existing._id, {
        templateId: template._id, // Always use the bulk lead conversion template
        dailyLimit: args.dailyLimit, // Client-specific daily limit
        isActive: args.isEnabled,
        targetingCriteria: args.targetingCriteria, // Client-specific targeting
        updatedAt: Date.now()
      });
    } else {
      // Create new automation instance for this client
      await ctx.db.insert("clientAutomations", {
        clientId: args.clientIdentifier,
        templateId: template._id, // Always use the bulk lead conversion template
        customName: "Bulk Convert",
        dailyLimit: args.dailyLimit, // Client-specific daily limit
        isActive: args.isEnabled,
        targetingCriteria: args.targetingCriteria, // Client-specific targeting
        totalConverted: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    return { success: true };
  }
});

// Cron job function - using optimized view approach
export const runBulkConvert = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🤖 Running bulk convert...");

    // Get all enabled bulk convert settings
    const settings = await ctx.db
      .query("clientAutomations")
      .filter((q) => q.and(
        q.eq(q.field("customName"), "Bulk Convert"),
        q.eq(q.field("isActive"), true)
      ))
      .collect();

    console.log(`Found ${settings.length} bulk convert settings`);

    for (const setting of settings) {
      try {
        console.log(`🚀 Starting streaming bulk convert for client ${setting.clientId}`);
        
        // Use the new streaming conversion approach
        const result = await ctx.runMutation("leadConversion/streamingConversion:streamingBulkConvert", {
          clientIdentifier: setting.clientId,
          dailyLimit: setting.dailyLimit,
          filters: {
            functionGroups: setting.targetingCriteria?.functionGroups,
            industries: setting.targetingCriteria?.industries,
            countries: setting.targetingCriteria?.countries,
            minEmployeeCount: setting.targetingCriteria?.employeeMin,
            maxEmployeeCount: setting.targetingCriteria?.employeeMax,
          },
          batchSize: 15, // Conservative batch size for memory safety
        });

        if (!result.success) {
          console.log(`📭 No leads converted for client ${setting.clientId}`);
          console.log(`📊 Search results: ${result.totalFound} found, ${result.failed} failed`);
          continue;
        }

        console.log(`✅ Streaming conversion complete for ${setting.clientId}:`);
        console.log(`📊 Found: ${result.totalFound}, Converted: ${result.processed}, Failed: ${result.failed}`);
        console.log(`📊 Search passes: ${result.searchPasses}, Time: ${result.totalTimeMs}ms`);

        // Update stats with detailed metrics
        await ctx.db.patch(setting._id, {
          totalConverted: (setting.totalConverted || 0) + result.processed,
          lastExecuted: Date.now(),
          lastExecutionStatus: result.success ? "success" : "partial_failure",
          updatedAt: Date.now()
        });

      } catch (error) {
        console.error(`❌ Streaming bulk convert failed for ${setting.clientId}:`, error);
        
        // Update with error status
        await ctx.db.patch(setting._id, {
          lastExecuted: Date.now(),
          lastExecutionStatus: "error",
          lastError: error.message,
          updatedAt: Date.now()
        });
      }
    }

    return { success: true };
  }
});