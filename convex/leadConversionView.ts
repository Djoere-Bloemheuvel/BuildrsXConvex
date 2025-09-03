import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * OPTIMIZED LEAD CONVERSION VIEW
 * 
 * Direct joined approach to find available leads for conversion
 * More efficient than the complex exactLeadConversion logic
 */

export const getAvailableLeadsForConversion = mutation({
  args: {
    clientIdentifier: v.string(),
    functionGroups: v.optional(v.array(v.string())),
    industries: v.optional(v.array(v.string())),
    countries: v.optional(v.array(v.string())),
    minEmployeeCount: v.optional(v.number()),
    maxEmployeeCount: v.optional(v.number()),
    dailyLimit: v.number(),
  },
  returns: v.object({
    totalFound: v.number(),
    availableLeads: v.array(v.object({
      leadId: v.id("leads"),
      email: v.string(),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      jobTitle: v.optional(v.string()),
      functionGroup: v.optional(v.string()),
      country: v.optional(v.string()),
      city: v.optional(v.string()),
      companyId: v.id("companies"),
      companyName: v.string(),
      companySize: v.optional(v.number()),
      industryLabel: v.optional(v.string()),
      fullEnrichment: v.boolean(),
    })),
    _metrics: v.optional(v.any()), // Internal metrics for debugging
  }),
  handler: async (ctx, args) => {
    const { 
      clientIdentifier, 
      functionGroups, 
      industries, 
      countries, 
      minEmployeeCount, 
      maxEmployeeCount, 
      dailyLimit 
    } = args;

    console.log(`🎯 Finding available leads for conversion (limit: ${dailyLimit})`);

    // Dynamic limit calculation based on request size
    const isHighVolume = dailyLimit > 50;
    const isMegaVolume = dailyLimit > 200;
    
    // Much higher limits to find all available leads
    // For broad searches (empty targeting), we need to search through more data
    const hasTargeting = (functionGroups && functionGroups.length > 0) || 
                        (industries && industries.length > 0) || 
                        (countries && countries.length > 0) ||
                        minEmployeeCount || maxEmployeeCount;
    
    // If no targeting criteria, use much higher limits to find all available leads
    const companyLimit = hasTargeting 
      ? (isMegaVolume ? 100 : isHighVolume ? 200 : Math.min(dailyLimit * 2, 150))
      : (isMegaVolume ? 500 : isHighVolume ? 1000 : 2000); // Much higher for broad searches
      
    const leadMultiplier = hasTargeting ? 2.0 : 5.0; // Higher multiplier for broad searches
    const maxLeads = hasTargeting 
      ? Math.min(Math.floor(dailyLimit * leadMultiplier), 500)
      : Math.min(Math.floor(dailyLimit * leadMultiplier), 5000); // Much higher for broad searches
    
    console.log(`📊 Dynamic limits: companies=${companyLimit}, leads=${maxLeads} (volume: ${isMegaVolume ? 'mega' : isHighVolume ? 'high' : 'normal'}, targeting: ${hasTargeting ? 'specific' : 'broad'})`);

    // Step 1: Get enriched companies that match criteria
    let companiesQuery = ctx.db
      .query("companies")
      .withIndex("by_enrichment", (q) => q.eq("fullEnrichment", true));

    if (industries && industries.length > 0) {
      companiesQuery = companiesQuery.filter((q) => 
        q.or(...industries.map(industry => q.eq(q.field("industryLabel"), industry)))
      );
    }

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

    // Get companies using dynamic limit
    const companies = await companiesQuery.take(companyLimit);
    const companyIds = companies.map(c => c._id);
    
    console.log(`📋 Found ${companies.length} enriched companies matching criteria`);

    if (companyIds.length === 0) {
      return {
        totalFound: 0,
        availableLeads: [],
      };
    }

    // Step 2: Get active leads from these companies
    let leadsQuery = ctx.db.query("leads").filter((q) => 
      q.and(
        q.eq(q.field("isActive"), true),
        q.or(...companyIds.map(id => q.eq(q.field("companyId"), id)))
      )
    );

    // Apply function group filter if specified
    if (functionGroups && functionGroups.length > 0) {
      leadsQuery = leadsQuery.filter((q) => 
        q.or(...functionGroups.map(fg => q.eq(q.field("functionGroup"), fg)))
      );
    }

    // Apply country filter if specified
    if (countries && countries.length > 0) {
      leadsQuery = leadsQuery.filter((q) => 
        q.or(...countries.map(country => q.eq(q.field("country"), country)))
      );
    }

    const leads = await leadsQuery.take(maxLeads); // Dynamic limit based on volume
    console.log(`📋 Found ${leads.length} leads from enriched companies`);

    // Step 3: Batch check which leads are already contacts
    const leadIds = leads.map(lead => lead._id);
    const existingContacts = new Set();

    // Process in very small batches to avoid memory issues
    for (let i = 0; i < leadIds.length; i += 10) {
      const batchIds = leadIds.slice(i, i + 10);
      if (batchIds.length === 0) break;
      
      const batchContacts = await ctx.db
        .query("contacts")
        .filter((q) => q.or(...batchIds.map(id => q.eq(q.field("leadId"), id))))
        .collect();
      
      batchContacts.forEach(contact => existingContacts.add(contact.leadId));
    }

    console.log(`📋 Found ${existingContacts.size} leads already converted to contacts`);

    // Step 4: Create company lookup map
    const companyMap = new Map(companies.map(c => [c._id, c]));

    // Step 5: Filter and prepare final results
    const availableLeads = [];
    for (const lead of leads) {
      if (availableLeads.length >= dailyLimit) break;
      
      // Skip if already a contact
      if (existingContacts.has(lead._id)) continue;
      
      // Get company data
      const company = companyMap.get(lead.companyId);
      if (!company) continue;

      // Build result
      availableLeads.push({
        leadId: lead._id,
        email: lead.email,
        firstName: lead.firstName,
        lastName: lead.lastName,
        jobTitle: lead.jobTitle,
        functionGroup: lead.functionGroup,
        country: lead.country,
        city: lead.city,
        companyId: company._id,
        companyName: company.name,
        companySize: company.companySize,
        industryLabel: company.industryLabel,
        fullEnrichment: company.fullEnrichment,
      });
    }

    console.log(`✅ Found ${availableLeads.length} leads available for conversion`);

    // Comprehensive metrics for monitoring
    const metrics = {
      requestedLimit: dailyLimit,
      companiesFound: companies.length,
      leadsFromCompanies: leads.length,  
      alreadyContacts: existingContacts.size,
      availableLeads: availableLeads.length,
      conversionRate: leads.length > 0 ? (availableLeads.length / leads.length * 100).toFixed(1) + '%' : '0%',
      volumeLevel: isMegaVolume ? 'mega' : isHighVolume ? 'high' : 'normal',
      limitsUsed: { companies: companyLimit, leads: maxLeads },
      filteringApplied: {
        industries: industries?.length || 0,
        functionGroups: functionGroups?.length || 0,
        countries: countries?.length || 0,
        employeeRange: (minEmployeeCount || maxEmployeeCount) ? `${minEmployeeCount || 1}-${maxEmployeeCount || '∞'}` : 'all'
      }
    };

    console.log(`📊 Conversion Metrics:`, JSON.stringify(metrics, null, 2));

    return {
      totalFound: availableLeads.length,
      availableLeads,
      _metrics: metrics, // Internal metrics for debugging
    };
  }
});

