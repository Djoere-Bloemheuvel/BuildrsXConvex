import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * ROBUST PAGINATED LEAD SEARCH
 * 
 * This system handles large-scale lead searches by:
 * 1. Using pagination to avoid memory limits
 * 2. Pre-filtering at database level with indexes
 * 3. Returning manageable chunks to the UI
 */

export const searchLeadsPaginated = query({
  args: {
    functionGroups: v.optional(v.array(v.string())),
    industries: v.optional(v.array(v.string())),
    countries: v.optional(v.array(v.string())),
    minEmployeeCount: v.optional(v.number()),
    maxEmployeeCount: v.optional(v.number()),
    clientIdentifier: v.string(),
    cursor: v.optional(v.string()),
    pageSize: v.optional(v.number()),
  },
  returns: v.object({
    leads: v.array(v.object({
      leadId: v.id("leads"),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      email: v.string(),
      jobTitle: v.optional(v.string()),
      functionGroup: v.optional(v.string()),
      companyName: v.optional(v.string()),
      industry: v.optional(v.string()),
      employeeCount: v.optional(v.number()),
      country: v.optional(v.string()),
      city: v.optional(v.string()),
      timesConverted: v.number(),
      addedAt: v.optional(v.number()),
      leadScore: v.optional(v.number()),
    })),
    nextCursor: v.optional(v.string()),
    hasMore: v.boolean(),
    totalProcessed: v.number(),
  }),
  handler: async (ctx, args) => {
    const {
      functionGroups,
      industries,
      countries,
      minEmployeeCount,
      maxEmployeeCount,
      clientIdentifier,
      cursor,
      pageSize = 25, // Very conservative page size for memory safety
    } = args;

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
      throw new Error(`Client with identifier ${clientIdentifier} does not exist`);
    }

    console.log(`🔍 Paginated search: page size ${pageSize}, cursor: ${cursor?.substring(0, 10)}...`);

    // Build efficient query with indexes
    let leadsQuery;
    
    // Use the most selective index available
    if (functionGroups && functionGroups.length === 1) {
      // Use function group index for maximum efficiency
      leadsQuery = ctx.db
        .query("leads")
        .withIndex("by_function_active", (q) => 
          q.eq("functionGroup", functionGroups[0]).eq("isActive", true)
        );
    } else {
      // Fallback to active leads index
      leadsQuery = ctx.db
        .query("leads")
        .withIndex("by_active_updated", (q) => q.eq("isActive", true));
    }

    // Get paginated results
    const result = await leadsQuery.paginate({
      numItems: pageSize,
      cursor: cursor || null,
    });

    console.log(`📄 Retrieved ${result.page.length} leads in this page`);

    // Pre-fetch companies for this batch to reduce individual DB calls
    const companyIds = [...new Set(result.page.map(lead => lead.companyId).filter(Boolean))];
    console.log(`🏢 Fetching ${companyIds.length} unique companies`);
    
    const companies = await Promise.all(
      companyIds.map(async (id) => {
        try {
          return await ctx.db.get(id);
        } catch {
          return null;
        }
      })
    );
    
    const companyMap = new Map();
    companies.forEach((company, index) => {
      if (company) {
        companyMap.set(companyIds[index], company);
      }
    });

    // Memory-safe batch check for existing contacts
    const leadIds = result.page.map(lead => lead._id);
    const existingContactIds = new Set();
    
    // Process in smaller chunks to avoid memory issues
    const CONTACT_CHECK_BATCH_SIZE = 20;
    for (let i = 0; i < leadIds.length; i += CONTACT_CHECK_BATCH_SIZE) {
      const batchIds = leadIds.slice(i, i + CONTACT_CHECK_BATCH_SIZE);
      
      if (batchIds.length > 0) {
        const batchContacts = await ctx.db
          .query("contacts")
          .filter((q) => q.or(...batchIds.map(id => q.eq(q.field("leadId"), id))))
          .collect();
        
        batchContacts.forEach(contact => existingContactIds.add(contact.leadId));
      }
    }

    console.log(`❌ Found ${existingContactIds.size} leads already as contacts`);

    // Filter leads efficiently
    const filteredLeads = [];
    
    for (let i = 0; i < result.page.length; i++) {
      const lead = result.page[i];
      
      // Skip if already a contact
      if (existingContactIds.has(lead._id)) continue;

      // Function group check (if not using indexed query)
      if (functionGroups && functionGroups.length > 1) {
        if (!lead.functionGroup || !functionGroups.includes(lead.functionGroup)) {
          continue;
        }
      }

      // Country check
      if (countries && countries.length > 0) {
        if (!lead.country || !countries.includes(lead.country)) {
          continue;
        }
      }

      // Get company from pre-fetched map
      const company = lead.companyId ? companyMap.get(lead.companyId) : null;
      
      // Company must exist and be fully enriched
      if (!company?.fullEnrichment) continue;

      // Industry check
      if (industries && industries.length > 0) {
        if (!company.industryLabel || !industries.includes(company.industryLabel)) {
          continue;
        }
      }

      // Employee count check
      if (minEmployeeCount || maxEmployeeCount) {
        if (!company.companySize) continue;
        
        const min = minEmployeeCount || 1;
        const max = maxEmployeeCount || 100000;
        if (company.companySize < min || company.companySize > max) {
          continue;
        }
      }

      // Add to results
      filteredLeads.push({
        leadId: lead._id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        jobTitle: lead.jobTitle,
        functionGroup: lead.functionGroup,
        companyName: company.name,
        industry: company.industryLabel,
        employeeCount: company.companySize,
        country: lead.country,
        city: lead.city,
        timesConverted: lead.totalTimesContacted || 0,
        addedAt: lead.addedAt || 0,
        leadScore: lead.leadScore || 0,
      });
    }

    // Sort by least converted
    filteredLeads.sort((a, b) => a.timesConverted - b.timesConverted);

    console.log(`✅ Filtered to ${filteredLeads.length} valid leads`);

    return {
      leads: filteredLeads,
      nextCursor: result.continueCursor,
      hasMore: !result.isDone,
      totalProcessed: result.page.length,
    };
  },
});

