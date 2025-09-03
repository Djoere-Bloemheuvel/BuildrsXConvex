import { v } from "convex/values";
import { query } from "../_generated/server";
import { MemoryUtils } from "../utils/memoryOptimized";

/**
 * 🏢 MEMORY-SAFE COMPANY QUERIES
 * 
 * Paginated company queries with intelligent field selection
 * Optimized for large datasets with enrichment data
 */

// ===============================
// CORE COMPANY FIELDS FOR MEMORY EFFICIENCY
// ===============================

const COMPANY_CORE_FIELDS = [
  "_id", "_creationTime", "name", "domain", "website", 
  "industryLabel", "subindustryLabel", "companySize", "fullEnrichment"
] as const;

const COMPANY_DETAILED_FIELDS = [
  ...COMPANY_CORE_FIELDS,
  "companySummary", "shortCompanySummary", "companyKeywords",
  "companyLinkedinUrl", "country", "city", "state", "lastUpdatedAt"
] as const;

const COMPANY_ENRICHMENT_FIELDS = [
  ...COMPANY_DETAILED_FIELDS,
  "companyCommonProblems", "companyTargetCustomers", 
  "companyUniqueCharacteristics", "companyUniqueQualities", "companyTechnologies"
] as const;

// ===============================
// PAGINATED COMPANY QUERIES
// ===============================

/**
 * Get paginated companies with enrichment status filter
 */
export const paginatedByEnrichment = query({
  args: {
    enrichmentStatus: v.optional(v.union(v.literal("enriched"), v.literal("not_enriched"), v.literal("all"))),
    ...MemoryUtils.validation.paginationArgs,
    detailed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { enrichmentStatus = "all", detailed = false } = args;
    const { cursor, limit } = MemoryUtils.sanitizePaginationArgs(args);
    
    console.log(`📊 Fetching paginated companies (enrichment: ${enrichmentStatus}, limit: ${limit})`);
    
    let query = ctx.db.query("companies");
    
    // Apply enrichment filter
    if (enrichmentStatus === "enriched") {
      query = query.withIndex("by_enrichment", (q) => q.eq("fullEnrichment", true));
    } else if (enrichmentStatus === "not_enriched") {
      query = query.withIndex("by_enrichment", (q) => q.eq("fullEnrichment", false));
    }
    
    const result = await query
      .order("desc")
      .paginate({ cursor, numItems: limit });
    
    // Select appropriate fields based on detail level
    const fieldsToSelect = detailed ? COMPANY_DETAILED_FIELDS : COMPANY_CORE_FIELDS;
    result.page = result.page.map(company => MemoryUtils.selectFields(company, fieldsToSelect as any));
    
    const memoryEstimate = MemoryUtils.Monitor.estimateArraySize(result.page);
    console.log(`✅ Retrieved ${result.page.length} companies (~${Math.round(memoryEstimate / 1024)}KB)`);
    
    return {
      ...result,
      _metadata: {
        memoryEstimate,
        fieldsSelected: fieldsToSelect.length,
        enrichmentFilter: enrichmentStatus,
      },
    };
  },
});

/**
 * Search companies with filters and pagination
 */
export const searchPaginated = query({
  args: {
    ...MemoryUtils.validation.paginationArgs,
    filters: v.optional(v.object({
      industries: v.optional(v.array(v.string())),
      countries: v.optional(v.array(v.string())),
      minEmployeeCount: v.optional(v.number()),
      maxEmployeeCount: v.optional(v.number()),
      hasEnrichment: v.optional(v.boolean()),
      hasDomain: v.optional(v.boolean()),
    })),
    searchTerm: v.optional(v.string()),
    detailed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { filters = {}, searchTerm, detailed = false } = args;
    const { cursor, limit } = MemoryUtils.sanitizePaginationArgs(args);
    
    console.log(`🔍 Searching companies with filters (limit: ${limit})`);
    
    let query = ctx.db.query("companies");
    
    // Apply enrichment filter first (most selective)
    if (filters.hasEnrichment !== undefined) {
      query = query.withIndex("by_enrichment", (q) => q.eq("fullEnrichment", filters.hasEnrichment));
    }
    
    // Apply other filters
    if (filters.industries && filters.industries.length > 0) {
      query = query.filter((q) => 
        q.or(...filters.industries!.map(industry => q.eq(q.field("industryLabel"), industry)))
      );
    }
    
    if (filters.countries && filters.countries.length > 0) {
      query = query.filter((q) => 
        q.or(...filters.countries!.map(country => q.eq(q.field("country"), country)))
      );
    }
    
    if (filters.minEmployeeCount) {
      query = query.filter((q) => q.gte(q.field("companySize"), filters.minEmployeeCount!));
    }
    
    if (filters.maxEmployeeCount) {
      query = query.filter((q) => q.lte(q.field("companySize"), filters.maxEmployeeCount!));
    }
    
    if (filters.hasDomain) {
      query = query.filter((q) => q.neq(q.field("domain"), undefined));
    }
    
    const result = await query
      .order("desc")
      .paginate({ cursor, numItems: limit });
    
    // Apply text search if provided
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result.page = result.page.filter(company => 
        company.name?.toLowerCase().includes(term) ||
        company.domain?.toLowerCase().includes(term) ||
        company.website?.toLowerCase().includes(term) ||
        company.industryLabel?.toLowerCase().includes(term)
      );
    }
    
    // Select appropriate fields
    const fieldsToSelect = detailed ? COMPANY_DETAILED_FIELDS : COMPANY_CORE_FIELDS;
    result.page = result.page.map(company => MemoryUtils.selectFields(company, fieldsToSelect as any));
    
    const memoryEstimate = MemoryUtils.Monitor.estimateArraySize(result.page);
    console.log(`✅ Found ${result.page.length} companies matching criteria (~${Math.round(memoryEstimate / 1024)}KB)`);
    
    return {
      ...result,
      _metadata: {
        memoryEstimate,
        fieldsSelected: fieldsToSelect.length,
        filtersApplied: Object.keys(filters).length,
        searchApplied: !!searchTerm,
      },
    };
  },
});

