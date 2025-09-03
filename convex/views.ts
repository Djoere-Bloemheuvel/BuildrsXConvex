import { query } from "./_generated/server";
import { v } from "convex/values";

// ===============================
// COMPANY ENRICHED VIEWS
// ===============================

// Companies with contact count and recent activity
export const companiesWithStats = query({
  args: {
    clientId: v.optional(v.id("clients")),
    search: v.optional(v.string()),
    industryFilter: v.optional(v.string()),
    sizeMin: v.optional(v.number()),
    sizeMax: v.optional(v.number()),
    hasContacts: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("companies"),
    _creationTime: v.number(),
    name: v.string(),
    domain: v.optional(v.string()),
    website: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    companySize: v.optional(v.number()),
    // Computed fields
    contactCount: v.number(),
    activeDealsCount: v.number(),
    totalDealValue: v.number(),
    lastContactDate: v.optional(v.number()),
    lastActivityDate: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    let companies = ctx.db.query("companies");
    
    // Apply filters
    if (args.search) {
      companies = companies.filter((q) => 
        q.or(
          q.eq(q.field("name"), args.search),
          q.eq(q.field("domain"), args.search),
          q.eq(q.field("industryLabel"), args.search)
        )
      );
    }
    
    if (args.industryFilter) {
      companies = companies.filter((q) => 
        q.eq(q.field("industryLabel"), args.industryFilter)
      );
    }
    
    if (args.sizeMin !== undefined) {
      companies = companies.filter((q) => 
        q.gte(q.field("companySize"), args.sizeMin!)
      );
    }
    
    if (args.sizeMax !== undefined) {
      companies = companies.filter((q) => 
        q.lte(q.field("companySize"), args.sizeMax!)
      );
    }
    
    const companiesList = await companies.take(args.limit || 100);
    
    // Enrich with related data
    const enrichedCompanies = await Promise.all(
      companiesList.map(async (company) => {
        // Get contact count
        const contacts = await ctx.db
          .query("contacts")
          .withIndex("by_company", (q) => q.eq("companyId", company._id))
          .collect();
        
        // Get active deals
        const activeDeals = await ctx.db
          .query("deals")
          .withIndex("by_company", (q) => q.eq("companyId", company._id))
          .filter((q) => q.eq(q.field("status"), "open"))
          .collect();
        
        // Get recent communications
        const recentComms = await ctx.db
          .query("communications")
          .withIndex("by_contact", (q) => 
            // We'll need to check if any contacts belong to this company
            q.eq("contactId", contacts[0]?._id || "")
          )
          .order("desc")
          .take(1);
        
        // Get recent activities
        const recentActivity = await ctx.db
          .query("activityLog")
          .withIndex("by_company", (q) => q.eq("companyId", company._id))
          .order("desc")
          .take(1);
        
        const totalDealValue = activeDeals.reduce((sum, deal) => 
          sum + (deal.value || 0), 0);
        
        return {
          ...company,
          contactCount: contacts.length,
          activeDealsCount: activeDeals.length,
          totalDealValue,
          lastContactDate: recentComms[0]?.timestamp,
          lastActivityDate: recentActivity[0]?._creationTime,
        };
      })
    );
    
    // Apply hasContacts filter after enrichment
    if (args.hasContacts !== undefined) {
      return enrichedCompanies.filter(company => 
        args.hasContacts ? company.contactCount > 0 : company.contactCount === 0
      );
    }
    
    return enrichedCompanies;
  },
});

// ===============================
// CONTACT ENRICHED VIEWS  
// ===============================

