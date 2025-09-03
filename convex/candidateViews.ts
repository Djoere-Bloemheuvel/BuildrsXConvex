import { query } from "./_generated/server";
import { v } from "convex/values";


// ===============================
// ABM CANDIDATES
// Complex view with time-based filtering and decision maker logic
// ===============================

export const abmCandidates = query({
  args: {
    clientId: v.id("clients"),
    minCompanySize: v.optional(v.number()),
    excludeDoNotContact: v.optional(v.boolean()),
  },
  returns: v.array(v.object({
    companyId: v.id("companies"),
    companyName: v.string(),
    domain: v.optional(v.string()),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.number()),
    location: v.optional(v.string()),
    decisionMakerCount: v.number(),
    lastAssignmentAt: v.optional(v.number()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    companyCountry: v.optional(v.string()),
    companyState: v.optional(v.string()),
    companyCity: v.optional(v.string()),
    companyUniqueQualities: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    // Decision maker function groups
    const decisionMakerGroups = [
      'Owner/Founder',
      'Marketing Decision Makers', 
      'Sales Decision Makers',
      'Business Development Decision Makers',
      'Operational Decision Makers',
      'Technical Decision Makers', 
      'Financial Decision Makers',
      'HR Decision Makers'
    ];

    // Get all enriched contacts that are decision makers for this client
    let contacts = await ctx.db
      .query("contacts")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();
    
    // Filter for decision makers and company size >= 25
    const filteredContacts = await Promise.all(
      contacts.map(async (contact) => {
        if (!contact.companyId || !contact.functionGroup) return null;
        if (!decisionMakerGroups.includes(contact.functionGroup)) return null;
        if (args.excludeDoNotContact && contact.status === 'do_not_contact') return null;

        const company = await ctx.db.get(contact.companyId);
        if (!company || !company.companySize || company.companySize < (args.minCompanySize || 25)) return null;
        
        // Only include companies with full enrichment
        if (!company.fullEnrichment) return null;

        // Get campaign and communication counts for this contact
        const campaignContacts = await ctx.db
          .query("campaignContacts")
          .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
          .collect();

        const communications = await ctx.db
          .query("communications")
          .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
          .collect();

        const campaignCount = campaignContacts.length;
        const lastCommunication = communications.length > 0 ? 
          Math.max(...communications.map(c => c.timestamp)) : null;

        // Apply time-based eligibility rules using ASSIGNMENT HISTORY (more accurate than communications)
        const now = Date.now();
        const twentyOneDaysAgo = now - (21 * 24 * 60 * 60 * 1000); // Communication cooldown
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        const fortyFiveDaysAgo = now - (45 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

        // CRITICAL: Check recent communication constraint (21-day minimum)
        if (lastCommunication && lastCommunication >= twentyOneDaysAgo) {
          return null; // Recent communication within 21 days - not eligible
        }

        // Use lastAssignmentAt as primary eligibility check (cleaner than communication timestamps)  
        const lastAssignment = contact.lastAssignmentAt;

        let isEligible = false;
        if (!lastAssignment) {
          isEligible = true; // Never assigned before
        } else if (campaignCount <= 2 && lastAssignment < thirtyDaysAgo) {
          isEligible = true; // 30-day cooldown for new contacts
        } else if (campaignCount >= 3 && campaignCount <= 4 && lastAssignment < fortyFiveDaysAgo) {
          isEligible = true; // 45-day cooldown for moderate activity
        } else if (campaignCount >= 5 && campaignCount <= 6 && lastAssignment < sixtyDaysAgo) {
          isEligible = true; // 60-day cooldown for active contacts
        } else if (campaignCount >= 7 && lastAssignment < ninetyDaysAgo) {
          isEligible = true; // 90-day cooldown for highly contacted
        }

        if (!isEligible) return null;

        return {
          contactId: contact._id,
          companyId: contact.companyId,
          campaignCount,
          lastAssignment,
          company
        };
      })
    );

    // Filter out nulls and group by company
    const validContacts = filteredContacts.filter(Boolean) as any[];
    
    // Group by company
    const companyGroups = new Map();
    for (const contact of validContacts) {
      const companyId = contact.companyId;
      if (!companyGroups.has(companyId)) {
        companyGroups.set(companyId, {
          companyId,
          company: contact.company,
          contacts: [],
          earliestAssignment: contact.lastAssignment
        });
      }
      companyGroups.get(companyId).contacts.push(contact);
      
      // Track earliest assignment (more accurate than communication)
      if (contact.lastAssignment && 
          (!companyGroups.get(companyId).earliestAssignment || 
           contact.lastAssignment < companyGroups.get(companyId).earliestAssignment)) {
        companyGroups.get(companyId).earliestAssignment = contact.lastAssignment;
      }
    }

    // Filter companies with >= 2 decision makers
    const results = [];
    for (const [companyId, group] of companyGroups) {
      if (group.contacts.length >= 2) {
        const company = group.company;
        results.push({
          companyId,
          companyName: company.name || undefined,
          domain: company.domain || undefined,
          website: company.website || undefined,
          industry: company.industrySlug || undefined,
          companySize: company.companySize || undefined,
          location: `${company.city || ''}, ${company.state || ''}, ${company.country || ''}`.replace(/^,|,$|, ,/g, '') || undefined,
          decisionMakerCount: group.contacts.length,
          lastAssignmentAt: group.earliestAssignment || undefined,
          industryLabel: company.industryLabel || undefined,
          subindustryLabel: company.subindustryLabel || undefined,
          companyCountry: company.country || undefined,
          companyState: company.state || undefined,
          companyCity: company.city || undefined,
          companyUniqueQualities: company.companyUniqueQualities || undefined,
        });
      }
    }

    // Sort by last assignment (earliest first, nulls first for never-assigned)
    results.sort((a, b) => {
      if (!a.lastAssignmentAt && !b.lastAssignmentAt) return 0;
      if (!a.lastAssignmentAt) return -1;
      if (!b.lastAssignmentAt) return 1;
      return a.lastAssignmentAt - b.lastAssignmentAt;
    });

    return results;
  },
});

// ===============================
// COLD EMAIL CANDIDATES  
// Complex eligibility logic with campaign history
// ===============================

export const coldEmailCandidates = query({
  args: {
    clientId: v.id("clients"),
    includeAssignable: v.optional(v.boolean()),
  },
  returns: v.array(v.object({
    contactId: v.id("contacts"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    functionGroup: v.optional(v.string()),
    status: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    companyId: v.optional(v.id("companies")),
    companyName: v.optional(v.string()),
    domain: v.optional(v.string()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.number()),
    location: v.optional(v.string()),
    suggestedCampaignId: v.optional(v.id("campaigns")),
    lastAssignmentAt: v.optional(v.number()),
    totalCampaigns: v.number(),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    companyCountry: v.optional(v.string()),
    companyState: v.optional(v.string()),
    companyCity: v.optional(v.string()),
    companyUniqueQualities: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    // Get all contacts with status = 'cold' for this client
    if (!args.clientId) {
      return [];
    }

    // STRICT campaign matching function - NO FALLBACKS, EXACT CRITERIA ONLY
    const getNextCampaignForContactInline = async (
      ctx: any, 
      contact: any, 
      company: any, 
      totalCampaigns: number, 
      clientId: string
    ): Promise<string | null> => {
      // Get ONLY ACTIVE email campaigns for suggested assignments
      const campaigns = await ctx.db
        .query("campaigns")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .filter((q) => q.and(
          q.eq(q.field("type"), "email"),
          q.or(
            q.eq(q.field("status"), "active"),
            q.eq(q.field("status"), "actief")
          )
        ))
        .collect();
      
      console.log(`🔍 Found ${campaigns.length} active email campaigns for client ${clientId}`);

      if (campaigns.length === 0) {
        return null;
      }

      // Get campaign history for this contact to check which campaigns they've already done
      const campaignHistory = await ctx.db
        .query("campaignContacts")
        .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
        .collect();
      
      const completedCampaignIds = new Set(campaignHistory.map(cc => cc.campaignId));

      // STRICT MATCHING ONLY - contact must exactly match campaign criteria
      const eligibleCampaigns = campaigns.filter(campaign => {
        // FIRST: Check if contact has already done this specific campaign
        if (completedCampaignIds.has(campaign._id)) {
          return false;
        }

        const filter = campaign.audienceFilter;
        
        // Function Group - HARD REQUIREMENT
        if (filter?.functionGroups && filter.functionGroups.length > 0) {
          if (!contact.functionGroup || !filter.functionGroups.includes(contact.functionGroup)) {
            return false;
          }
        }

        // Industry - HARD REQUIREMENT  
        if (filter?.industries && filter.industries.length > 0) {
          if (!company.industrySlug || !filter.industries.includes(company.industrySlug)) {
            return false;
          }
        }

        // Company Size - HARD REQUIREMENT
        if (filter?.companySizeMin !== undefined || filter?.companySizeMax !== undefined) {
          const minSize = filter.companySizeMin || 0;
          const maxSize = filter.companySizeMax || Infinity;
          if (!company.companySize || company.companySize < minSize || company.companySize > maxSize) {
            return false;
          }
        }

        // Country - HARD REQUIREMENT (if specified)
        if (filter?.countries && filter.countries.length > 0) {
          if (!company.companyCountry || !filter.countries.includes(company.companyCountry)) {
            return false;
          }
        }

        // State/Province - HARD REQUIREMENT (if specified)  
        if (filter?.states && filter.states.length > 0) {
          if (!company.companyState || !filter.states.includes(company.companyState)) {
            return false;
          }
        }

        // Sub-industries - HARD REQUIREMENT (if specified)
        if (filter?.subindustries && filter.subindustries.length > 0) {
          if (!company.subindustrySlug || !filter.subindustries.includes(company.subindustrySlug)) {
            return false;
          }
        }

        // All strict requirements passed
        return true;
      });

      // NO FALLBACKS - if no campaigns match exactly, contact gets no suggested campaign
      if (eligibleCampaigns.length === 0) {
        console.log(`❌ Contact ${contact._id} has no eligible campaigns (${campaigns.length} total campaigns, ${completedCampaignIds.size} already completed)`);
        return null;
      }

      console.log(`✅ Contact ${contact._id} has ${eligibleCampaigns.length} eligible campaigns`);

      // Score the eligible campaigns based on soft preferences and prioritization
      const campaignScores = eligibleCampaigns.map(campaign => {
        let score = 0;

        // Base score for active campaigns
        if (campaign.status === "active" || campaign.status === "actief") {
          score += 10;
        }

        // Campaign experience level matching
        if (totalCampaigns === 0) {
          // First-time contact - prefer onboarding campaigns
          if (campaign.name?.toLowerCase().includes("intro") || 
              campaign.name?.toLowerCase().includes("welcome") ||
              campaign.name?.toLowerCase().includes("onboarding")) {
            score += 20;
          }
        } else if (totalCampaigns <= 2) {
          // Early stage - prefer awareness campaigns  
          if (campaign.name?.toLowerCase().includes("awareness") ||
              campaign.name?.toLowerCase().includes("discovery")) {
            score += 15;
          }
        } else {
          // Experienced contact - prefer advanced campaigns
          if (campaign.name?.toLowerCase().includes("advanced") ||
              campaign.name?.toLowerCase().includes("expert") ||
              campaign.name?.toLowerCase().includes("premium")) {
            score += 10;
          }
        }

        // Daily limit availability (soft preference)
        if (campaign.dailyLimit && campaign.dailyLimit > 0) {
          score += 5;
        }

        // Seniority matching (soft preference)
        if (contact.seniority === "Senior" || contact.seniority === "Executive") {
          if (campaign.name?.toLowerCase().includes("executive") ||
              campaign.name?.toLowerCase().includes("senior") ||
              campaign.name?.toLowerCase().includes("decision")) {
            score += 15;
          }
        }

        // Priority score (if campaign has priority set)
        if (campaign.priority) {
          score += campaign.priority;
        }

        return {
          campaignId: campaign._id,
          score,
          campaign
        };
      });

      // Sort by score and return the best eligible match
      campaignScores.sort((a, b) => b.score - a.score);
      
      // Return the best scoring campaign that meets all hard requirements
      return campaignScores[0].campaignId;
    };
    
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_client_status", (q) => q.eq("clientId", args.clientId).eq("status", "cold"))
      .collect();

    // Get ABM companies to exclude
    const abmCompanies = await ctx.runQuery("candidateViews:abmCandidates", { 
      clientId: args.clientId 
    });
    const abmCompanyIds = new Set(abmCompanies.map(c => c.companyId));

    const results = await Promise.all(
      contacts.map(async (contact) => {
        if (!contact.companyId) return null;
        
        // CRITICAL: Exclude contacts that already have a suggestedCampaignId (already in queue)
        if (contact.suggestedCampaignId) return null;
        
        // Exclude ABM candidates
        if (abmCompanyIds.has(contact.companyId)) return null;

        // Get company info
        const company = await ctx.db.get(contact.companyId);
        if (!company) return null;
        
        // Only include companies with full enrichment
        if (!company.fullEnrichment) return null;

        // Check for active campaigns (planned or active)
        const activeCampaignContacts = await ctx.db
          .query("campaignContacts")
          .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
          .filter((q) => q.or(
            q.eq(q.field("status"), "planned"),
            q.eq(q.field("status"), "active"),
            q.eq(q.field("status"), "gepland"),
            q.eq(q.field("status"), "actief")
          ))
          .collect();

        if (activeCampaignContacts.length > 0) return null;

        // Get all communications for this contact
        const communications = await ctx.db
          .query("communications")
          .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
          .collect();

        const lastCommunication = communications.length > 0 ?
          Math.max(...communications.map(c => c.timestamp)) : null;

        // Get total campaign count
        const allCampaignContacts = await ctx.db
          .query("campaignContacts")
          .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
          .collect();

        const totalCampaigns = allCampaignContacts.length;

        // Apply time-based eligibility rules using ASSIGNMENT HISTORY (more accurate than communications)
        const now = Date.now();
        const twentyOneDaysAgo = now - (21 * 24 * 60 * 60 * 1000); // Communication cooldown
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        const fortyFiveDaysAgo = now - (45 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

        // CRITICAL: Check recent communication constraint (21-day minimum)
        if (lastCommunication && lastCommunication >= twentyOneDaysAgo) {
          return null; // Recent communication within 21 days - not eligible
        }

        // Use lastAssignmentAt as primary eligibility check (cleaner than communication timestamps)
        const lastAssignment = contact.lastAssignmentAt;

        let isEligible = false;
        if (!lastAssignment) {
          isEligible = true; // Never assigned before
        } else if (totalCampaigns <= 2 && lastAssignment < thirtyDaysAgo) {
          isEligible = true; // 30-day cooldown for new contacts
        } else if ((totalCampaigns === 3 || totalCampaigns === 4) && lastAssignment < fortyFiveDaysAgo) {
          isEligible = true; // 45-day cooldown for moderate activity
        } else if ((totalCampaigns === 5 || totalCampaigns === 6) && lastAssignment < sixtyDaysAgo) {
          isEligible = true; // 60-day cooldown for active contacts
        } else if (totalCampaigns >= 7 && lastAssignment < ninetyDaysAgo) {
          isEligible = true; // 90-day cooldown for highly contacted
        }

        if (!isEligible) return null;

        // Get intelligent suggested campaign for this contact
        const suggestedCampaignId = await getNextCampaignForContactInline(
          ctx, contact, company, totalCampaigns, args.clientId
        );

        return {
          contactId: contact._id,
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          email: contact.email || undefined,
          linkedinUrl: contact.linkedinUrl || undefined,
          jobTitle: contact.jobTitle || undefined,
          functionGroup: contact.functionGroup || undefined,
          status: contact.status || undefined,
          clientId: contact.clientId || undefined,
          companyId: contact.companyId || undefined,
          companyName: company.name || undefined,
          domain: company.domain || undefined,
          industry: company.industrySlug || undefined,
          companySize: company.companySize || undefined,
          location: `${company.city || ''}, ${company.state || ''}, ${company.country || ''}`.replace(/^,|,$|, ,/g, '') || undefined,
          suggestedCampaignId: suggestedCampaignId || undefined,
          lastAssignmentAt: contact.lastAssignmentAt || undefined,
          totalCampaigns,
          industryLabel: company.industryLabel || undefined,
          subindustryLabel: company.subindustryLabel || undefined,
          companyCountry: company.country || undefined,
          companyState: company.state || undefined,
          companyCity: company.city || undefined,
          companyUniqueQualities: company.companyUniqueQualities || undefined,
        };
      })
    );

    let filteredResults = results.filter(Boolean) as any[];

    // If includeAssignable is true, only return contacts with suggestedCampaignId
    if (args.includeAssignable) {
      filteredResults = filteredResults.filter(r => r.suggestedCampaignId);
    }

    // Sort by campaign count, then by last assignment (never-assigned first)
    filteredResults.sort((a, b) => {
      if (a.totalCampaigns !== b.totalCampaigns) {
        return a.totalCampaigns - b.totalCampaigns;
      }
      if (!a.lastAssignmentAt && !b.lastAssignmentAt) return 0;
      if (!a.lastAssignmentAt) return -1;
      if (!b.lastAssignmentAt) return 1;
      return a.lastAssignmentAt - b.lastAssignmentAt;
    });

    return filteredResults;
  },
});

// ===============================
// COLD EMAIL CANDIDATES STATISTICS
// Detailed breakdown of candidate filtering stages
// ===============================

export const coldEmailCandidatesStats = query({
  args: {
    clientId: v.id("clients"),
  },
  returns: v.object({
    totalColdContacts: v.number(),
    afterEnrichmentFilter: v.number(),
    afterAbmExclusion: v.number(), 
    afterActiveCampaignFilter: v.number(),
    afterCommunicationCooldown: v.number(),
    afterAssignmentCooldown: v.number(),
    finalEligible: v.number(),
    withSuggestedCampaigns: v.number(),
    // 3 main tracking categories
    eligibleCandidates: v.number(),    // Ready to be assigned to queue
    inQueue: v.number(),              // Have suggestedCampaignId, waiting for processing
    inCampaigns: v.number(),          // Currently in active campaigns
    breakdown: v.array(v.object({
      stage: v.string(),
      count: v.number(),
      description: v.string(),
    })),
    activeCampaignsCount: v.number(),
    abmCompaniesCount: v.number(),
  }),
  handler: async (ctx, args) => {
    console.log(`📊 Starting candidate statistics breakdown for client ${args.clientId}`);
    
    // Stage 1: Get all cold contacts
    const allColdContacts = await ctx.db
      .query("contacts")
      .withIndex("by_client_status", (q) => q.eq("clientId", args.clientId).eq("status", "cold"))
      .collect();
    console.log(`📊 Stage 1: ${allColdContacts.length} total cold contacts`);

    // Stage 2: Exclude contacts already in queue (with suggestedCampaignId)
    const contactsNotInQueue = allColdContacts.filter(contact => !contact.suggestedCampaignId);
    console.log(`📊 Stage 2: ${contactsNotInQueue.length} contacts not already in queue (${allColdContacts.length - contactsNotInQueue.length} excluded with suggestedCampaignId)`);

    // Stage 3: Filter for enriched companies only
    const enrichedContacts = [];
    for (const contact of contactsNotInQueue) {
      if (!contact.companyId) continue;
      const company = await ctx.db.get(contact.companyId);
      if (company && company.fullEnrichment) {
        enrichedContacts.push({ contact, company });
      }
    }
    console.log(`📊 Stage 3: ${enrichedContacts.length} contacts with enriched companies`);

    // Stage 4: Exclude ABM candidates
    const abmCompanies = await ctx.runQuery("candidateViews:abmCandidates", { 
      clientId: args.clientId 
    });
    const abmCompanyIds = new Set(abmCompanies.map(c => c.companyId));
    console.log(`📊 Stage 4: ${abmCompanies.length} ABM companies to exclude`);
    
    const afterAbmExclusion = enrichedContacts.filter(({ contact }) => 
      !abmCompanyIds.has(contact.companyId!)
    );
    console.log(`📊 Stage 4: ${afterAbmExclusion.length} contacts after ABM exclusion`);

    // Stage 5: Check for active campaigns
    const afterActiveCampaignFilter = [];
    for (const item of afterAbmExclusion) {
      const activeCampaignContacts = await ctx.db
        .query("campaignContacts")
        .withIndex("by_contact", (q) => q.eq("contactId", item.contact._id))
        .filter((q) => q.or(
          q.eq(q.field("status"), "planned"),
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "gepland"),
          q.eq(q.field("status"), "actief")
        ))
        .collect();
      
      if (activeCampaignContacts.length === 0) {
        afterActiveCampaignFilter.push(item);
      }
    }
    console.log(`📊 Stage 5: ${afterActiveCampaignFilter.length} contacts without active campaigns`);

    // Stage 6: Communication cooldown (21 days)
    const twentyOneDaysAgo = Date.now() - (21 * 24 * 60 * 60 * 1000);
    const afterCommunicationCooldown = [];
    
    for (const item of afterActiveCampaignFilter) {
      const communications = await ctx.db
        .query("communications")
        .withIndex("by_contact", (q) => q.eq("contactId", item.contact._id))
        .collect();
      
      const lastCommunication = communications.length > 0 ?
        Math.max(...communications.map(c => c.timestamp)) : null;
      
      if (!lastCommunication || lastCommunication < twentyOneDaysAgo) {
        afterCommunicationCooldown.push(item);
      }
    }
    console.log(`📊 Stage 6: ${afterCommunicationCooldown.length} contacts after 21-day communication cooldown`);

    // Stage 7: Assignment cooldown based on campaign history
    const afterAssignmentCooldown = [];
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const fortyFiveDaysAgo = now - (45 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

    for (const item of afterCommunicationCooldown) {
      const allCampaignContacts = await ctx.db
        .query("campaignContacts")
        .withIndex("by_contact", (q) => q.eq("contactId", item.contact._id))
        .collect();
      
      const totalCampaigns = allCampaignContacts.length;
      const lastAssignment = item.contact.lastAssignmentAt;

      let isEligible = false;
      if (!lastAssignment) {
        isEligible = true; // Never assigned before
      } else if (totalCampaigns <= 2 && lastAssignment < thirtyDaysAgo) {
        isEligible = true; // 30-day cooldown for new contacts
      } else if ((totalCampaigns === 3 || totalCampaigns === 4) && lastAssignment < fortyFiveDaysAgo) {
        isEligible = true; // 45-day cooldown for moderate activity
      } else if ((totalCampaigns === 5 || totalCampaigns === 6) && lastAssignment < sixtyDaysAgo) {
        isEligible = true; // 60-day cooldown for active contacts
      } else if (totalCampaigns >= 7 && lastAssignment < ninetyDaysAgo) {
        isEligible = true; // 90-day cooldown for highly contacted
      }

      if (isEligible) {
        afterAssignmentCooldown.push({ ...item, totalCampaigns });
      }
    }
    console.log(`📊 Stage 7: ${afterAssignmentCooldown.length} contacts after assignment cooldown`);

    // Stage 8: Count how many have suggested campaigns (from actual coldEmailCandidates)
    const candidatesWithSuggestions = await ctx.runQuery("candidateViews:coldEmailCandidates", {
      clientId: args.clientId,
      includeAssignable: true
    });
    console.log(`📊 Stage 8: ${candidatesWithSuggestions.length} contacts with suggested campaigns`);

    // Get active campaigns count
    const activeCampaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.and(
        q.eq(q.field("type"), "email"),
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "actief")
        )
      ))
      .collect();

    // Calculate 3 main tracking categories
    
    // 1. Eligible Candidates: Final eligible (not in queue, not in campaigns)
    const eligibleCandidates = afterAssignmentCooldown.length;
    
    // 2. In Queue: Contacts with suggestedCampaignId
    const contactsInQueue = allColdContacts.filter(contact => 
      contact.suggestedCampaignId !== null && contact.suggestedCampaignId !== undefined
    );
    const inQueue = contactsInQueue.length;
    
    // 3. In Campaigns: Cold contacts currently in active campaigns  
    let inCampaigns = 0;
    for (const contact of allColdContacts) {
      const activeCampaignContacts = await ctx.db
        .query("campaignContacts")
        .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
        .filter((q) => q.or(
          q.eq(q.field("status"), "planned"),
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "gepland"),
          q.eq(q.field("status"), "actief")
        ))
        .collect();
      
      if (activeCampaignContacts.length > 0) {
        inCampaigns++;
      }
    }
    
    console.log(`📊 Final counts - Eligible: ${eligibleCandidates}, In Queue: ${inQueue}, In Campaigns: ${inCampaigns}`);

    const breakdown = [
      { stage: "Totaal Cold Contacten", count: allColdContacts.length, description: "Alle contacten met 'cold' status" },
      { stage: "Niet in Wachtrij", count: contactsNotInQueue.length, description: "Exclusief contacten die al suggestedCampaignId hebben" },
      { stage: "Verrijkte Bedrijven", count: enrichedContacts.length, description: "Contacten met volledig verrijkte bedrijfsdata" },
      { stage: "Geen ABM Kandidaten", count: afterAbmExclusion.length, description: "Exclusief ABM kandidaten (bedrijven met 2+ beslissers)" },
      { stage: "Geen Actieve Campagnes", count: afterActiveCampaignFilter.length, description: "Contacten niet in geplande/actieve campagnes" },
      { stage: "Communicatie Cooldown", count: afterCommunicationCooldown.length, description: "Geen communicatie in laatste 21 dagen" },
      { stage: "Assignment Cooldown", count: afterAssignmentCooldown.length, description: "Eligible gebaseerd op eerdere campagne geschiedenis" },
      { stage: "Met Suggestie Campagnes", count: candidatesWithSuggestions.length, description: "Finale toewijsbare kandidaten met matching campagnes" },
    ];

    return {
      totalColdContacts: allColdContacts.length,
      afterEnrichmentFilter: enrichedContacts.length,
      afterAbmExclusion: afterAbmExclusion.length,
      afterActiveCampaignFilter: afterActiveCampaignFilter.length,
      afterCommunicationCooldown: afterCommunicationCooldown.length,
      afterAssignmentCooldown: afterAssignmentCooldown.length,
      finalEligible: afterAssignmentCooldown.length,
      withSuggestedCampaigns: candidatesWithSuggestions.length,
      // 3 main tracking categories
      eligibleCandidates,
      inQueue,
      inCampaigns,
      breakdown,
      activeCampaignsCount: activeCampaigns.length,
      abmCompaniesCount: abmCompanies.length,
    };
  },
});

// ===============================
// LINKEDIN CANDIDATES
// Contacts eligible for LinkedIn outreach
// ===============================

export const linkedinCandidates = query({
  args: {
    clientId: v.id("clients"),
    minCompanySize: v.optional(v.number()),
  },
  returns: v.array(v.object({
    contactId: v.id("contacts"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    functionGroup: v.optional(v.string()),
    seniority: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    status: v.optional(v.string()),
    isLinkedinConnected: v.optional(v.boolean()),
    companyId: v.optional(v.id("companies")),
    companyName: v.optional(v.string()),
    domain: v.optional(v.string()),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.number()),
    location: v.optional(v.string()),
    companySummary: v.optional(v.string()),
    companyKeywords: v.optional(v.array(v.string())),
    companyCommonProblems: v.optional(v.string()),
    companyUniqueCharacteristics: v.optional(v.array(v.string())),
    companyTargetCustomers: v.optional(v.string()),
    totalCampaigns: v.number(),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    companyCountry: v.optional(v.string()),
    companyState: v.optional(v.string()),
    companyCity: v.optional(v.string()),
    companyUniqueQualities: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    // Get contacts that are warm or cold, not LinkedIn connected, for this client
    const warmContacts = await ctx.db
      .query("contacts")
      .withIndex("by_status", (q) => q.eq("clientId", args.clientId).eq("status", "warm"))
      .collect();
      
    const coldContacts = await ctx.db
      .query("contacts")
      .withIndex("by_status", (q) => q.eq("clientId", args.clientId).eq("status", "cold"))
      .collect();
      
    let contacts = [...warmContacts, ...coldContacts];

    // Filter out LinkedIn connected contacts
    contacts = contacts.filter(c => c.isLinkedinConnected !== true);

    const results = await Promise.all(
      contacts.map(async (contact) => {
        if (!contact.companyId) return null;

        const company = await ctx.db.get(contact.companyId);
        if (!company) return null;
        
        // Only include companies with full enrichment
        if (!company.fullEnrichment) return null;

        // Company size filter
        const minSize = args.minCompanySize || 5;
        if (!company.companySize || company.companySize < minSize) return null;

        // Check if in LinkedIn campaign
        const linkedinCampaigns = await ctx.db
          .query("campaignContacts")
          .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
          .collect();

        // Get the actual campaigns to check channel
        const linkedinCampaignIds = [];
        for (const cc of linkedinCampaigns) {
          const campaign = await ctx.db.get(cc.campaignId);
          if (campaign && campaign.channel === 'linkedin') {
            linkedinCampaignIds.push(cc.campaignId);
          }
        }

        if (linkedinCampaignIds.length > 0) return null;

        // Check if in active email campaign
        const activeCampaigns = linkedinCampaigns.filter(cc => 
          cc.status === 'Gepland' || cc.status === 'Actief'
        );

        for (const cc of activeCampaigns) {
          const campaign = await ctx.db.get(cc.campaignId);
          if (campaign && campaign.channel === 'email') {
            return null;
          }
        }

        // Check for recent communications (within 14 days)
        const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
        const recentComms = await ctx.db
          .query("communications")
          .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
          .filter((q) => q.and(
            q.or(
              q.eq(q.field("channel"), "email"),
              q.eq(q.field("channel"), "linkedin")
            ),
            q.gte(q.field("timestamp"), fourteenDaysAgo)
          ))
          .collect();

        if (recentComms.length > 0) return null;

        // Get campaign count
        const totalCampaigns = linkedinCampaigns.length;

        return {
          contactId: contact._id,
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          email: contact.email || undefined,
          jobTitle: contact.jobTitle || undefined,
          functionGroup: contact.functionGroup || undefined,
          seniority: contact.seniority || undefined,
          linkedinUrl: contact.linkedinUrl || undefined,
          status: contact.status || undefined,
          isLinkedinConnected: contact.isLinkedinConnected || undefined,
          companyId: contact.companyId || undefined,
          companyName: company.name || undefined,
          domain: company.domain || undefined,
          website: company.website || undefined,
          industry: company.industrySlug || undefined,
          companySize: company.companySize || undefined,
          location: `${company.city || ''}, ${company.state || ''}, ${company.country || ''}`.replace(/^,|,$|, ,/g, '') || undefined,
          companySummary: company.companySummary || undefined,
          companyKeywords: company.companyKeywords || undefined,
          companyCommonProblems: company.companyCommonProblems || undefined,
          companyUniqueCharacteristics: company.companyUniqueCharacteristics || undefined,
          companyTargetCustomers: company.companyTargetCustomers || undefined,
          totalCampaigns,
          industryLabel: company.industryLabel || undefined,
          subindustryLabel: company.subindustryLabel || undefined,
          companyCountry: company.country || undefined,
          companyState: company.state || undefined,
          companyCity: company.city || undefined,
          companyUniqueQualities: company.companyUniqueQualities || undefined,
        };
      })
    );

    let filteredResults = results.filter(Boolean) as any[];

    // Sort by campaign count, then by status (warm first), then by creation date
    filteredResults.sort((a, b) => {
      if (a.totalCampaigns !== b.totalCampaigns) {
        return a.totalCampaigns - b.totalCampaigns;
      }
      if (a.status !== b.status) {
        return a.status === 'warm' ? -1 : 1;
      }
      return a.contactId.localeCompare(b.contactId); // Proxy for created_at
    });

    return filteredResults;
  },
});

// ===============================
// LINKEDIN REACTIVATION CANDIDATES
// LinkedIn connected contacts eligible for reactivation
// ===============================

export const linkedinReactivationCandidates = query({
  args: {
    clientId: v.id("clients"),
  },
  returns: v.array(v.object({
    contactId: v.id("contacts"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    functionGroup: v.optional(v.string()),
    status: v.optional(v.string()),
    seniority: v.optional(v.string()),
    isLinkedinConnected: v.optional(v.boolean()),
    companyId: v.optional(v.id("companies")),
    companyName: v.optional(v.string()),
    domain: v.optional(v.string()),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.number()),
    location: v.optional(v.string()),
    companySummary: v.optional(v.string()),
    companyKeywords: v.optional(v.array(v.string())),
    lastLinkedinCommAt: v.optional(v.number()),
    campaignCount: v.number(),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    companyCountry: v.optional(v.string()),
    companyState: v.optional(v.string()),
    companyCity: v.optional(v.string()),
    companyUniqueQualities: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    // Get LinkedIn connected contacts with eligible statuses for this client
    const coldLinkedInContacts = await ctx.db
      .query("contacts")
      .withIndex("by_status", (q) => q.eq("clientId", args.clientId).eq("status", "cold"))
      .filter((q) => q.eq(q.field("isLinkedinConnected"), true))
      .collect();
      
    const warmLinkedInContacts = await ctx.db
      .query("contacts")
      .withIndex("by_status", (q) => q.eq("clientId", args.clientId).eq("status", "warm"))
      .filter((q) => q.eq(q.field("isLinkedinConnected"), true))
      .collect();
      
    const nurtureLinkedInContacts = await ctx.db
      .query("contacts")
      .withIndex("by_status", (q) => q.eq("clientId", args.clientId).eq("status", "nurture"))
      .filter((q) => q.eq(q.field("isLinkedinConnected"), true))
      .collect();
      
    const contacts = [...coldLinkedInContacts, ...warmLinkedInContacts, ...nurtureLinkedInContacts];

    const results = await Promise.all(
      contacts.map(async (contact) => {
        if (!contact.companyId) return null;

        const company = await ctx.db.get(contact.companyId);
        if (!company) return null;

        // Get last LinkedIn communication
        const linkedinComms = await ctx.db
          .query("communications")
          .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
          .filter((q) => q.eq(q.field("channel"), "linkedin"))
          .collect();

        const lastLinkedinCommAt = linkedinComms.length > 0 ?
          Math.max(...linkedinComms.map(c => c.timestamp)) : null;

        // Check if eligible for reactivation (no LinkedIn comm or > 90 days ago)
        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
        if (lastLinkedinCommAt && lastLinkedinCommAt >= ninetyDaysAgo) {
          return null;
        }

        // Get LinkedIn campaign count
        const campaignContacts = await ctx.db
          .query("campaignContacts")
          .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
          .collect();

        let linkedinCampaignCount = 0;
        for (const cc of campaignContacts) {
          const campaign = await ctx.db.get(cc.campaignId);
          if (campaign && campaign.channel === 'linkedin') {
            linkedinCampaignCount++;
          }
        }

        return {
          contactId: contact._id,
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          email: contact.email || undefined,
          linkedinUrl: contact.linkedinUrl || undefined,
          jobTitle: contact.jobTitle || undefined,
          functionGroup: contact.functionGroup || undefined,
          status: contact.status || undefined,
          seniority: contact.seniority || undefined,
          isLinkedinConnected: contact.isLinkedinConnected || undefined,
          companyId: contact.companyId || undefined,
          companyName: company.name || undefined,
          domain: company.domain || undefined,
          website: company.website || undefined,
          industry: company.industrySlug || undefined,
          companySize: company.companySize || undefined,
          location: `${company.city || ''}, ${company.state || ''}, ${company.country || ''}`.replace(/^,|,$|, ,/g, '') || undefined,
          companySummary: company.companySummary || undefined,
          companyKeywords: company.companyKeywords || undefined,
          lastLinkedinCommAt: lastLinkedinCommAt || undefined,
          campaignCount: linkedinCampaignCount,
          industryLabel: company.industryLabel || undefined,
          subindustryLabel: company.subindustryLabel || undefined,
          companyCountry: company.country || undefined,
          companyState: company.state || undefined,
          companyCity: company.city || undefined,
          companyUniqueQualities: company.companyUniqueQualities || undefined,
        };
      })
    );

    const filteredResults = results.filter(Boolean) as any[];

    // Sort by campaign count, then by last communication (nulls first)
    filteredResults.sort((a, b) => {
      if (a.campaignCount !== b.campaignCount) {
        return a.campaignCount - b.campaignCount;
      }
      if (!a.lastLinkedinCommAt && !b.lastLinkedinCommAt) return 0;
      if (!a.lastLinkedinCommAt) return -1;
      if (!b.lastLinkedinCommAt) return 1;
      return a.lastLinkedinCommAt - b.lastLinkedinCommAt;
    });

    return filteredResults;
  },
});