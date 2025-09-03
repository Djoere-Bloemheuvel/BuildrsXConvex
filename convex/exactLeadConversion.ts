import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * SIMPLIFIED EXACT LEAD CONVERSION SYSTEM
 * 
 * Simple approach: Just check specific leads, don't search through everything
 */

export const getExactMatchLeads = mutation({
  args: {
    functionGroups: v.optional(v.array(v.string())),
    industries: v.optional(v.array(v.string())),
    countries: v.optional(v.array(v.string())),
    minEmployeeCount: v.optional(v.number()),
    maxEmployeeCount: v.optional(v.number()),
    maxResults: v.optional(v.number()),
    clientIdentifier: v.string(),
  },
  returns: v.object({
    totalMatches: v.number(),
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
  }),
  handler: async (ctx, args) => {
    const { 
      functionGroups, 
      industries, 
      countries, 
      minEmployeeCount, 
      maxEmployeeCount, 
      maxResults = 100,
      clientIdentifier 
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

    console.log(`🎯 Smart lead search: First get enriched companies, then their leads`);

    // SMART APPROACH: First get companies that match our criteria with full enrichment
    let companiesQuery = ctx.db
      .query("companies")
      .withIndex("by_enrichment", (q) => q.eq("fullEnrichment", true));
      
    // Apply industry filter at company level if specified
    if (industries && industries.length > 0) {
      companiesQuery = companiesQuery.filter((q) => 
        q.or(...industries.map(industry => q.eq(q.field("industryLabel"), industry)))
      );
    }
    
    // Apply employee count filter at company level if specified
    if (minEmployeeCount || maxEmployeeCount) {
      const min = minEmployeeCount || 1;
      const max = maxEmployeeCount || 100000;
      companiesQuery = companiesQuery.filter((q) => 
        q.and(
          q.gte(q.field("companySize"), min),
          q.lte(q.field("companySize"), max)
        )
      );
    }

    // Get a smaller, more selective number of enriched companies to avoid memory limit
    const enrichedCompanies = await companiesQuery.take(Math.min(maxResults, 20)); // Limit to max 20 companies
    const companyIds = enrichedCompanies.map(c => c._id);
    
    console.log(`📋 Found ${enrichedCompanies.length} enriched companies matching criteria`);
    
    if (companyIds.length === 0) {
      return {
        totalMatches: 0,
        leads: [],
      };
    }

    // Now get leads from these companies only
    let leadsQuery = ctx.db.query("leads").filter((q) => 
      q.and(
        q.eq(q.field("isActive"), true),
        q.or(...companyIds.map(id => q.eq(q.field("companyId"), id)))
      )
    );
    
    // Use indexed query if we have specific function group
    if (functionGroups && functionGroups.length === 1) {
      leadsQuery = ctx.db
        .query("leads")
        .withIndex("by_function_group", (q) => q.eq("functionGroup", functionGroups[0]))
        .filter((q) => q.or(...companyIds.map(id => q.eq(q.field("companyId"), id))));
    }

    // Get leads from these pre-filtered companies - limit to avoid memory issues
    const leads = await leadsQuery.take(Math.min(maxResults * 2, 50)); // More conservative limit
    
    console.log(`📋 Retrieved ${leads.length} leads from enriched companies`);

    // Create company map for quick lookup (since we already filtered them)
    const companyMap = new Map(enrichedCompanies.map(c => [c._id, c]));

    // Batch check for existing contacts with smaller batches to avoid memory limit
    const leadIds = leads.map(lead => lead._id);
    const existingContactLeadIds = new Set();
    
    // Process in smaller batches to avoid memory limit
    for (let i = 0; i < leadIds.length; i += 10) {
      const batchIds = leadIds.slice(i, i + 10);
      const batchContacts = await ctx.db
        .query("contacts")
        .filter((q) => q.or(...batchIds.map(id => q.eq(q.field("leadId"), id))))
        .collect();
      
      batchContacts.forEach(c => existingContactLeadIds.add(c.leadId));
    }

    // Simple filtering - most work already done at company level
    const matches = [];
    for (const lead of leads) {
      if (matches.length >= maxResults) break;

      // Skip if already a contact - use batch check
      if (existingContactLeadIds.has(lead._id)) continue;

      // Function group check (only if we didn't use indexed query)
      if (functionGroups && functionGroups.length > 0) {
        if (!lead.functionGroup || !functionGroups.includes(lead.functionGroup)) {
          continue;
        }
      }

      // Country check (simple)
      if (countries && countries.length > 0) {
        if (!lead.country || !countries.includes(lead.country)) {
          continue;
        }
      }

      // Get company from our pre-filtered map
      const company = lead.companyId ? companyMap.get(lead.companyId) : null;
      
      // Company should already be enriched and match criteria, but double-check
      if (!company) continue;

      // Add to matches
      matches.push({
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

    console.log(`✅ Found ${matches.length} exact matches`);

    // Simple sort by least converted
    matches.sort((a, b) => a.timesConverted - b.timesConverted);

    return {
      totalMatches: matches.length,
      leads: matches,
    };
  },
});

export const convertExactMatchLeads = mutation({
  args: {
    leadIds: v.array(v.id("leads")),
    clientIdentifier: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    convertedCount: v.number(),
    skippedCount: v.number(),
    errors: v.array(v.string()),
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
    const { leadIds, clientIdentifier } = args;

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
      convertedContacts: [] as any[],
    };

    console.log(`🔄 Converting ${leadIds.length} leads for ${client.name}`);

    // Process each lead - simple and direct
    for (const leadId of leadIds) {
      try {
        const lead = await ctx.db.get(leadId);
        if (!lead) {
          results.errors.push(`Lead ${leadId} not found`);
          results.skippedCount++;
          continue;
        }

        // Quick check if already a contact
        const existingContact = await ctx.db
          .query("contacts")
          .filter((q) => q.eq(q.field("leadId"), leadId))
          .first();

        if (existingContact) {
          results.errors.push(`Lead ${lead.email || leadId} is already a contact`);
          results.skippedCount++;
          continue;
        }

        // Get company
        let company = null;
        if (lead.companyId) {
          company = await ctx.db.get(lead.companyId);
        }

        if (!company?.fullEnrichment) {
          results.errors.push(`Lead ${lead.email || leadId} - company not fully enriched`);
          results.skippedCount++;
          continue;
        }

        // Create contact - simple
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

    if (results.errors.length > 0) {
      results.success = false;
    }

    console.log(`✅ Conversion complete: ${results.convertedCount} converted, ${results.skippedCount} skipped`);
    
    return results;
  },
});