import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { MemoryUtils } from "../utils/memoryOptimized";
import { createBatchProcessor } from "../utils/batchProcessor";

/**
 * 🚀 STREAMING LEAD CONVERSION
 * 
 * Memory-safe lead conversion with streaming approach
 * Replaces the old leadConversionView with better performance
 */

// ===============================
// STREAMING LEAD DISCOVERY
// ===============================

/**
 * Stream available leads for conversion with cursor-based pagination
 * ALIGNED WITH SMART CONVERSION MODAL LOGIC (leadSearch:searchLeadsPaginated)
 */
export const streamAvailableLeads = query({
  args: {
    clientIdentifier: v.string(),
    filters: v.optional(v.object({
      functionGroups: v.optional(v.array(v.string())),
      industries: v.optional(v.array(v.string())),
      countries: v.optional(v.array(v.string())),
      minEmployeeCount: v.optional(v.number()),
      maxEmployeeCount: v.optional(v.number()),
    })),
    ...MemoryUtils.validation.paginationArgs,
  },
  handler: async (ctx, args) => {
    const { clientIdentifier, filters = {} } = args;
    const { cursor, limit } = MemoryUtils.sanitizePaginationArgs(args, { maxLimit: 25 }); // Same conservative limit as smart conversion
    
    console.log(`🎯 Streaming leads using SMART CONVERSION logic (client: ${clientIdentifier}, limit: ${limit})`);
    
    // Find client (same logic as smart conversion)
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
      return {
        page: [],
        isDone: true,
        continueCursor: null,
        _metadata: { error: `Client with identifier ${clientIdentifier} does not exist` },
      };
    }
    
    // EXACT SAME INDEX STRATEGY as smart conversion modal
    let leadsQuery;
    
    // Use the most selective index available (same as smart conversion)
    if (filters.functionGroups && filters.functionGroups.length === 1) {
      // Use function group index for maximum efficiency
      leadsQuery = ctx.db
        .query("leads")
        .withIndex("by_function_active", (q) => 
          q.eq("functionGroup", filters.functionGroups[0]).eq("isActive", true)
        );
    } else {
      // Fallback to active leads index
      leadsQuery = ctx.db
        .query("leads")
        .withIndex("by_active_updated", (q) => q.eq("isActive", true));
    }

    // Get paginated results (same as smart conversion)
    const result = await leadsQuery.paginate({
      numItems: limit,
      cursor: cursor || null,
    });

    console.log(`📄 Retrieved ${result.page.length} leads in this page`);

    // Pre-fetch companies for this batch (same approach as smart conversion)
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

    // EXACT SAME MEMORY-SAFE BATCH CONTACT CHECKING as smart conversion
    const leadIds = result.page.map(lead => lead._id);
    const existingContactIds = new Set();
    
    // Process in smaller chunks to avoid memory issues (same batch size as smart conversion)
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

    // EXACT SAME FILTERING LOGIC as smart conversion modal
    const filteredLeads = [];
    
    for (let i = 0; i < result.page.length; i++) {
      const lead = result.page[i];
      
      // Skip if already a contact (same check as smart conversion)
      if (existingContactIds.has(lead._id)) continue;

      // Function group check (if not using indexed query) - same logic as smart conversion
      if (filters.functionGroups && filters.functionGroups.length > 1) {
        if (!lead.functionGroup || !filters.functionGroups.includes(lead.functionGroup)) {
          continue;
        }
      }

      // Country check (same as smart conversion)
      if (filters.countries && filters.countries.length > 0) {
        if (!lead.country || !filters.countries.includes(lead.country)) {
          continue;
        }
      }

      // Get company from pre-fetched map (same approach as smart conversion)
      const company = lead.companyId ? companyMap.get(lead.companyId) : null;
      
      // CRITICAL: Company must exist and be fully enriched (same validation as smart conversion)
      if (!company?.fullEnrichment) continue;

      // Industry check (same as smart conversion)
      if (filters.industries && filters.industries.length > 0) {
        if (!company.industryLabel || !filters.industries.includes(company.industryLabel)) {
          continue;
        }
      }

      // Employee count check (same logic as smart conversion)
      if (filters.minEmployeeCount || filters.maxEmployeeCount) {
        if (!company.companySize) continue;
        
        const min = filters.minEmployeeCount || 1;
        const max = filters.maxEmployeeCount || 100000;
        if (company.companySize < min || company.companySize > max) {
          continue;
        }
      }

      // Add to results with SAME STRUCTURE as smart conversion
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

    // EXACT SAME SORTING as smart conversion: by least converted first
    filteredLeads.sort((a, b) => a.timesConverted - b.timesConverted);

    console.log(`✅ Filtered to ${filteredLeads.length} valid leads using SMART CONVERSION logic`);
    
    return {
      page: filteredLeads,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
      _metadata: {
        totalProcessed: result.page.length,
        availableAfterFiltering: filteredLeads.length,
        existingContacts: existingContactIds.size,
        companiesChecked: companyIds.length,
        logicSource: "aligned_with_smart_conversion_modal",
      },
    };
  },
});