// Contacts with company info and engagement stats
export const contactsWithEngagement = query({
  args: {
    companyId: v.optional(v.id("companies")),
    clientId: v.optional(v.id("clients")),
    status: v.optional(v.string()),
    seniority: v.optional(v.string()),
    functionGroup: v.optional(v.string()),
    hasLinkedIn: v.optional(v.boolean()),
    isEngaged: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("contacts"),
    _creationTime: v.number(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    seniority: v.optional(v.string()),
    functionGroup: v.optional(v.string()),
    status: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    // Company info
    company: v.optional(v.object({
      _id: v.id("companies"),
      name: v.string(),
      domain: v.optional(v.string()),
      industryLabel: v.optional(v.string()),
    })),
    // Engagement stats
    communicationCount: v.number(),
    lastCommunication: v.optional(v.number()),
    responseRate: v.number(),
    isInActiveCampaign: v.boolean(),
    dealsCount: v.number(),
    totalDealValue: v.number(),
  })),
  handler: async (ctx, args) => {
    let contacts = ctx.db.query("contacts");
    
    // Apply filters
    if (args.companyId) {
      contacts = contacts.withIndex("by_company", (q) => 
        q.eq("companyId", args.companyId!)
      );
    } else if (args.clientId) {
      contacts = contacts.withIndex("by_client", (q) => 
        q.eq("clientId", args.clientId!)
      );
    } else if (args.status) {
      contacts = contacts.withIndex("by_status", (q) => 
        q.eq("status", args.status!)
      );
    }
    
    let contactsList = await contacts.take(args.limit || 100);
    
    // Apply additional filters
    if (args.seniority) {
      contactsList = contactsList.filter(c => c.seniority === args.seniority);
    }
    
    if (args.functionGroup) {
      contactsList = contactsList.filter(c => c.functionGroup === args.functionGroup);
    }
    
    if (args.hasLinkedIn !== undefined) {
      contactsList = contactsList.filter(c => 
        args.hasLinkedIn ? !!c.linkedinUrl : !c.linkedinUrl
      );
    }
    
    // Enrich with related data
    const enrichedContacts = await Promise.all(
      contactsList.map(async (contact) => {
        // Get company info
        const company = contact.companyId ? 
          await ctx.db.get(contact.companyId) : null;
        
        // Get communications
        const communications = await ctx.db
          .query("communications")
          .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
          .collect();
        
        // Get deals
        const deals = await ctx.db
          .query("deals")
          .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
          .collect();
        
        // Check active campaigns
        const activeCampaigns = await ctx.db
          .query("campaignContacts")
          .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();
        
        // Calculate response rate
        const outboundCount = communications.filter(c => c.direction === "outbound").length;
        const inboundCount = communications.filter(c => c.direction === "inbound").length;
        const responseRate = outboundCount > 0 ? (inboundCount / outboundCount) * 100 : 0;
        
        const totalDealValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
        
        return {
          ...contact,
          company: company ? {
            _id: company._id,
            name: company.name,
            domain: company.domain,
            industryLabel: company.industryLabel,
          } : undefined,
          communicationCount: communications.length,
          lastCommunication: communications[0]?.timestamp,
          responseRate,
          isInActiveCampaign: activeCampaigns.length > 0,
          dealsCount: deals.length,
          totalDealValue,
        };
      })
    );
    
    // Apply engagement filter
    if (args.isEngaged !== undefined) {
      return enrichedContacts.filter(contact => {
        const isEngaged = contact.communicationCount > 0 || 
                         contact.responseRate > 0 || 
                         contact.dealsCount > 0;
        return args.isEngaged ? isEngaged : !isEngaged;
      });
    }
    
    return enrichedContacts;
  },
});

// ===============================
// DEAL PIPELINE VIEWS
// ===============================

