import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all companies with optional search
export const list = query({
  args: { 
    search: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  returns: v.array(v.object({
    _id: v.id("companies"),
    _creationTime: v.number(),
    name: v.string(),
    domain: v.optional(v.string()),
    website: v.optional(v.string()),
    industrySlug: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    companySize: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    companySummary: v.optional(v.string()),
    shortCompanySummary: v.optional(v.string()),
    companyKeywords: v.optional(v.array(v.string())),
    companyCommonProblems: v.optional(v.string()),
    companyTargetCustomers: v.optional(v.string()),
    companyUniqueCharacteristics: v.optional(v.array(v.string())),
    companyUniqueQualities: v.optional(v.string()),
    companyLinkedinUrl: v.optional(v.string()),
    companyPhone: v.optional(v.string()),
    scrapedIndustry: v.optional(v.string()),
    companyTechnologies: v.optional(v.union(v.array(v.string()), v.object({}))),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    fullEnrichment: v.optional(v.boolean()),
    lastUpdatedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    let companies = ctx.db.query("companies");
    
    if (args.search) {
      // In Convex, we'll need to use withSearchIndex for full-text search
      // For now, we'll filter by name
      companies = companies.filter((q) => 
        q.or(
          q.eq(q.field("name"), args.search),
          q.eq(q.field("domain"), args.search)
        )
      );
    }
    
    companies = companies.order("asc");
    
    if (args.limit) {
      return await companies.take(args.limit);
    }
    
    return await companies.collect();
  },
});

// Get company by ID
export const getById = query({
  args: { id: v.id("companies") },
  returns: v.union(v.object({
    _id: v.id("companies"),
    _creationTime: v.number(),
    name: v.string(),
    domain: v.optional(v.string()),
    website: v.optional(v.string()),
    industrySlug: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    companySize: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    companySummary: v.optional(v.string()),
    companyKeywords: v.optional(v.array(v.string())),
    companyCommonProblems: v.optional(v.string()),
    companyTargetCustomers: v.optional(v.string()),
    companyUniqueCharacteristics: v.optional(v.array(v.string())),
    companyUniqueQualities: v.optional(v.string()),
    companyLinkedinUrl: v.optional(v.string()),
    companyTechnologies: v.optional(v.object({})),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    fullEnrichment: v.optional(v.boolean()),
    lastUpdatedAt: v.optional(v.number()),
  }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create new company
export const create = mutation({
  args: {
    name: v.string(),
    domain: v.optional(v.string()),
    website: v.optional(v.string()),
    industrySlug: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    companySize: v.optional(v.number()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  returns: v.id("companies"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("companies", {
      ...args,
      tags: [],
      fullEnrichment: false,
      lastUpdatedAt: Date.now(),
    });
  },
});

// Update company
export const update = mutation({
  args: {
    id: v.id("companies"),
    name: v.optional(v.string()),
    domain: v.optional(v.string()),
    website: v.optional(v.string()),
    industrySlug: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    companySize: v.optional(v.number()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    companySummary: v.optional(v.string()),
    companyKeywords: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;
    
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(cleanData).length > 0) {
      await ctx.db.patch(id, {
        ...cleanData,
        lastUpdatedAt: Date.now(),
      });
    }
    
    return null;
  },
});

// Delete company
export const remove = mutation({
  args: { id: v.id("companies") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

// Get company by ID with full enrichment for details page
export const getByIdWithDetails = query({
  args: { id: v.id("companies") },
  returns: v.union(v.object({
    _id: v.id("companies"),
    _creationTime: v.number(),
    name: v.string(),
    domain: v.optional(v.string()),
    website: v.optional(v.string()),
    industrySlug: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    companySize: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    companySummary: v.optional(v.string()),
    shortCompanySummary: v.optional(v.string()),
    companyKeywords: v.optional(v.array(v.string())),
    companyCommonProblems: v.optional(v.string()),
    companyTargetCustomers: v.optional(v.string()),
    companyUniqueCharacteristics: v.optional(v.array(v.string())),
    companyUniqueQualities: v.optional(v.string()),
    companyLinkedinUrl: v.optional(v.string()),
    companyPhone: v.optional(v.string()),
    scrapedIndustry: v.optional(v.string()),
    companyTechnologies: v.optional(v.union(v.array(v.string()), v.object({}))),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    fullEnrichment: v.optional(v.boolean()),
    lastUpdatedAt: v.optional(v.number()),
  }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get contacts for a specific company
export const getContacts = query({
  args: { 
    companyId: v.id("companies"),
    clientId: v.optional(v.id("clients"))
  },
  returns: v.array(v.object({
    _id: v.id("contacts"),
    _creationTime: v.number(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    functionGroup: v.optional(v.string()),
    status: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    mobilePhone: v.optional(v.string()),
    lastCommunicationAt: v.optional(v.number()),
    // Include all potential fields from the database
    clientId: v.optional(v.id("clients")),
    companyId: v.optional(v.id("companies")),
    leadId: v.optional(v.id("leads")),
    purchasedAt: v.optional(v.number()),
    industryLabel: v.optional(v.string()),
    name: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    suggestedCampaignId: v.optional(v.id("campaigns")),
    companyLinkedinUrl: v.optional(v.string()),
    companySummary: v.optional(v.string()),
    shortCompanySummary: v.optional(v.string()),
    website: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    try {
      const contacts = await ctx.db
        .query("contacts")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .order("desc")
        .collect();

      // Enrich with lead and company data
      const enrichedContacts = await Promise.all(contacts.map(async (contact) => {
        try {
          const [lead, company] = await Promise.all([
            ctx.db.get(contact.leadId),
            ctx.db.get(contact.companyId)
          ]);
          return {
            ...contact,
            firstName: lead?.firstName,
            lastName: lead?.lastName,
            email: lead?.email,
            jobTitle: lead?.jobTitle,
            functionGroup: lead?.functionGroup,
            linkedinUrl: lead?.linkedinUrl,
            mobilePhone: lead?.mobilePhone,
            // Add company data
            companyLinkedinUrl: company?.companyLinkedinUrl,
            companySummary: company?.companySummary,
            shortCompanySummary: company?.shortCompanySummary,
            website: company?.website,
          };
        } catch (error) {
          return {
            ...contact,
            firstName: '',
            lastName: '',
            email: '',
            jobTitle: '',
            functionGroup: '',
            linkedinUrl: '',
            mobilePhone: '',
            // Provide default values for company fields
            companyLinkedinUrl: undefined,
            companySummary: undefined,
            shortCompanySummary: undefined,
            website: undefined,
          };
        }
      }));

      return enrichedContacts;
    } catch (error) {
      console.log("Error getting company contacts:", error);
      return [];
    }
  },
});

// Get deals for a specific company
export const getDeals = query({
  args: { companyId: v.id("companies") },
  returns: v.array(v.object({
    _id: v.id("deals"),
    _creationTime: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    value: v.optional(v.number()),
    currency: v.optional(v.string()),
    confidence: v.optional(v.number()),
    priority: v.optional(v.number()),
    source: v.optional(v.string()),
    closedAt: v.optional(v.number()),
    stageName: v.optional(v.string()),
    pipelineName: v.optional(v.string()),
    // Include all potential fields from the database
    clientId: v.optional(v.id("clients")),
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),
    isActive: v.optional(v.boolean()),
    isAutoCreated: v.optional(v.boolean()),
    pipelineId: v.optional(v.id("pipelines")),
    stageId: v.optional(v.id("stages")),
    propositionId: v.optional(v.id("propositions")),
  })),
  handler: async (ctx, args) => {
    try {
      const deals = await ctx.db
        .query("deals")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .order("desc")
        .collect();

      // Enrich with stage and pipeline data
      const enrichedDeals = await Promise.all(deals.map(async (deal) => {
        const [stage, pipeline] = await Promise.all([
          ctx.db.get(deal.stageId),
          ctx.db.get(deal.pipelineId)
        ]);

        return {
          ...deal,
          stageName: stage?.name,
          pipelineName: pipeline?.name,
        };
      }));

      return enrichedDeals;
    } catch (error) {
      console.log("Error getting company deals:", error);
      return [];
    }
  },
});

// Get activities/communications for a company
export const getActivities = query({
  args: { 
    companyId: v.id("companies"), 
    limit: v.optional(v.number()) 
  },
  returns: v.array(v.object({
    _id: v.id("communications"),
    _creationTime: v.number(),
    direction: v.string(),
    channel: v.string(),
    type: v.optional(v.string()),
    timestamp: v.number(),
    content: v.optional(v.string()),
    sentiment: v.optional(v.string()),
    contactName: v.optional(v.string()),
    campaignName: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    try {
      const communications = await ctx.db
        .query("communications")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .order("desc")
        .take(args.limit || 50);

      // Enrich with contact and campaign data
      const enrichedCommunications = await Promise.all(communications.map(async (comm) => {
        let contactName = undefined;
        let campaignName = undefined;

        if (comm.contactId) {
          const contact = await ctx.db.get(comm.contactId);
          if (contact) {
            const lead = await ctx.db.get(contact.leadId);
            contactName = lead ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : undefined;
          }
        }

        if (comm.campaignId) {
          const campaign = await ctx.db.get(comm.campaignId);
          campaignName = campaign?.name;
        }

        return {
          ...comm,
          contactName,
          campaignName,
        };
      }));

      return enrichedCommunications;
    } catch (error) {
      console.log("Error getting company activities:", error);
      return [];
    }
  },
});

// Get notes for a company
export const getNotes = query({
  args: { companyId: v.id("companies") },
  returns: v.array(v.object({
    _id: v.id("notes"),
    _creationTime: v.number(),
    content: v.string(),
    type: v.optional(v.string()),
    isAiGenerated: v.optional(v.boolean()),
    authorName: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    try {
      const notes = await ctx.db
        .query("notes")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .order("desc")
        .collect();

      // Enrich with author data
      const enrichedNotes = await Promise.all(notes.map(async (note) => {
        let authorName = undefined;
        if (note.authorId) {
          const author = await ctx.db.get(note.authorId);
          authorName = author?.fullName || author?.name;
        }

        return {
          ...note,
          authorName,
        };
      }));

      return enrichedNotes;
    } catch (error) {
      console.log("Notes index not found, returning empty array");
      return [];
    }
  },
});

// Get companies that have associated contacts for a specific client  
export const listWithContacts = query({
  args: { 
    clientId: v.id("clients"),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number())
  },
  returns: v.object({
    companies: v.array(v.object({
      _id: v.id("companies"),
      _creationTime: v.number(),
      name: v.string(),
      domain: v.optional(v.string()),
      website: v.optional(v.string()),
      industryLabel: v.optional(v.string()),
      subindustryLabel: v.optional(v.string()),
      companySize: v.optional(v.number()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      country: v.optional(v.string()),
      contactCount: v.number(),
      lastContactAt: v.optional(v.number()),
    })),
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 25;
      const offset = args.offset || 0;
      
      // First, get all contacts for this client to find company IDs
      const contacts = await ctx.db
        .query("contacts")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
        .collect();
      
      console.log(`Found ${contacts.length} contacts for client ${args.clientId}`);
      
      // Group contacts by company ID and get unique company IDs
      const companyStats = new Map<string, { count: number; lastContactAt: number }>();
      
      contacts.forEach(contact => {
        const companyId = contact.companyId;
        const existing = companyStats.get(companyId);
        const contactTime = contact.lastCommunicationAt || contact._creationTime;
        
        if (existing) {
          companyStats.set(companyId, {
            count: existing.count + 1,
            lastContactAt: Math.max(existing.lastContactAt, contactTime)
          });
        } else {
          companyStats.set(companyId, {
            count: 1,
            lastContactAt: contactTime
          });
        }
      });
      
      const companyIds = Array.from(companyStats.keys());
      console.log(`Found ${companyIds.length} unique companies`);
      
      if (companyIds.length === 0) {
        return { companies: [], total: 0 };
      }
      
      // Get company data for each company ID with manual field selection
      const companiesWithStats: any[] = [];
      
      for (const companyId of companyIds) {
        try {
          const company = await ctx.db.get(companyId as any);
          if (!company) continue;
          
          const stats = companyStats.get(companyId);
          
          // Apply search filter if provided
          if (args.search) {
            const searchLower = args.search.toLowerCase();
            const nameMatch = company.name?.toLowerCase().includes(searchLower);
            const domainMatch = company.domain?.toLowerCase().includes(searchLower);
            const industryMatch = company.industryLabel?.toLowerCase().includes(searchLower);
            
            if (!nameMatch && !domainMatch && !industryMatch) {
              continue;
            }
          }
          
          // Only include fields we need
          companiesWithStats.push({
            _id: company._id,
            _creationTime: company._creationTime,
            name: company.name || 'Unknown Company',
            domain: company.domain || undefined,
            website: company.website || undefined,
            industryLabel: company.industryLabel || undefined,
            subindustryLabel: company.subindustryLabel || undefined,
            companySize: company.companySize || undefined,
            city: company.city || undefined,
            state: company.state || undefined,
            country: company.country || undefined,
            contactCount: stats?.count || 0,
            lastContactAt: stats?.lastContactAt || undefined,
          });
          
        } catch (error) {
          console.error(`Error processing company ${companyId}:`, error);
        }
      }
      
      // Sort by contact count desc
      companiesWithStats.sort((a, b) => b.contactCount - a.contactCount);
      
      const total = companiesWithStats.length;
      const paginatedCompanies = companiesWithStats.slice(offset, offset + limit);
      
      console.log(`Returning ${paginatedCompanies.length} companies of ${total} total`);
      
      return {
        companies: paginatedCompanies,
        total
      };
      
    } catch (error) {
      console.error('Error in listWithContacts:', error);
      return { companies: [], total: 0 };
    }
  },
});