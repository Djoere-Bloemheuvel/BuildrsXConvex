import { v } from "convex/values";
import { query } from "../_generated/server";
import { MemoryUtils } from "../utils/memoryOptimized";

/**
 * 🎯 MEMORY-SAFE LEAD QUERIES
 * 
 * Paginated lead queries that handle large datasets efficiently
 * Optimized for performance with selective field loading
 */

// ===============================
// CORE LEAD FIELDS FOR MEMORY EFFICIENCY
// ===============================

const LEAD_CORE_FIELDS = [
  "_id", "_creationTime", "email", "firstName", "lastName", 
  "jobTitle", "functionGroup", "country", "city", "isActive", "companyId"
] as const;

const LEAD_DETAILED_FIELDS = [
  ...LEAD_CORE_FIELDS,
  "mobilePhone", "linkedinUrl", "seniority", "addedAt", "lastUpdatedAt",
  "totalTimesContacted", "globalResponseRate", "leadScore", "leadQuality"
] as const;

// ===============================
// PAGINATED LEAD QUERIES
// ===============================

/**
 * Get paginated leads by client with memory optimization
 */
export const paginatedByClient = query({
  args: {
    clientId: v.id("clients"),
    ...MemoryUtils.validation.paginationArgs,
    includeInactive: v.optional(v.boolean()),
    detailed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { clientId, includeInactive = false, detailed = false } = args;
    const { cursor, limit } = MemoryUtils.sanitizePaginationArgs(args);
    
    console.log(`📊 Fetching paginated leads for client ${clientId} (limit: ${limit}, detailed: ${detailed})`);
    
    // Build query with filtering
    let baseQuery = ctx.db.query("leads");
    
    // Add active status filter if needed
    if (!includeInactive) {
      baseQuery = baseQuery.filter((q) => q.eq(q.field("isActive"), true));
    }
    
    // Get contacts for this client to filter leads
    const clientContacts = await ctx.db
      .query("contacts")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .collect();
    
    const contactLeadIds = new Set(clientContacts.map(c => c.leadId));
    
    // Paginate leads
    const result = await baseQuery
      .order("desc")
      .paginate({ cursor, numItems: limit });
    
    // Filter and optimize fields
    const fieldsToSelect = detailed ? LEAD_DETAILED_FIELDS : LEAD_CORE_FIELDS;
    
    result.page = result.page
      .filter(lead => !contactLeadIds.has(lead._id)) // Exclude existing contacts
      .map(lead => MemoryUtils.selectFields(lead, fieldsToSelect as any));
    
    const memoryEstimate = MemoryUtils.Monitor.estimateArraySize(result.page);
    console.log(`✅ Retrieved ${result.page.length} leads (~${Math.round(memoryEstimate / 1024)}KB)`);
    
    return {
      ...result,
      _metadata: {
        memoryEstimate,
        fieldsSelected: fieldsToSelect.length,
        filtered: result.page.length,
      },
    };
  },
});

/**
 * Search leads with filters and pagination
 */
