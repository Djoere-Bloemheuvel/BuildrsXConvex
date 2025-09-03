import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * SUPER SIMPLE BULK CONVERSION
 * 
 * No pagination, no complex logic - just convert the leads you give me
 */

export const convertLeadsSimple = mutation({
  args: {
    leadIds: v.array(v.id("leads")),
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

    console.log(`🔄 Simple conversion: ${leadIds.length} leads for ${clientIdentifier}`);

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

    // BATCH OPTIMIZATION: Pre-fetch everything we need
    console.log(`📦 Pre-fetching all data for ${leadIds.length} leads...`);
    
    // 1. Get all leads at once
    const leads = await Promise.all(leadIds.map(id => ctx.db.get(id)));
    const validLeads = leads.filter(Boolean);
    console.log(`📋 Found ${validLeads.length} valid leads`);

    // 2. Skip duplicate checking - handle at insert level
    console.log(`⚡ Skipping duplicate check - will handle duplicates during insert`);
    const leadsToConvert = validLeads;
    results.skippedCount = 0;

    // 4. Get companies in smaller batches to avoid memory issues
    const companyIds = [...new Set(leadsToConvert.map(lead => lead.companyId).filter(Boolean))];
    console.log(`🏢 Fetching ${companyIds.length} unique companies in batches...`);
    
    const companyMap = new Map();
    const batchSize = 50; // Process companies in batches of 50
    
    for (let i = 0; i < companyIds.length; i += batchSize) {
      const batch = companyIds.slice(i, i + batchSize);
      const batchCompanies = await Promise.all(batch.map(id => ctx.db.get(id)));
      
      batchCompanies.forEach((company, index) => {
        if (company) companyMap.set(batch[index], company);
      });
    }
    
    console.log(`🏢 Successfully fetched ${companyMap.size} companies`);

    // 5. Insert contacts with duplicate handling
    const insertPromises = leadsToConvert.map(async (lead) => {
      try {
        const company = lead.companyId ? companyMap.get(lead.companyId) : null;
        
        const contactId = await ctx.db.insert("contacts", {
          leadId: lead._id,
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
          subindustryLabel: company?.subindustryLabel,
        });

        // Update lead counter
        await ctx.db.patch(lead._id, {
          totalTimesContacted: (lead.totalTimesContacted || 0) + 1,
          lastGlobalContactAt: Date.now(),
        });

        return { success: true, leadId: lead._id, email: lead.email };
      } catch (error) {
        if (error.message.includes("already exists") || error.message.includes("duplicate")) {
          results.skippedCount++;
          return { success: false, reason: "duplicate", leadId: lead._id };
        }
        results.errors.push(`Failed ${lead.email || lead._id}: ${error.message}`);
        return { success: false, reason: "error", leadId: lead._id };
      }
    });

    // 6. Execute all inserts with error handling
    const insertResults = await Promise.all(insertPromises);
    const successful = insertResults.filter(r => r.success);
    
    results.convertedCount = successful.length;
    
    console.log(`✅ Successfully converted: ${results.convertedCount}`);
    console.log(`⏭️ Skipped duplicates: ${results.skippedCount}`);
    console.log(`❌ Errors: ${results.errors.length}`);

    if (results.errors.length > 0) {
      results.success = false;
    }

    console.log(`🏁 Simple conversion done: ${results.convertedCount} converted, ${results.skippedCount} skipped`);
    
    return results;
  },
});