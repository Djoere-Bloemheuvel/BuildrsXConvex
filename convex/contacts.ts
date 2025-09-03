import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Get contacts with optional filters
export const list = query({
  args: { 
    companyId: v.optional(v.id("companies")),
    clientId: v.optional(v.id("clients")), // Only accept Convex ID
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number())
  },
  returns: v.array(v.object({
    _id: v.id("contacts"),
    _creationTime: v.number(),
    leadId: v.id("leads"),
    clientId: v.id("clients"),
    companyId: v.id("companies"),
    purchasedAt: v.number(),
    status: v.optional(v.string()),
    lastCommunicationAt: v.optional(v.number()),
    optedIn: v.optional(v.boolean()),
    fullEnrichment: v.optional(v.boolean()),
    // Smart Assignment Queue fields
    suggestedCampaignId: v.optional(v.id("campaigns")),
    lastAssignmentAt: v.optional(v.number()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    mobilePhone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    functionGroup: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    name: v.optional(v.string()),
    website: v.optional(v.string()),
    domain: v.optional(v.string()),
    companyLinkedinUrl: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    companySummary: v.optional(v.string()),
    shortCompanySummary: v.optional(v.string()),
    companySize: v.optional(v.number()),
    companyCity: v.optional(v.string()),
    companyState: v.optional(v.string()),
    companyCountry: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    let contacts = ctx.db.query("contacts");
    
    if (args.companyId) {
      contacts = contacts.withIndex("by_company", (q) => q.eq("companyId", args.companyId));
    } else if (args.clientId) {
      // Use the clientId directly with proper index
      contacts = contacts.withIndex("by_client", (q) => q.eq("clientId", args.clientId));
      console.log(`✅ Filtering contacts for clientId: ${args.clientId}`);
    } else if (args.status) {
      contacts = contacts.withIndex("by_status", (q) => q.eq("status", args.status));
    }
    
    contacts = contacts.order("desc");
    
    let contactsList;
    if (args.limit) {
      // Apply offset and limit for pagination
      const allContacts = await contacts.collect();
      const start = args.offset || 0;
      const end = start + args.limit;
      contactsList = allContacts.slice(start, end);
    } else {
      contactsList = await contacts.collect();
    }
    
    console.log(`📊 Found ${contactsList.length} contacts for client ${args.clientId}`);
    
    // Enrich contacts with lead and company data
    const enrichedContacts = await Promise.all(contactsList.map(async (contact) => {
      try {
        // Get lead data
        const lead = await ctx.db.get(contact.leadId);
        
        // Get company data
        const company = await ctx.db.get(contact.companyId);
        
        return {
          ...contact,
          // Add lead data
          firstName: lead?.firstName || '',
          lastName: lead?.lastName || '',
          email: lead?.email || '',
          mobilePhone: lead?.mobilePhone || '',
          linkedinUrl: lead?.linkedinUrl || '',
          jobTitle: lead?.jobTitle || '',
          functionGroup: lead?.functionGroup || '',
          city: lead?.city || '',
          state: lead?.state || '',
          country: lead?.country || '',
          // Add company data
          name: company?.name || 'Unknown Company',
          website: company?.website || '',
          domain: company?.domain || '',
          companyLinkedinUrl: company?.companyLinkedinUrl || '',
          industryLabel: company?.industryLabel || '',
          subindustryLabel: company?.subindustryLabel || '',
          companySummary: company?.companySummary || '',
          shortCompanySummary: company?.shortCompanySummary || '',
          companySize: company?.companySize || 0,
          companyCity: company?.city || '',
          companyState: company?.state || '',
          companyCountry: company?.country || '',
        };
      } catch (error) {
        console.error(`Error enriching contact ${contact._id}:`, error);
        return {
          ...contact,
          // Fallback data
          firstName: '',
          lastName: '',
          email: '',
          mobilePhone: '',
          linkedinUrl: '',
          jobTitle: '',
          functionGroup: '',
          name: 'Unknown Company',
          website: '',
          companyLinkedinUrl: '',
          industryLabel: '',
          subindustryLabel: '',
          companySummary: '',
          shortCompanySummary: '',
        };
      }
    }));
    
    // Apply search filter if provided (after enrichment to search in lead/company data)
    let filteredContacts = enrichedContacts;
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      filteredContacts = enrichedContacts.filter(contact => {
        return (
          contact.firstName?.toLowerCase().includes(searchLower) ||
          contact.lastName?.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.jobTitle?.toLowerCase().includes(searchLower) ||
          contact.name?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    return filteredContacts;
  },
});

// Get total count of contacts for pagination
export const count = query({
  args: { 
    companyId: v.optional(v.id("companies")),
    clientId: v.optional(v.id("clients")),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let contacts = ctx.db.query("contacts");
    
    if (args.companyId) {
      contacts = contacts.withIndex("by_company", (q) => q.eq("companyId", args.companyId));
    } else if (args.clientId) {
      contacts = contacts.withIndex("by_client", (q) => q.eq("clientId", args.clientId));
    } else if (args.status) {
      contacts = contacts.withIndex("by_status", (q) => q.eq("status", args.status));
    }
    
    let contactsList = await contacts.collect();
    
    // Apply search filter if provided (we need to get full data to search)
    if (args.search) {
      // For counting, we need to do the same enrichment and filtering as in the main query
      // This is expensive but necessary for accurate counts with search
      const enrichedContacts = await Promise.all(contactsList.map(async (contact) => {
        try {
          const lead = await ctx.db.get(contact.leadId);
          return {
            ...contact,
            firstName: lead?.firstName || '',
            lastName: lead?.lastName || '',
            email: lead?.email || '',
            jobTitle: lead?.jobTitle || '',
          };
        } catch (error) {
          return {
            ...contact,
            firstName: '',
            lastName: '',
            email: '',
            jobTitle: '',
          };
        }
      }));
      
      const searchLower = args.search.toLowerCase();
      const filteredContacts = enrichedContacts.filter(contact => {
        return (
          contact.firstName?.toLowerCase().includes(searchLower) ||
          contact.lastName?.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.jobTitle?.toLowerCase().includes(searchLower)
        );
      });
      
      return filteredContacts.length;
    }
    
    return contactsList.length;
  },
});

// Get contact by ID with full enrichment
export const getById = query({
  args: { id: v.id("contacts") },
  returns: v.union(v.object({
    _id: v.id("contacts"),
    _creationTime: v.number(),
    leadId: v.id("leads"),
    clientId: v.id("clients"),
    companyId: v.id("companies"),
    purchasedAt: v.number(),
    status: v.optional(v.string()),
    lastCommunicationAt: v.optional(v.number()),
    optedIn: v.optional(v.boolean()),
    fullEnrichment: v.optional(v.boolean()),
    suggestedCampaignId: v.optional(v.id("campaigns")),
    lastAssignmentAt: v.optional(v.number()),
    // Lead data
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    mobilePhone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    seniority: v.optional(v.string()),
    functionGroup: v.optional(v.string()),
    country: v.optional(v.string()),
    state: v.optional(v.string()),
    city: v.optional(v.string()),
    // Company data
    companyName: v.optional(v.string()),
    companyWebsite: v.optional(v.string()),
    companyDomain: v.optional(v.string()),
    companyLinkedinUrl: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    companySummary: v.optional(v.string()),
    shortCompanySummary: v.optional(v.string()),
    companySize: v.optional(v.number()),
    companyCity: v.optional(v.string()),
    companyState: v.optional(v.string()),
    companyCountry: v.optional(v.string()),
    // Additional fields that might be present
    name: v.optional(v.string()),
  }), v.null()),
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.id);
    if (!contact) return null;
    
    // Get lead and company data
    const [lead, company] = await Promise.all([
      ctx.db.get(contact.leadId),
      ctx.db.get(contact.companyId)
    ]);
    
    return {
      ...contact,
      // Lead data
      firstName: lead?.firstName,
      lastName: lead?.lastName,
      email: lead?.email,
      mobilePhone: lead?.mobilePhone,
      linkedinUrl: lead?.linkedinUrl,
      jobTitle: lead?.jobTitle,
      seniority: lead?.seniority,
      functionGroup: lead?.functionGroup,
      country: lead?.country,
      state: lead?.state,
      city: lead?.city,
      // Company data
      companyName: company?.name,
      companyWebsite: company?.website,
      companyDomain: company?.domain,
      companyLinkedinUrl: company?.companyLinkedinUrl,
      industryLabel: company?.industryLabel,
      subindustryLabel: company?.subindustryLabel,
      companySummary: company?.companySummary,
      shortCompanySummary: company?.shortCompanySummary,
      companySize: company?.companySize,
      companyCity: company?.city,
      companyState: company?.state,
      companyCountry: company?.country,
    };
  },
});

// Get deals for a contact
export const getDeals = query({
  args: { contactId: v.id("contacts") },
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
  })),
  handler: async (ctx, args) => {
    try {
      const deals = await ctx.db
        .query("deals")
        .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
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
      // Fallback: return empty array if index doesn't exist
      console.log("Deals index not found, returning empty array");
      return [];
    }
  },
});