// ===============================
// BATCH LEAD CONVERSION
// ===============================

/**
 * Convert leads to contacts in memory-safe batches
 */
export const batchConvertLeads = mutation({
  args: {
    clientIdentifier: v.string(),
    leadIds: v.array(v.id("leads")),
    batchSize: v.optional(v.number()),
    continueOnError: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    processed: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
    totalTimeMs: v.number(),
    batches: v.number(),
  }),
  handler: async (ctx, args) => {
    const { clientIdentifier, leadIds, batchSize = 15, continueOnError = true } = args;
    
    console.log(`🔄 Batch converting ${leadIds.length} leads to contacts (batch size: ${batchSize})`);
    
    const startTime = Date.now();
    
    // Find client first
    let client;
    try {
      client = await ctx.db.get(clientIdentifier as any);
    } catch {
      client = await ctx.db
        .query("clients")
        .filter((q) => q.eq(q.field("domain"), clientIdentifier))
        .first();
    }
    
    if (!client) {
      return {
        success: false,
        processed: 0,
        failed: leadIds.length,
        errors: [`Client with identifier ${clientIdentifier} not found`],
        totalTimeMs: Date.now() - startTime,
        batches: 0,
      };
    }
    
    // Process leads in memory-safe batches
    const batches = MemoryUtils.chunk(leadIds, batchSize);
    let totalProcessed = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];
    
    console.log(`📦 Processing ${batches.length} batches of ~${Math.round(leadIds.length / batches.length)} leads each`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batchIds = batches[batchIndex];
      
      console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batchIds.length} leads)`);
      
      try {
        // Get all leads and companies for this batch (parallel fetching)
        const [leads, existingContacts] = await Promise.all([
          // Get leads
          Promise.all(
            batchIds.map(async (id) => {
              try {
                return await ctx.db.get(id);
              } catch {
                return null;
              }
            })
          ),
          // Check for existing contacts
          ctx.db
            .query("contacts")
            .filter((q) => q.and(
              q.eq(q.field("clientId"), client._id),
              q.or(...batchIds.map(id => q.eq(q.field("leadId"), id)))
            ))
            .collect()
        ]);
        
        const validLeads = leads.filter(Boolean);
        const existingContactLeadIds = new Set(existingContacts.map(c => c.leadId));
        const companyIds = [...new Set(validLeads.map(lead => lead!.companyId).filter(Boolean))];
        
        // Get companies for this batch
        const companies = await Promise.all(
          companyIds.map(async (id) => {
            try {
              return await ctx.db.get(id!);
            } catch {
              return null;
            }
          })
        );
        
        const companiesMap = new Map(companies.filter(Boolean).map(c => [c!._id, c!]));
        
        // Process each lead in this batch
        let batchProcessed = 0;
        let batchFailed = 0;
        
        for (const lead of validLeads) {
          if (!lead) {
            batchFailed++;
            allErrors.push(`Lead not found in batch ${batchIndex + 1}`);
            continue;
          }
          
          try {
            // Skip if already a contact
            if (existingContactLeadIds.has(lead._id)) {
              batchFailed++;
              continue;
            }
            
            const company = lead.companyId ? companiesMap.get(lead.companyId) : null;
            if (!company) {
              batchFailed++;
              allErrors.push(`Company for lead ${lead._id} not found`);
              continue;
            }
            
            // Create contact with denormalized data
            await ctx.db.insert("contacts", {
              leadId: lead._id,
              clientId: client._id,
              companyId: company._id,
              purchasedAt: Date.now(),
              status: "cold",
              
              // Lead data (only essential fields)
              firstName: lead.firstName,
              lastName: lead.lastName,
              email: lead.email,
              mobilePhone: lead.mobilePhone,
              linkedinUrl: lead.linkedinUrl,
              jobTitle: lead.jobTitle,
              functionGroup: lead.functionGroup,
              
              // Company data (only essential fields)
              name: company.name,
              website: company.website,
              companyLinkedinUrl: company.companyLinkedinUrl,
              industryLabel: company.industryLabel,
              subindustryLabel: company.subindustryLabel,
              companySummary: company.companySummary,
              shortCompanySummary: company.shortCompanySummary,
            });
            
            batchProcessed++;
            
          } catch (error) {
            batchFailed++;
            allErrors.push(`Conversion failed for lead ${lead._id}: ${error.message}`);
            
            if (!continueOnError) {
              throw error;
            }
          }
        }
        
        totalProcessed += batchProcessed;
        totalFailed += batchFailed;
        
        console.log(`✅ Batch ${batchIndex + 1} complete: ${batchProcessed} converted, ${batchFailed} failed`);
        
        // Note: Removed setTimeout as it's not allowed in mutations
        // Memory relief is handled by smaller batch sizes instead
        
      } catch (error) {
        console.error(`❌ Batch ${batchIndex + 1} failed:`, error);
        totalFailed += batchIds.length;
        allErrors.push(`Batch ${batchIndex + 1}: ${error.message}`);
        
        if (!continueOnError) {
          break;
        }
      }
    }
    
    const totalTimeMs = Date.now() - startTime;
    console.log(`✅ Batch conversion complete: ${totalProcessed} processed, ${totalFailed} failed in ${totalTimeMs}ms`);
    
    return {
      success: totalProcessed > 0,
      processed: totalProcessed,
      failed: totalFailed,
      errors: allErrors,
      totalTimeMs,
      batches: batches.length,
    };
  },
});

// ===============================
// CONVERSION ORCHESTRATOR
// ===============================

/**
 * Orchestrate the complete conversion process with streaming
 */
export const streamingBulkConvert = mutation({
  args: {
    clientIdentifier: v.string(),
    dailyLimit: v.number(),
    filters: v.optional(v.object({
      functionGroups: v.optional(v.array(v.string())),
      industries: v.optional(v.array(v.string())),
      countries: v.optional(v.array(v.string())),
      minEmployeeCount: v.optional(v.number()),
      maxEmployeeCount: v.optional(v.number()),
    })),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    totalFound: v.number(),
    processed: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
    totalTimeMs: v.number(),
    searchPasses: v.number(),
    _metrics: v.any(),
  }),
  handler: async (ctx, args) => {
    const { clientIdentifier, dailyLimit, filters = {}, batchSize = 20 } = args;
    
    console.log(`🚀 Starting streaming bulk convert for ${clientIdentifier} (limit: ${dailyLimit})`);
    
    const startTime = Date.now();
    const allLeadIds: string[] = [];
    let searchPasses = 0;
    let cursor: string | null = null;
    let isDone = false;
    
    // Phase 1: Stream and collect lead IDs
    while (!isDone && allLeadIds.length < dailyLimit) {
      searchPasses++;
      const remainingNeeded = dailyLimit - allLeadIds.length;
      const pageSize = Math.min(remainingNeeded, 100);
      
      console.log(`🔍 Search pass ${searchPasses}: looking for ${pageSize} leads (total needed: ${remainingNeeded})`);
      
      const searchResult = await ctx.runQuery("leadConversion/streamingConversion:streamAvailableLeads", {
        clientIdentifier,
        filters,
        ...(cursor ? { cursor } : {}), // Only include cursor if it's not null
        limit: pageSize,
      });
      
      const foundLeadIds = searchResult.page.map(lead => lead.leadId);
      allLeadIds.push(...foundLeadIds);
      
      cursor = searchResult.continueCursor;
      isDone = searchResult.isDone || foundLeadIds.length === 0;
      
      console.log(`📋 Pass ${searchPasses}: found ${foundLeadIds.length} leads (total: ${allLeadIds.length})`);
      
      // Safety break to avoid infinite loops
      if (searchPasses >= 10) {
        console.log(`⚠️ Maximum search passes reached (${searchPasses})`);
        break;
      }
    }
    
    console.log(`✅ Lead discovery complete: ${allLeadIds.length} leads found in ${searchPasses} passes`);
    
    // Phase 2: Convert leads in batches
    let totalProcessed = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];
    
    if (allLeadIds.length > 0) {
      const conversionResult = await ctx.runMutation("leadConversion/streamingConversion:batchConvertLeads", {
        clientIdentifier,
        leadIds: allLeadIds,
        batchSize,
        continueOnError: true,
      });
      
      totalProcessed = conversionResult.processed;
      totalFailed = conversionResult.failed;
      allErrors.push(...conversionResult.errors);
    }
    
    const totalTimeMs = Date.now() - startTime;
    
    // Comprehensive metrics
    const metrics = {
      searchPasses,
      leadsDiscovered: allLeadIds.length,
      conversionRate: allLeadIds.length > 0 ? (totalProcessed / allLeadIds.length * 100).toFixed(1) + '%' : '0%',
      avgLeadsPerPass: searchPasses > 0 ? Math.round(allLeadIds.length / searchPasses) : 0,
      searchTimeMs: Math.round(totalTimeMs * 0.3), // Rough estimate
      conversionTimeMs: Math.round(totalTimeMs * 0.7),
      batchSize,
      dailyLimit,
      filtersApplied: Object.keys(filters).length,
    };
    
    console.log(`🎯 Streaming bulk convert complete:`, JSON.stringify(metrics, null, 2));
    
    return {
      success: totalProcessed > 0,
      totalFound: allLeadIds.length,
      processed: totalProcessed,
      failed: totalFailed,
      errors: allErrors,
      totalTimeMs,
      searchPasses,
      _metrics: metrics,
    };
  },
});

export default {
  streamAvailableLeads,
  batchConvertLeads,
  streamingBulkConvert,
};