/**
 * DIRECT LEAD CONVERSION
 * 
 * Convert provided lead IDs to contacts for a specific client
 */
export const convertLeadsToContacts = mutation({
  args: {
    clientIdentifier: v.string(),
    leadIds: v.array(v.id("leads")),
  },
  returns: v.object({
    success: v.boolean(),
    convertedCount: v.number(),
    skippedCount: v.number(),
    errors: v.array(v.string()),
    _metrics: v.optional(v.any()), // Internal metrics for debugging
  }),
  handler: async (ctx, args) => {
    const { clientIdentifier, leadIds } = args;

    console.log(`🔄 Converting ${leadIds.length} leads to contacts for ${clientIdentifier}`);

    // Find client
    let client;
    try {
      client = await ctx.db.get(clientIdentifier as any);
    } catch (error) {
      client = await ctx.db
        .query("clients")
        .filter((q) => q.eq(q.field("domain"), clientIdentifier))
        .first();
    }
    
    if (!client) {
      return {
        success: false,
        convertedCount: 0,
        skippedCount: 0,
        errors: [`Client with identifier ${clientIdentifier} does not exist`],
      };
    }

    let convertedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Process leads in small batches to avoid memory issues
    const BATCH_SIZE = 5; // Very small batches to stay within memory limits
    
    for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
      const batchIds = leadIds.slice(i, i + BATCH_SIZE);
      
      console.log(`🔄 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(leadIds.length/BATCH_SIZE)} (${batchIds.length} leads)`);
      
      // Get all leads in this batch
      const leads = await Promise.all(
        batchIds.map(async (leadId) => {
          try {
            const lead = await ctx.db.get(leadId);
            return lead ? { leadId, lead } : null;
          } catch (error) {
            errors.push(`Failed to fetch lead ${leadId}: ${error.message}`);
            return null;
          }
        })
      );
      
      // Get all companies for this batch
      const validLeads = leads.filter(Boolean);
      const companyIds = [...new Set(validLeads.map(item => item.lead.companyId).filter(Boolean))];
      
      const companiesMap = new Map();
      for (const companyId of companyIds) {
        try {
          const company = await ctx.db.get(companyId);
          if (company) companiesMap.set(companyId, company);
        } catch (error) {
          // Skip invalid company
        }
      }
      
      // Check existing contacts for this batch
      const existingContacts = await ctx.db
        .query("contacts")
        .filter((q) => q.and(
          q.eq(q.field("clientId"), client._id),
          q.or(...batchIds.map(id => q.eq(q.field("leadId"), id)))
        ))
        .collect();
      
      const existingContactLeadIds = new Set(existingContacts.map(c => c.leadId));
      
      // Process each lead in this batch
      for (const item of validLeads) {
        if (!item) continue;
        
        const { leadId, lead } = item;
        
        try {
          // Skip if already a contact
          if (existingContactLeadIds.has(leadId)) {
            skippedCount++;
            continue;
          }
          
          const company = companiesMap.get(lead.companyId);
          if (!company) {
            skippedCount++;
            errors.push(`Company for lead ${leadId} not found`);
            continue;
          }

          // Create contact
          await ctx.db.insert("contacts", {
            leadId: leadId,
            clientId: client._id,
            companyId: company._id,
            purchasedAt: Date.now(),
            status: "cold",
            
            // Denormalized lead data
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            mobilePhone: lead.mobilePhone,
            linkedinUrl: lead.linkedinUrl,
            jobTitle: lead.jobTitle,
            functionGroup: lead.functionGroup,
            
            // Denormalized company data
            name: company.name,
            website: company.website,
            companyLinkedinUrl: company.companyLinkedinUrl,
            industryLabel: company.industryLabel,
            subindustryLabel: company.subindustryLabel,
            companySummary: company.companySummary,
            shortCompanySummary: company.shortCompanySummary,
          });

          convertedCount++;

        } catch (error) {
          skippedCount++;
          errors.push(`Failed to convert lead ${leadId}: ${error.message}`);
        }
      }
      
      // Add small delay between batches to help with memory management
      if (i + BATCH_SIZE < leadIds.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    // Count any remaining leads that weren't processed
    const processedLeadIds = new Set();
    for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
      const batchIds = leadIds.slice(i, i + BATCH_SIZE);
      batchIds.forEach(id => processedLeadIds.add(id));
    }
    
    // Any leads not in processedLeadIds were not found/processed
    for (const leadId of leadIds) {
      if (!processedLeadIds.has(leadId)) {
        skippedCount++;
        errors.push(`Lead ${leadId} not processed`);
      }
    }

    console.log(`✅ Conversion complete: ${convertedCount} converted, ${skippedCount} skipped`);

    // Detailed metrics for monitoring
    const conversionMetrics = {
      requestedLeads: leadIds.length,
      successfulConversions: convertedCount,
      skippedConversions: skippedCount,
      errorCount: errors.length,
      successRate: leadIds.length > 0 ? (convertedCount / leadIds.length * 100).toFixed(1) + '%' : '0%',
      clientId: client._id,
      timestamp: Date.now()
    };

    console.log(`📊 Conversion Results:`, JSON.stringify(conversionMetrics, null, 2));

    return {
      success: convertedCount > 0,
      convertedCount,
      skippedCount,
      errors,
      _metrics: conversionMetrics, // Internal metrics for debugging
    };
  }
});