/**
 * Get companies by industry with pagination
 */
export const byIndustry = query({
  args: {
    industry: v.string(),
    ...MemoryUtils.validation.paginationArgs,
    includeLeadCounts: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { industry, includeLeadCounts = false } = args;
    const { cursor, limit } = MemoryUtils.sanitizePaginationArgs(args);
    
    console.log(`📊 Fetching companies by industry: ${industry} (limit: ${limit})`);
    
    const result = await ctx.db
      .query("companies")
      .withIndex("by_industry", (q) => q.eq("industrySlug", industry))
      .order("desc")
      .paginate({ cursor, numItems: limit });
    
    // Optimize fields
    result.page = result.page.map(company => MemoryUtils.selectFields(company, COMPANY_CORE_FIELDS as any));
    
    // Add lead counts if requested (with memory safety)
    if (includeLeadCounts && result.page.length > 0) {
      const companyIds = result.page.map(c => c._id);
      const leadChunks = MemoryUtils.chunk(companyIds, 20); // Small chunks for counting
      
      const leadCounts = new Map<string, number>();
      
      for (const chunk of leadChunks) {
        const leads = await ctx.db
          .query("leads")
          .filter((q) => 
            q.and(
              q.eq(q.field("isActive"), true),
              q.or(...chunk.map(id => q.eq(q.field("companyId"), id)))
            )
          )
          .collect();
        
        // Count leads per company
        for (const lead of leads) {
          if (lead.companyId) {
            leadCounts.set(lead.companyId, (leadCounts.get(lead.companyId) || 0) + 1);
          }
        }
      }
      
      // Attach lead counts
      result.page = result.page.map(company => ({
        ...company,
        leadCount: leadCounts.get(company._id) || 0,
      }));
    }
    
    const memoryEstimate = MemoryUtils.Monitor.estimateArraySize(result.page);
    console.log(`✅ Retrieved ${result.page.length} companies for ${industry} (~${Math.round(memoryEstimate / 1024)}KB)`);
    
    return {
      ...result,
      _metadata: {
        memoryEstimate,
        industry,
        includeLeadCounts,
      },
    };
  },
});

/**
 * Get enriched companies for lead conversion
 */
