import { query } from "./_generated/server";
import { v } from "convex/values";

export const findAutomationById = query({
  args: {
    automationId: v.string(),
  },
  handler: async (ctx, args) => {
    // First try to get it directly as an ID
    try {
      const automation = await ctx.db.get(args.automationId as any);
      if (automation) {
        return { found: true, automation, table: "direct_id" };
      }
    } catch (e) {
      // Not a valid ID, continue searching
    }

    // Search in all possible automation tables
    const possibleTables = [
      "automations", 
      "clientAutomations", 
      "automationTemplates",
      "bulkConvert",
      "emailAccounts",
      "campaigns"
    ];

    for (const tableName of possibleTables) {
      try {
        // Try to find in this table
        const results = await ctx.db.query(tableName as any).collect();
        
        for (const item of results) {
          // Check if this record contains our ID anywhere
          const itemStr = JSON.stringify(item);
          if (itemStr.includes(args.automationId)) {
            return { 
              found: true, 
              automation: item, 
              table: tableName,
              context: "Found ID in record"
            };
          }
        }
      } catch (e) {
        // Table doesn't exist, skip
        console.log(`Table ${tableName} doesn't exist or error: ${e.message}`);
      }
    }

    return { found: false, searchedTables: possibleTables };
  },
});