export const searchPaginated = query({
  args: {
    ...MemoryUtils.validation.paginationArgs,
    filters: v.optional(v.object({
      functionGroups: v.optional(v.array(v.string())),
      industries: v.optional(v.array(v.string())),
      countries: v.optional(v.array(v.string())),
      minEmployeeCount: v.optional(v.number()),
      maxEmployeeCount: v.optional(v.number()),
      hasEmail: v.optional(v.boolean()),
      isActive: v.optional(v.boolean()),
    })),
    searchTerm: v.optional(v.string()),
    detailed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { filters = {}, searchTerm, detailed = false } = args;
    const { cursor, limit } = MemoryUtils.sanitizePaginationArgs(args);
    
    console.log(`🔍 Searching leads with filters (limit: ${limit})`);
    
    // Start with base query
    let query = ctx.db.query("leads");
    
    // Apply filters
    if (filters.isActive !== undefined) {
      query = query.filter((q) => q.eq(q.field("isActive"), filters.isActive));
    }
    
    if (filters.functionGroups && filters.functionGroups.length > 0) {
      query = query.filter((q) => 
        q.or(...filters.functionGroups!.map(fg => q.eq(q.field("functionGroup"), fg)))
      );
    }
    
    if (filters.countries && filters.countries.length > 0) {
      query = query.filter((q) => 
        q.or(...filters.countries!.map(country => q.eq(q.field("country"), country)))
      );
    }
    
    if (filters.hasEmail) {
      query = query.filter((q) => q.neq(q.field("email"), undefined));
    }
    
    // Get paginated results
    const result = await query
      .order("desc")
      .paginate({ cursor, numItems: limit });
    
    // Apply additional filters that require company data
    if (filters.industries || filters.minEmployeeCount || filters.maxEmployeeCount) {
      const companyIds = [...new Set(result.page.map(lead => lead.companyId).filter(Boolean))];
      
      // Batch fetch companies in smaller chunks to avoid memory issues
      const companyChunks = MemoryUtils.chunk(companyIds, 50);
      const companiesMap = new Map();
      
      for (const chunk of companyChunks) {
        const companies = await Promise.all(
          chunk.map(async (id) => {
            try {
              return await ctx.db.get(id!);
            } catch {
              return null;
            }
          })
        );
        
        companies.filter(Boolean).forEach(company => {
          companiesMap.set(company!._id, company);
        });
      }
      
      // Filter leads based on company criteria
      result.page = result.page.filter(lead => {
        if (!lead.companyId) return false;
        
        const company = companiesMap.get(lead.companyId);
        if (!company) return false;
        
        // Industry filter
        if (filters.industries && filters.industries.length > 0) {
          if (!filters.industries.includes(company.industryLabel)) return false;
        }
        
        // Company size filter
        if (filters.minEmployeeCount && (company.companySize || 0) < filters.minEmployeeCount) return false;
        if (filters.maxEmployeeCount && (company.companySize || 0) > filters.maxEmployeeCount) return false;
        
        return true;
      });
    }
    
    // Apply text search if provided
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result.page = result.page.filter(lead => 
        lead.firstName?.toLowerCase().includes(term) ||
        lead.lastName?.toLowerCase().includes(term) ||
        lead.email?.toLowerCase().includes(term) ||
        lead.jobTitle?.toLowerCase().includes(term)
      );
    }
    
    // Select appropriate fields
    const fieldsToSelect = detailed ? LEAD_DETAILED_FIELDS : LEAD_CORE_FIELDS;
    result.page = result.page.map(lead => MemoryUtils.selectFields(lead, fieldsToSelect as any));
    
    const memoryEstimate = MemoryUtils.Monitor.estimateArraySize(result.page);
    console.log(`✅ Found ${result.page.length} leads matching criteria (~${Math.round(memoryEstimate / 1024)}KB)`);
    
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
 * Get leads by function group with pagination
 */
export const byFunctionGroup = query({
  args: {
    functionGroup: v.string(),
    ...MemoryUtils.validation.paginationArgs,
    includeCompanyData: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { functionGroup, includeCompanyData = false } = args;
    const { cursor, limit } = MemoryUtils.sanitizePaginationArgs(args);
    
    console.log(`📊 Fetching leads by function group: ${functionGroup} (limit: ${limit})`);
    
    const result = await ctx.db
      .query("leads")
      .withIndex("by_function_group", (q) => q.eq("functionGroup", functionGroup))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .paginate({ cursor, numItems: limit });
    
    // Optimize fields
    let fieldsToSelect = LEAD_CORE_FIELDS;
    result.page = result.page.map(lead => MemoryUtils.selectFields(lead, fieldsToSelect as any));
    
    // Add company data if requested (with memory safety)
    if (includeCompanyData && result.page.length > 0) {
      const companyIds = [...new Set(result.page.map(lead => lead.companyId).filter(Boolean))];
      const companyChunks = MemoryUtils.chunk(companyIds, 30); // Smaller chunks for companies
      
      const companiesMap = new Map();
      for (const chunk of companyChunks) {
        const companies = await Promise.all(
          chunk.map(async (id) => {
            try {
              const company = await ctx.db.get(id!);
              return company ? MemoryUtils.selectFields(company, ["_id", "name", "industryLabel", "companySize"] as any) : null;
            } catch {
              return null;
            }
          })
        );
        
        companies.filter(Boolean).forEach(company => {
          companiesMap.set(company!._id, company);
        });
      }
      
      // Attach company data
      result.page = result.page.map(lead => ({
        ...lead,
        company: lead.companyId ? companiesMap.get(lead.companyId) : null,
      }));
    }
    
    const memoryEstimate = MemoryUtils.Monitor.estimateArraySize(result.page);
    console.log(`✅ Retrieved ${result.page.length} leads for ${functionGroup} (~${Math.round(memoryEstimate / 1024)}KB)`);
    
    return {
      ...result,
      _metadata: {
        memoryEstimate,
        functionGroup,
        includeCompanyData,
      },
    };
  },
});

/**
 * Get available leads for conversion (optimized version)
 */
export const availableForConversion = query({
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
    const { cursor, limit } = MemoryUtils.sanitizePaginationArgs(args, { maxLimit: 200 });
    
    console.log(`🎯 Finding available leads for conversion (client: ${clientIdentifier}, limit: ${limit})`);
    
    // Get existing contacts for this client
    const existingContacts = await ctx.db
      .query("contacts")
      .filter((q) => q.eq(q.field("clientId"), clientIdentifier))
      .collect();
    
    const existingLeadIds = new Set(existingContacts.map(c => c.leadId));
    console.log(`📋 Found ${existingLeadIds.size} existing contacts to exclude`);
    
    // Start with enriched companies
    let companiesQuery = ctx.db
      .query("companies")
      .withIndex("by_enrichment", (q) => q.eq("fullEnrichment", true));
    
    // Apply company filters
    if (filters.industries && filters.industries.length > 0) {
      companiesQuery = companiesQuery.filter((q) => 
        q.or(...filters.industries!.map(industry => q.eq(q.field("industryLabel"), industry)))
      );
    }
    
    if (filters.minEmployeeCount || filters.maxEmployeeCount) {
      const min = filters.minEmployeeCount || 1;
      const max = filters.maxEmployeeCount || 100000;
      companiesQuery = companiesQuery.filter((q) => 
        q.and(
          q.gte(q.field("companySize"), min),
          q.lte(q.field("companySize"), max)
        )
      );
    }
    
    // Get companies in smaller batches
    const companies = await companiesQuery.take(Math.min(limit * 2, 300)); // Conservative limit
    const companyIds = companies.map(c => c._id);
    
    console.log(`📋 Found ${companies.length} enriched companies matching criteria`);
    
    if (companyIds.length === 0) {
      return {
        page: [],
        isDone: true,
        continueCursor: null,
        _metadata: { companiesFound: 0, leadsFound: 0, available: 0 },
      };
    }
    
    // Get leads from these companies with pagination
    let leadsQuery = ctx.db.query("leads");
    
    // Apply lead filters
    if (filters.functionGroups && filters.functionGroups.length > 0) {
      leadsQuery = leadsQuery.filter((q) => 
        q.or(...filters.functionGroups!.map(fg => q.eq(q.field("functionGroup"), fg)))
      );
    }
    
    if (filters.countries && filters.countries.length > 0) {
      leadsQuery = leadsQuery.filter((q) => 
        q.or(...filters.countries!.map(country => q.eq(q.field("country"), country)))
      );
    }
    
    // Filter by company IDs and active status
    leadsQuery = leadsQuery.filter((q) => 
      q.and(
        q.eq(q.field("isActive"), true),
        q.or(...companyIds.map(id => q.eq(q.field("companyId"), id)))
      )
    );
    
    const leadsResult = await leadsQuery
      .order("desc")
      .paginate({ cursor, numItems: limit });
    
    console.log(`📋 Found ${leadsResult.page.length} leads from enriched companies`);
    
    // Filter out existing contacts and optimize fields
    const availableLeads = leadsResult.page
      .filter(lead => !existingLeadIds.has(lead._id))
      .map(lead => {
        const company = companies.find(c => c._id === lead.companyId);
        return {
          leadId: lead._id,
          email: lead.email,
          firstName: lead.firstName,
          lastName: lead.lastName,
          jobTitle: lead.jobTitle,
          functionGroup: lead.functionGroup,
          country: lead.country,
          city: lead.city,
          companyId: company?._id,
          companyName: company?.name,
          companySize: company?.companySize,
          industryLabel: company?.industryLabel,
          fullEnrichment: company?.fullEnrichment,
        };
      });
    
    const memoryEstimate = MemoryUtils.Monitor.estimateArraySize(availableLeads);
    console.log(`✅ Found ${availableLeads.length} leads available for conversion (~${Math.round(memoryEstimate / 1024)}KB)`);
    
    return {
      page: availableLeads,
      isDone: leadsResult.isDone,
      continueCursor: leadsResult.continueCursor,
      _metadata: {
        memoryEstimate,
        companiesFound: companies.length,
        leadsFound: leadsResult.page.length,
        available: availableLeads.length,
        existingContacts: existingLeadIds.size,
      },
    };
  },
});

/**
 * Get lead statistics for dashboard
 */
export const getStats = query({
  args: {
    clientId: v.optional(v.id("clients")),
    groupBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { clientId, groupBy = "functionGroup" } = args;
    
    console.log(`📊 Getting lead statistics (groupBy: ${groupBy})`);
    
    // Get basic counts efficiently
    const totalLeads = await ctx.db.query("leads").collect();
    const activeLeads = totalLeads.filter(lead => lead.isActive);
    
    // Get client-specific stats if provided
    let clientContacts = 0;
    if (clientId) {
      const contacts = await ctx.db
        .query("contacts")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
      clientContacts = contacts.length;
    }
    
    // Group statistics (memory-efficient)
    const groups: Record<string, number> = {};
    for (const lead of activeLeads) {
      const groupValue = (lead as any)[groupBy] || "Unknown";
      groups[groupValue] = (groups[groupValue] || 0) + 1;
    }
    
    return {
      total: totalLeads.length,
      active: activeLeads.length,
      inactive: totalLeads.length - activeLeads.length,
      clientContacts,
      groups,
      _metadata: {
        groupBy,
        memoryEstimate: MemoryUtils.Monitor.estimateArraySize(totalLeads),
      },
    };
  },
});

export default {
  paginatedByClient,
  searchPaginated,
  byFunctionGroup,
  availableForConversion,
  getStats,
};