/**
 * BULK CONVERSION - BATCH PROCESSING
 * 
 * Converts leads in smaller batches to avoid memory limits
 */
export const convertLeadsBatch = mutation({
  args: {
    leadIds: v.array(v.id("leads")),
    clientIdentifier: v.string(),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    convertedCount: v.number(),
    skippedCount: v.number(),
    errors: v.array(v.string()),
    processedBatches: v.number(),
    convertedContacts: v.array(v.object({
      contactId: v.id("contacts"),
      leadId: v.id("leads"),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      email: v.optional(v.string()),
      companyName: v.optional(v.string()),
    })),
  }),
  handler: async (ctx, args) => {
    const { leadIds, clientIdentifier, batchSize = 50 } = args;

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
      throw new Error(`Client with identifier ${clientIdentifier} does not exist`);
    }

    const results = {
      success: true,
      convertedCount: 0,
      skippedCount: 0,
      errors: [] as string[],
      processedBatches: 0,
      convertedContacts: [] as any[],
    };

    console.log(`🔄 Converting ${leadIds.length} leads in batches of ${batchSize}`);

    // Process in smaller batches
    for (let i = 0; i < leadIds.length; i += batchSize) {
      const batch = leadIds.slice(i, i + batchSize);
      results.processedBatches++;
      
      console.log(`📦 Processing batch ${results.processedBatches}: ${batch.length} leads`);

      // Process this batch
      for (const leadId of batch) {
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
            results.errors.push(`Lead ${lead.email || leadId} already a contact`);
            results.skippedCount++;
            continue;
          }

          // Get company
          let company = null;
          if (lead.companyId) {
            company = await ctx.db.get(lead.companyId);
          }

          if (!company?.fullEnrichment) {
            results.errors.push(`Lead ${lead.email || leadId} - company not enriched`);
            results.skippedCount++;
            continue;
          }

          // Create contact
          const contactId = await ctx.db.insert("contacts", {
            leadId: leadId,
            clientId: client._id,
            companyId: lead.companyId,
            purchasedAt: Date.now(),
            status: "cold",

            // Lead data
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            mobilePhone: lead.mobilePhone,
            linkedinUrl: lead.linkedinUrl,
            jobTitle: lead.jobTitle,
            functionGroup: lead.functionGroup,

            // Company data
            name: company.name,
            website: company.website,
            companyLinkedinUrl: company.companyLinkedinUrl,
            industryLabel: company.industryLabel,
            subindustryLabel: company.subindustryLabel,
            companySummary: company.companySummary,
            shortCompanySummary: company.shortCompanySummary,
          });

          // Update lead counter
          await ctx.db.patch(leadId, {
            totalTimesContacted: (lead.totalTimesContacted || 0) + 1,
            lastGlobalContactAt: Date.now(),
          });

          results.convertedContacts.push({
            contactId,
            leadId,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            companyName: company.name,
          });

          results.convertedCount++;

        } catch (error) {
          results.errors.push(`Failed to convert lead ${leadId}: ${error.message}`);
          results.skippedCount++;
        }
      }
    }

    if (results.errors.length > 0) {
      results.success = false;
    }

    console.log(`✅ Conversion complete: ${results.convertedCount} converted, ${results.skippedCount} skipped in ${results.processedBatches} batches`);
    
    return results;
  },
});