export const enrichedForConversion = query({
  args: {
    ...MemoryUtils.validation.paginationArgs,
    filters: v.optional(v.object({
      industries: v.optional(v.array(v.string())),
      minEmployeeCount: v.optional(v.number()),
      maxEmployeeCount: v.optional(v.number()),
      hasActiveLeads: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const { filters = {} } = args;
    const { cursor, limit } = MemoryUtils.sanitizePaginationArgs(args, { maxLimit: 300 });
    
    console.log(`🎯 Finding enriched companies for conversion (limit: ${limit})`);
    
    // Start with enriched companies
    let query = ctx.db
      .query("companies")
      .withIndex("by_enrichment", (q) => q.eq("fullEnrichment", true));
    
    // Apply industry filter
    if (filters.industries && filters.industries.length > 0) {
      query = query.filter((q) => 
        q.or(...filters.industries!.map(industry => q.eq(q.field("industryLabel"), industry)))
      );
    }
    
    // Apply company size filters
    if (filters.minEmployeeCount) {
      query = query.filter((q) => q.gte(q.field("companySize"), filters.minEmployeeCount!));
    }
    
    if (filters.maxEmployeeCount) {
      query = query.filter((q) => q.lte(q.field("companySize"), filters.maxEmployeeCount!));
    }
    
    const result = await query
      .order("desc")
      .paginate({ cursor, numItems: limit });
    
    console.log(`📋 Found ${result.page.length} enriched companies`);
    
    // Filter companies with active leads if requested
    if (filters.hasActiveLeads && result.page.length > 0) {
      const companyIds = result.page.map(c => c._id);
      const leadChunks = MemoryUtils.chunk(companyIds, 30);
      
      const companiesWithLeads = new Set<string>();
      
      for (const chunk of leadChunks) {
        const leads = await ctx.db
          .query("leads")
          .filter((q) => 
            q.and(
              q.eq(q.field("isActive"), true),
              q.or(...chunk.map(id => q.eq(q.field("companyId"), id)))
            )
          )
          .collect();
        
        leads.forEach(lead => {
          if (lead.companyId) {
            companiesWithLeads.add(lead.companyId);
          }
        });
      }
      
      result.page = result.page.filter(company => companiesWithLeads.has(company._id));
      console.log(`📋 Filtered to ${result.page.length} companies with active leads`);
    }
    
    // Select core fields only
    result.page = result.page.map(company => MemoryUtils.selectFields(company, COMPANY_CORE_FIELDS as any));
    
    const memoryEstimate = MemoryUtils.Monitor.estimateArraySize(result.page);
    console.log(`✅ Retrieved ${result.page.length} enriched companies (~${Math.round(memoryEstimate / 1024)}KB)`);
    
    return {
      ...result,
      _metadata: {
        memoryEstimate,
        enriched: result.page.length,
        filtersApplied: Object.keys(filters).length,
      },
    };
  },
});

/**
 * Get company statistics for dashboard
 */
export const getStats = query({
  args: {
    groupBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { groupBy = "industryLabel" } = args;
    
    console.log(`📊 Getting company statistics (groupBy: ${groupBy})`);
    
    // Get companies in chunks to avoid memory issues
    const allCompanies = await ctx.db.query("companies").collect();
    
    // Basic statistics
    const enriched = allCompanies.filter(company => company.fullEnrichment).length;
    const withDomain = allCompanies.filter(company => company.domain).length;
    const withSize = allCompanies.filter(company => company.companySize && company.companySize > 0).length;
    
    // Group statistics (memory-efficient)
    const groups: Record<string, number> = {};
    for (const company of allCompanies) {
      const groupValue = (company as any)[groupBy] || "Unknown";
      groups[groupValue] = (groups[groupValue] || 0) + 1;
    }
    
    // Size distribution
    const sizeDistribution = {
      micro: allCompanies.filter(c => (c.companySize || 0) <= 10).length,
      small: allCompanies.filter(c => (c.companySize || 0) > 10 && (c.companySize || 0) <= 50).length,
      medium: allCompanies.filter(c => (c.companySize || 0) > 50 && (c.companySize || 0) <= 250).length,
      large: allCompanies.filter(c => (c.companySize || 0) > 250).length,
    };
    
    return {
      total: allCompanies.length,
      enriched,
      enrichmentRate: Math.round((enriched / allCompanies.length) * 100),
      withDomain,
      withSize,
      groups,
      sizeDistribution,
      _metadata: {
        groupBy,
        memoryEstimate: MemoryUtils.Monitor.estimateArraySize(allCompanies),
      },
    };
  },
});

/**
 * Get company enrichment queue (companies needing enrichment)
 */
export const enrichmentQueue = query({
  args: {
    ...MemoryUtils.validation.paginationArgs,
    priorityOrder: v.optional(v.union(v.literal("size"), v.literal("domain"), v.literal("recent"))),
  },
  handler: async (ctx, args) => {
    const { priorityOrder = "recent" } = args;
    const { cursor, limit } = MemoryUtils.sanitizePaginationArgs(args);
    
    console.log(`📋 Getting enrichment queue (priority: ${priorityOrder}, limit: ${limit})`);
    
    let query = ctx.db
      .query("companies")
      .withIndex("by_enrichment", (q) => q.eq("fullEnrichment", false))
      .filter((q) => q.neq(q.field("domain"), undefined)); // Only companies with domains
    
    const result = await query
      .order("desc")
      .paginate({ cursor, numItems: limit });
    
    // Sort by priority if needed
    if (priorityOrder === "size") {
      result.page.sort((a, b) => (b.companySize || 0) - (a.companySize || 0));
    } else if (priorityOrder === "domain") {
      result.page.sort((a, b) => (a.domain || "").localeCompare(b.domain || ""));
    }
    
    // Select minimal fields for enrichment queue
    const queueFields = ["_id", "name", "domain", "website", "companySize", "industryLabel", "_creationTime"] as const;
    result.page = result.page.map(company => MemoryUtils.selectFields(company, queueFields as any));
    
    const memoryEstimate = MemoryUtils.Monitor.estimateArraySize(result.page);
    console.log(`✅ Retrieved ${result.page.length} companies for enrichment (~${Math.round(memoryEstimate / 1024)}KB)`);
    
    return {
      ...result,
      _metadata: {
        memoryEstimate,
        priorityOrder,
        queueSize: result.page.length,
      },
    };
  },
});

export default {
  paginatedByEnrichment,
  searchPaginated,
  byIndustry,
  enrichedForConversion,
  getStats,
  enrichmentQueue,
};