// Deals with full pipeline context and forecasting
export const dealsWithPipelineContext = query({
  args: {
    pipelineId: v.optional(v.id("pipelines")),
    stageId: v.optional(v.id("stages")),
    ownerId: v.optional(v.id("profiles")),
    clientId: v.optional(v.id("clients")),
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
    closingDateFrom: v.optional(v.number()),
    closingDateTo: v.optional(v.number()),
    includeForecasting: v.optional(v.boolean()),
  },
  returns: v.array(v.object({
    _id: v.id("deals"),
    _creationTime: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    value: v.optional(v.number()),
    currency: v.optional(v.string()),
    confidence: v.optional(v.number()),
    status: v.string(),
    // Pipeline context
    pipeline: v.object({
      _id: v.id("pipelines"),
      name: v.string(),
      description: v.optional(v.string()),
    }),
    stage: v.object({
      _id: v.id("stages"),
      name: v.string(),
      position: v.number(),
      isWon: v.optional(v.boolean()),
      isLost: v.optional(v.boolean()),
      defaultProbability: v.optional(v.number()),
    }),
    // Related entities
    contact: v.optional(v.object({
      _id: v.id("contacts"),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      email: v.optional(v.string()),
      jobTitle: v.optional(v.string()),
    })),
    company: v.optional(v.object({
      _id: v.id("companies"),
      name: v.string(),
      domain: v.optional(v.string()),
      industryLabel: v.optional(v.string()),
    })),
    owner: v.optional(v.object({
      _id: v.id("profiles"),
      fullName: v.optional(v.string()),
      email: v.string(),
    })),
    // Computed fields
    daysInCurrentStage: v.number(),
    daysInPipeline: v.number(),
    lineItemsCount: v.number(),
    totalLineItemValue: v.number(),
    activitiesCount: v.number(),
    lastActivityDate: v.optional(v.number()),
    // Forecasting (if enabled)
    weightedValue: v.optional(v.number()),
    probabilityScore: v.optional(v.number()),
    riskFactors: v.optional(v.array(v.string())),
  })),
  handler: async (ctx, args) => {
    let deals = ctx.db.query("deals");
    
    // Apply filters
    if (args.pipelineId) {
      deals = deals.withIndex("by_pipeline", (q) => 
        q.eq("pipelineId", args.pipelineId!)
      );
    } else if (args.stageId) {
      deals = deals.withIndex("by_stage", (q) => 
        q.eq("stageId", args.stageId!)
      );
    } else if (args.ownerId) {
      deals = deals.withIndex("by_owner", (q) => 
        q.eq("ownerId", args.ownerId!)
      );
    } else if (args.clientId) {
      deals = deals.withIndex("by_client", (q) => 
        q.eq("clientId", args.clientId!)
      );
    }
    
    let dealsList = await deals.collect();
    
    // Apply value filters
    if (args.minValue !== undefined) {
      dealsList = dealsList.filter(d => (d.value || 0) >= args.minValue!);
    }
    
    if (args.maxValue !== undefined) {
      dealsList = dealsList.filter(d => (d.value || 0) <= args.maxValue!);
    }
    
    // Enrich with full context
    const enrichedDeals = await Promise.all(
      dealsList.map(async (deal) => {
        // Get pipeline and stage
        const [pipeline, stage, contact, company, owner] = await Promise.all([
          ctx.db.get(deal.pipelineId),
          ctx.db.get(deal.stageId),
          deal.contactId ? ctx.db.get(deal.contactId) : null,
          deal.companyId ? ctx.db.get(deal.companyId) : null,
          deal.ownerId ? ctx.db.get(deal.ownerId) : null,
        ]);
        
        // Get line items
        const lineItems = await ctx.db
          .query("dealLineItems")
          .withIndex("by_deal", (q) => q.eq("dealId", deal._id))
          .collect();
        
        // Get activities
        const activities = await ctx.db
          .query("activityLog")
          .withIndex("by_deal", (q) => q.eq("dealId", deal._id))
          .order("desc")
          .collect();
        
        const now = Date.now();
        const daysInPipeline = Math.floor((now - deal._creationTime) / (1000 * 60 * 60 * 24));
        const daysInCurrentStage = Math.floor((now - deal._creationTime) / (1000 * 60 * 60 * 24)); // Simplified
        
        const totalLineItemValue = lineItems.reduce((sum, item) => 
          sum + (item.amount || 0), 0);
        
        // Forecasting calculations
        let weightedValue: number | undefined;
        let probabilityScore: number | undefined;
        let riskFactors: string[] | undefined;
        
        if (args.includeForecasting) {
          const baseProbability = stage?.defaultProbability || deal.confidence || 50;
          const ageFactor = daysInPipeline > 90 ? -10 : 0; // Older deals are riskier
          const activityFactor = activities.length > 5 ? 10 : -5; // More activity = better
          
          probabilityScore = Math.max(0, Math.min(100, baseProbability + ageFactor + activityFactor));
          weightedValue = (deal.value || 0) * (probabilityScore / 100);
          
          riskFactors = [];
          if (daysInPipeline > 90) riskFactors.push("Long cycle time");
          if (activities.length === 0) riskFactors.push("No recent activity");  
          if (!deal.contactId) riskFactors.push("No primary contact");
        }
        
        return {
          ...deal,
          pipeline: pipeline!,
          stage: stage!,
          contact: contact ? {
            _id: contact._id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            jobTitle: contact.jobTitle,
          } : undefined,
          company: company ? {
            _id: company._id,
            name: company.name,
            domain: company.domain,
            industryLabel: company.industryLabel,
          } : undefined,
          owner: owner ? {
            _id: owner._id,
            fullName: owner.fullName,
            email: owner.email,
          } : undefined,
          daysInCurrentStage,
          daysInPipeline,
          lineItemsCount: lineItems.length,
          totalLineItemValue,
          activitiesCount: activities.length,
          lastActivityDate: activities[0]?._creationTime,
          weightedValue,
          probabilityScore,
          riskFactors,
        };
      })
    );
    
    return enrichedDeals;
  },
});