// Get activities for a contact
export const getActivities = query({
  args: { contactId: v.id("contacts"), limit: v.optional(v.number()) },
  returns: v.array(v.object({
    _id: v.id("activityLog"),
    _creationTime: v.number(),
    action: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    priority: v.optional(v.string()),
    isSystemGenerated: v.optional(v.boolean()),
    timestamp: v.optional(v.number()),
    metadata: v.optional(v.any()),
  })),
  handler: async (ctx, args) => {
    try {
      return await ctx.db
        .query("activityLog")
        .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
        .order("desc")
        .take(args.limit || 50);
    } catch (error) {
      // Fallback: return empty array if index doesn't exist
      console.log("ActivityLog index not found, returning empty array");
      return [];
    }
  },
});

// Get communications for a contact
export const getCommunications = query({
  args: { contactId: v.id("contacts"), limit: v.optional(v.number()) },
  returns: v.array(v.object({
    _id: v.id("communications"),
    _creationTime: v.number(),
    direction: v.string(),
    channel: v.string(),
    type: v.optional(v.string()),
    timestamp: v.number(),
    content: v.optional(v.string()),
    sentiment: v.optional(v.string()),
    isFirstMessage: v.optional(v.boolean()),
    isLastMessage: v.optional(v.boolean()),
    isAutomated: v.optional(v.boolean()),
    isRead: v.optional(v.boolean()),
    campaignName: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    try {
      const communications = await ctx.db
        .query("communications")
        .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
        .order("desc")
        .take(args.limit || 50);
      
      // Enrich with campaign data
      const enrichedCommunications = await Promise.all(communications.map(async (comm) => {
        let campaignName = undefined;
        if (comm.campaignId) {
          const campaign = await ctx.db.get(comm.campaignId);
          campaignName = campaign?.name;
        }
        
        return {
          ...comm,
          campaignName,
        };
      }));
      
      return enrichedCommunications;
    } catch (error) {
      // Fallback: return empty array if index doesn't exist
      console.log("Communications index not found, returning empty array");
      return [];
    }
  },
});

// Get notes for a contact
export const getNotes = query({
  args: { contactId: v.id("contacts") },
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
        .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
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
      // Fallback: return empty array if index doesn't exist
      console.log("Notes index not found, returning empty array");
      return [];
    }
  },
});

