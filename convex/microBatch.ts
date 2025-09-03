import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * MICRO BATCH CONVERSION
 * 
 * Processes leads in tiny batches of 10 to avoid ANY memory issues
 */

// Single batch processor - handles max 10 leads
export const convertBatch = mutation({
  args: {
    leadIds: v.array(v.id("leads")), // Max 10 leads
    clientIdentifier: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    convertedCount: v.number(),
    skippedCount: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const { leadIds, clientIdentifier } = args;

    if (leadIds.length > 10) {
      throw new Error("Batch too large - max 10 leads per batch");
    }

    console.log(`🔄 Processing micro batch: ${leadIds.length} leads`);

    // Find client
    let client = null;
    try {
      client = await ctx.db.get(clientIdentifier as any);
    } catch (error) {
      client = await ctx.db
        .query("clients")
        .filter((q) => q.eq(q.field("domain"), clientIdentifier))
        .first();
    }

    if (!client) {
      throw new Error(`Client ${clientIdentifier} not found`);
    }

    const results = {
      success: true,
      convertedCount: 0,
      skippedCount: 0,
      errors: [] as string[],
    };

    // Process each lead in this small batch
    for (const leadId of leadIds) {
      try {
        const lead = await ctx.db.get(leadId);
        if (!lead) {
          results.errors.push(`Lead ${leadId} not found`);
          results.skippedCount++;
          continue;
        }

        // Check if already a contact
        const existingContact = await ctx.db
          .query("contacts")
          .filter((q) => q.eq(q.field("leadId"), leadId))
          .first();

        if (existingContact) {
          results.skippedCount++;
          continue;
        }

        // Get company (optional)
        let company = null;
        if (lead.companyId) {
          company = await ctx.db.get(lead.companyId);
        }

        // Create contact
        await ctx.db.insert("contacts", {
          leadId: leadId,
          clientId: client._id,
          companyId: lead.companyId,
          purchasedAt: Date.now(),
          status: "cold",
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          jobTitle: lead.jobTitle,
          functionGroup: lead.functionGroup,
          name: company?.name,
          industryLabel: company?.industryLabel,
        });

        // Update lead
        await ctx.db.patch(leadId, {
          totalTimesContacted: (lead.totalTimesContacted || 0) + 1,
          lastGlobalContactAt: Date.now(),
        });

        results.convertedCount++;

      } catch (error) {
        results.errors.push(`Failed ${leadId}: ${error.message}`);
        results.skippedCount++;
      }
    }

    console.log(`✅ Micro batch done: ${results.convertedCount}/${leadIds.length} converted`);
    return results;
  },
});

// Action that orchestrates multiple micro batches
export const convertManyLeads = action({
  args: {
    leadIds: v.array(v.id("leads")),
    clientIdentifier: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    convertedCount: v.number(),
    skippedCount: v.number(),
    totalBatches: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const { leadIds, clientIdentifier } = args;
    
    console.log(`🚀 Starting micro batch conversion: ${leadIds.length} leads`);

    const batchSize = 10;
    const totalResults = {
      success: true,
      convertedCount: 0,
      skippedCount: 0,
      totalBatches: 0,
      errors: [] as string[],
    };

    // Split into micro batches of 10
    for (let i = 0; i < leadIds.length; i += batchSize) {
      const batch = leadIds.slice(i, i + batchSize);
      totalResults.totalBatches++;
      
      console.log(`📦 Processing batch ${totalResults.totalBatches}: ${batch.length} leads`);

      try {
        const batchResult = await ctx.runMutation(internal.microBatch.convertBatch, {
          leadIds: batch,
          clientIdentifier,
        });

        totalResults.convertedCount += batchResult.convertedCount;
        totalResults.skippedCount += batchResult.skippedCount;
        totalResults.errors.push(...batchResult.errors);

        if (!batchResult.success) {
          totalResults.success = false;
        }

      } catch (error) {
        totalResults.errors.push(`Batch ${totalResults.totalBatches} failed: ${error.message}`);
        totalResults.success = false;
      }
    }

    console.log(`🏁 All batches complete: ${totalResults.convertedCount} total converted in ${totalResults.totalBatches} batches`);
    
    return totalResults;
  },
});