// ===============================
// CAMPAIGN PERFORMANCE VIEWS
// ===============================

// Campaign performance with detailed metrics
export const campaignPerformanceView = query({
  args: {
    campaignType: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    includeMetrics: v.optional(v.boolean()),
  },
  returns: v.array(v.object({
    _id: v.id("campaigns"),
    _creationTime: v.number(),
    name: v.string(),
    type: v.string(),
    status: v.optional(v.string()),
    // Performance metrics
    contactsTargeted: v.number(),
    contactsReached: v.number(),
    responsesReceived: v.number(),
    meetingsBooked: v.number(),
    dealsGenerated: v.number(),
    // Calculated rates
    responseRate: v.number(),
    meetingRate: v.number(),
    conversionRate: v.number(),
    // Financial metrics
    totalRevenue: v.number(),
    costPerLead: v.number(),
    roi: v.number(),
  })),
  handler: async (ctx, args) => {
    let campaigns = ctx.db.query("campaigns");
    
    if (args.campaignType) {
      campaigns = campaigns.withIndex("by_type", (q) => 
        q.eq("type", args.campaignType!)
      );
    } else if (args.clientId) {
      campaigns = campaigns.withIndex("by_client", (q) => 
        q.eq("clientId", args.clientId!)
      );
    }
    
    const campaignsList = await campaigns.collect();
    
    // Enrich with performance data
    const enrichedCampaigns = await Promise.all(
      campaignsList.map(async (campaign) => {
        // Get campaign contacts
        const campaignContacts = await ctx.db
          .query("campaignContacts")
          .withIndex("by_campaign", (q) => q.eq("campaignId", campaign._id))
          .collect();
        
        // Get communications for this campaign
        const communications = await ctx.db
          .query("communications")
          .withIndex("by_campaign", (q) => q.eq("campaignId", campaign._id))
          .collect();
        
        // Get deals from this campaign
        const deals = await ctx.db
          .query("deals")
          .withIndex("by_client", (q) => q.eq("clientId", campaign.clientId!))
          .filter((q) => q.eq(q.field("campaignId"), campaign._id))
          .collect();
        
        const contactsTargeted = campaignContacts.length;
        const contactsReached = communications.filter(c => c.direction === "outbound").length;
        const responsesReceived = communications.filter(c => c.direction === "inbound").length;
        const meetingsBooked = 0; // Would need meeting data
        const dealsGenerated = deals.length;
        
        const responseRate = contactsReached > 0 ? (responsesReceived / contactsReached) * 100 : 0;
        const meetingRate = contactsReached > 0 ? (meetingsBooked / contactsReached) * 100 : 0;
        const conversionRate = contactsTargeted > 0 ? (dealsGenerated / contactsTargeted) * 100 : 0;
        
        const totalRevenue = deals.reduce((sum, deal) => 
          sum + (deal.status === "won" ? deal.value || 0 : 0), 0);
        const costPerLead = dealsGenerated > 0 ? totalRevenue / dealsGenerated : 0;
        const roi = costPerLead > 0 ? ((totalRevenue - costPerLead) / costPerLead) * 100 : 0;
        
        return {
          ...campaign,
          contactsTargeted,
          contactsReached,
          responsesReceived,
          meetingsBooked,
          dealsGenerated,
          responseRate,
          meetingRate,
          conversionRate,
          totalRevenue,
          costPerLead,
          roi,
        };
      })
    );
    
    return enrichedCampaigns;
  },
});