// Get campaigns for a contact
export const getCampaigns = query({
  args: { contactId: v.id("contacts") },
  returns: v.array(v.object({
    _id: v.id("campaignContacts"),
    _creationTime: v.number(),
    status: v.optional(v.string()),
    addedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    nextEligibleAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    campaignName: v.optional(v.string()),
    campaignType: v.optional(v.string()),
    campaignStatus: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    try {
      const campaignContacts = await ctx.db
        .query("campaignContacts")
        .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
        .order("desc")
        .collect();
      
      // Enrich with campaign data
      const enrichedCampaignContacts = await Promise.all(campaignContacts.map(async (cc) => {
        const campaign = await ctx.db.get(cc.campaignId);
        
        return {
          ...cc,
          campaignName: campaign?.name,
          campaignType: campaign?.type,
          campaignStatus: campaign?.status,
        };
      }));
      
      return enrichedCampaignContacts;
    } catch (error) {
      // Fallback: return empty array if index doesn't exist
      console.log("Campaign contacts index not found, returning empty array");
      return [];
    }
  },
});

// Create new contact
export const create = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    clientId: v.optional(v.id("clients")),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    mobilePhone: v.optional(v.string()),
    companyPhone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    seniority: v.optional(v.string()),
    functionGroup: v.optional(v.string()),
    status: v.optional(v.string()),
    country: v.optional(v.string()),
    state: v.optional(v.string()),
    city: v.optional(v.string()),
    userId: v.optional(v.string()), // Voor activity logging
  },
  returns: v.id("contacts"),
  handler: async (ctx, args) => {
    const { userId, ...contactData } = args;
    
    const contactId = await ctx.db.insert("contacts", {
      ...contactData,
      status: contactData.status || "cold",
      tags: [],
      optedIn: false,
    });
    
    // Log activity
    if (contactData.clientId) {
      const contactName = `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim() || 'New Contact';
      
      await ctx.runMutation(internal.activityLogger.logActivityInternal, {
        clientId: contactData.clientId,
        userId: userId,
        action: "contact_created",
        description: `Created contact: ${contactName}${contactData.jobTitle ? ` (${contactData.jobTitle})` : ''}`,
        contactId: contactId,
        companyId: contactData.companyId,
        category: "contact",
        priority: "high",
        metadata: {
          email: contactData.email,
          jobTitle: contactData.jobTitle,
          functionGroup: contactData.functionGroup,
          status: contactData.status || "cold",
        },
      });
    }
    
    return contactId;
  },
});

// Update contact
export const update = mutation({
  args: {
    id: v.id("contacts"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    mobilePhone: v.optional(v.string()),
    companyPhone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    seniority: v.optional(v.string()),
    functionGroup: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isLinkedinConnected: v.optional(v.boolean()),
    optedIn: v.optional(v.boolean()),
    userId: v.optional(v.string()), // Voor activity logging
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, userId, ...updateData } = args;
    
    // Get existing contact for comparison
    const existingContact = await ctx.db.get(id);
    if (!existingContact) {
      throw new Error("Contact not found");
    }
    
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(cleanData).length > 0) {
      await ctx.db.patch(id, cleanData);
      
      // Log activity for significant changes
      const contactName = `${existingContact.firstName || ''} ${existingContact.lastName || ''}`.trim() || 'Contact';
      const changes = [];
      
      // Track significant changes
      if (cleanData.status && cleanData.status !== existingContact.status) {
        changes.push(`status: ${existingContact.status} → ${cleanData.status}`);
      }
      
      if (cleanData.jobTitle && cleanData.jobTitle !== existingContact.jobTitle) {
        changes.push(`job title: ${existingContact.jobTitle || 'none'} → ${cleanData.jobTitle}`);
      }
      
      if (cleanData.email && cleanData.email !== existingContact.email) {
        changes.push(`email: ${existingContact.email || 'none'} → ${cleanData.email}`);
      }
      
      if (cleanData.functionGroup && cleanData.functionGroup !== existingContact.functionGroup) {
        changes.push(`function group: ${existingContact.functionGroup || 'none'} → ${cleanData.functionGroup}`);
      }
      
      if (cleanData.isLinkedinConnected !== undefined && cleanData.isLinkedinConnected !== existingContact.isLinkedinConnected) {
        changes.push(`LinkedIn: ${existingContact.isLinkedinConnected ? 'connected' : 'not connected'} → ${cleanData.isLinkedinConnected ? 'connected' : 'not connected'}`);
      }
      
      // Log activity based on type of change
      if (cleanData.status && cleanData.status !== existingContact.status) {
        await ctx.runMutation(internal.activityLogger.logActivityInternal, {
          clientId: existingContact.clientId!,
          userId: userId,
          action: "contact_status_changed",
          description: `Changed ${contactName} status from ${existingContact.status} to ${cleanData.status}`,
          contactId: id,
          companyId: existingContact.companyId,
          category: "contact",
          priority: "medium",
          metadata: {
            oldStatus: existingContact.status,
            newStatus: cleanData.status,
            allChanges: changes,
          },
        });
      } else if (changes.length > 0) {
        await ctx.runMutation(internal.activityLogger.logActivityInternal, {
          clientId: existingContact.clientId!,
          userId: userId,
          action: "contact_updated",
          description: `Updated ${contactName}: ${changes.join(', ')}`,
          contactId: id,
          companyId: existingContact.companyId,
          category: "contact",
          priority: "low",
          metadata: {
            changes: changes,
            fieldsUpdated: Object.keys(cleanData),
          },
        });
      }
    }
    
    return null;
  },
});

// Delete contact
export const remove = mutation({
  args: { id: v.id("contacts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

// Get contacts by company
export const getByCompany = query({
  args: { companyId: v.id("companies") },
  returns: v.array(v.object({
    _id: v.id("contacts"),
    _creationTime: v.number(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    status: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contacts")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .collect();
  },
});