// ===============================
// SMART ASSIGNMENT QUEUE VIEW
// ===============================

/**
 * Comprehensive Smart Assignment Queue View
 * Joins all required tables to provide complete webhook payload data:
 * - clientId, companyId, suggestedCampaignId, contactId
 * - All campaign columns, contact names, instantlyemaillistid, company summary
 */
export const smartAssignmentQueueView = query({
  args: {
    clientId: v.optional(v.id("clients")),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    // Core identifiers
    contactId: v.id("contacts"),
    clientId: v.id("clients"),
    companyId: v.id("companies"),
    suggestedCampaignId: v.id("campaigns"),
    
    // Contact information
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    functionGroup: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    
    // Company information
    companyName: v.string(),
    companySummary: v.optional(v.string()),
    companyDomain: v.optional(v.string()),
    companyWebsite: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    companySize: v.optional(v.number()),
    
    // Client information
    instantlyemaillistid: v.optional(v.string()),
    
    // Complete campaign data (all columns)
    campaign: v.object({
      _id: v.id("campaigns"),
      name: v.string(),
      description: v.optional(v.string()),
      type: v.string(),
      status: v.optional(v.string()),
      startDate: v.optional(v.string()),
      endDate: v.optional(v.string()),
      autoAssignEnabled: v.optional(v.boolean()),
      priority: v.optional(v.number()),
      campaignPurpose: v.optional(v.string()),
      channel: v.optional(v.string()),
      emailA: v.optional(v.string()),
      emailB: v.optional(v.string()),
      followupA: v.optional(v.string()),
      followupB: v.optional(v.string()),
      subjectA: v.optional(v.string()),
      subjectB: v.optional(v.string()),
      dailyLimit: v.optional(v.number()),
      campaignGoal: v.optional(v.string()),
      customGoal: v.optional(v.string()),
      external_id: v.optional(v.string()),
      propositionId: v.optional(v.id("propositions")),
      audienceFilter: v.optional(v.object({
        functionGroups: v.optional(v.array(v.string())),
        industries: v.optional(v.array(v.string())),
        subindustries: v.optional(v.array(v.string())),
        countries: v.optional(v.array(v.string())),
        states: v.optional(v.array(v.string())),
        companySizeMin: v.optional(v.number()),
        companySizeMax: v.optional(v.number()),
      })),
      sendingWindow: v.optional(v.object({
        dailyConnectLimit: v.optional(v.number()),
        dailyMessageLimit: v.optional(v.number()),
      })),
      stats: v.optional(v.object({
        sent_count: v.optional(v.number()),
        accepted_count: v.optional(v.number()),
        replied_count: v.optional(v.number()),
        booked_count: v.optional(v.number()),
      })),
    }),
    
    // Metadata
    queuedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    // Get contacts with pending assignments (suggestedCampaignId is not null)
    let contacts;
    
    if (args.clientId) {
      contacts = await ctx.db
        .query("contacts")
        .withIndex("by_client_suggested", (q) => 
          q.eq("clientId", args.clientId)
        )
        .filter((q) => q.neq(q.field("suggestedCampaignId"), null))
        .order("desc")
        .take(args.limit || 100);
    } else {
      contacts = await ctx.db
        .query("contacts")
        .withIndex("by_suggested_campaign")
        .filter((q) => q.neq(q.field("suggestedCampaignId"), null))
        .order("desc")
        .take(args.limit || 100);
    }

    if (contacts.length === 0) {
      return [];
    }

    // Enrich each contact with all related data (process individually to handle failures gracefully)
    const enrichedQueueItems = [];
    
    for (const contact of contacts) {
      try {
        // Skip contacts without required fields - log warning instead of throwing
        if (!contact.suggestedCampaignId || 
            typeof contact.suggestedCampaignId !== 'string' || 
            contact.suggestedCampaignId.trim() === "") {
          console.log(`⚠️ Skipping contact ${contact._id} with invalid suggestedCampaignId: ${contact.suggestedCampaignId}`);
          continue;
        }
        if (!contact.companyId) {
          console.log(`⚠️ Skipping contact ${contact._id} with no companyId`);
          continue;
        }
        if (!contact.clientId) {
          console.log(`⚠️ Skipping contact ${contact._id} with no clientId`);
          continue;
        }

        // Get company data
        const company = await ctx.db.get(contact.companyId);
        if (!company) {
          console.log(`⚠️ Skipping contact ${contact._id} - Company ${contact.companyId} not found`);
          continue;
        }

        // Get campaign data (complete campaign object)
        const campaign = await ctx.db.get(contact.suggestedCampaignId);
        if (!campaign) {
          console.log(`⚠️ Skipping contact ${contact._id} - Campaign ${contact.suggestedCampaignId} not found`);
          continue;
        }

        // Get client data for instantlyemaillistid
        const client = await ctx.db.get(contact.clientId);
        if (!client) {
          console.log(`⚠️ Skipping contact ${contact._id} - Client ${contact.clientId} not found`);
          continue;
        }

        // Successfully enriched contact
        enrichedQueueItems.push({
          // Core identifiers
          contactId: contact._id,
          clientId: contact.clientId,
          companyId: contact.companyId,
          suggestedCampaignId: contact.suggestedCampaignId,
          
          // Contact information (from contacts table)
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          jobTitle: contact.jobTitle,
          functionGroup: contact.functionGroup,
          linkedinUrl: contact.linkedinUrl,
          
          // Company information (from companies table)
          companyName: company.name,
          companySummary: company.companySummary,
          companyDomain: company.domain,
          companyWebsite: company.website,
          industryLabel: company.industryLabel,
          subindustryLabel: company.subindustryLabel,
          companySize: company.companySize,
          
          // Client information (from clients table)
          instantlyemaillistid: client.instantlyemaillistid,
          
          // Complete campaign data (all campaign columns)
          campaign: {
            _id: campaign._id,
            name: campaign.name,
            description: campaign.description,
            type: campaign.type,
            status: campaign.status,
            startDate: campaign.startDate,
            endDate: campaign.endDate,
            autoAssignEnabled: campaign.autoAssignEnabled,
            priority: campaign.priority,
            campaignPurpose: campaign.campaignPurpose,
            channel: campaign.channel,
            emailA: campaign.emailA,
            emailB: campaign.emailB,
            followupA: campaign.followupA,
            followupB: campaign.followupB,
            subjectA: campaign.subjectA,
            subjectB: campaign.subjectB,
            dailyLimit: campaign.dailyLimit,
            campaignGoal: campaign.campaignGoal,
            customGoal: campaign.customGoal,
            external_id: campaign.external_id,
            propositionId: campaign.propositionId,
            audienceFilter: campaign.audienceFilter,
            sendingWindow: campaign.sendingWindow,
            stats: campaign.stats,
          },
          
          // Metadata
          queuedAt: contact._creationTime,
        });
      } catch (error) {
        console.error(`❌ Failed to enrich contact ${contact._id}:`, error);
        // Continue with next contact instead of failing the entire batch
      }
    }

    console.log(`✅ Successfully enriched ${enrichedQueueItems.length} out of ${contacts.length} contacts`);

    return enrichedQueueItems;
  },
});