import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ===============================
  // CORE ENTITIES
  // ===============================
  
  clients: defineTable({
    // Legacy fields (keeping for backward compatibility)
    company: v.optional(v.string()),
    contact: v.optional(v.string()),
    phone: v.optional(v.string()),
    clientSummary: v.optional(v.string()),
    instantlyEmailListId: v.optional(v.string()),
    
    // New required fields
    name: v.optional(v.string()),
    domain: v.string(),
    email: v.string(),
    
    // Credit balances
    currentLeadCredits: v.optional(v.number()),
    currentEmailCredits: v.optional(v.number()),
    currentLinkedinCredits: v.optional(v.number()),
    currentAbmCredits: v.optional(v.number()),
    
    // Credit limits & settings
    creditLimits: v.optional(v.object({
      maxLeadCredits: v.number(),
      maxEmailCredits: v.number(),
      maxLinkedinCredits: v.number(),
      maxAbmCredits: v.number(),
      allowOverdraft: v.boolean(),
      overdraftLimit: v.number(),
    })),
    
    // Auto-topup settings
    autoTopup: v.optional(v.object({
      enabled: v.boolean(),
      triggerThreshold: v.number(),
      packageId: v.optional(v.id("creditPackages")),
    })),

    // Business rules tracking
    hasUsedStartPackage: v.optional(v.boolean()),
    hasReceivedFirstMonthBonus: v.optional(v.boolean()),
    subscriptionStatus: v.optional(v.string()),
    currentPackage: v.optional(v.id("creditPackages")),
    
    // Stripe integration
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_domain", ["domain"])
    .index("by_email", ["email"]),

  profiles: defineTable({
    fullName: v.optional(v.string()),
    email: v.string(),
    role: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    clerkUserId: v.optional(v.string()),
    name: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_client", ["clientId"])
    .index("by_email", ["email"]),

  // ===============================
  // CRM ENTITIES
  // ===============================

  companies: defineTable({
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
  }).index("by_domain", ["domain"])
    .index("by_industry", ["industrySlug"])
    .index("by_name", ["name"])
    .index("by_enrichment", ["fullEnrichment"]),

  contacts: defineTable({
    // Core relationship
    leadId: v.id("leads"),
    clientId: v.id("clients"),
    companyId: v.id("companies"),
    purchasedAt: v.number(),
    
    // Client-specific data
    status: v.optional(v.string()),
    lastCommunicationAt: v.optional(v.number()),
    optedIn: v.optional(v.boolean()),
    fullEnrichment: v.optional(v.boolean()),
    
    // Denormalized lead data
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    mobilePhone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    functionGroup: v.optional(v.string()),
    
    // Denormalized company data
    name: v.optional(v.string()),
    website: v.optional(v.string()),
    companyLinkedinUrl: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    companySummary: v.optional(v.string()),
    shortCompanySummary: v.optional(v.string()),
  }).index("by_lead_client", ["leadId", "clientId"], { unique: true })
    .index("by_client", ["clientId"])
    .index("by_lead", ["leadId"])
    .index("by_company", ["companyId"]),

  leads: defineTable({
    // Company relationship
    companyId: v.optional(v.id("companies")),
    
    // Personal information
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.string(),
    mobilePhone: v.optional(v.string()),
    companyPhone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    
    // Professional information
    jobTitle: v.optional(v.string()),
    seniority: v.optional(v.string()),
    functionGroup: v.optional(v.string()),
    functionGroupUpdatedAt: v.optional(v.number()),
    
    // Geographic information
    country: v.optional(v.string()),
    state: v.optional(v.string()),
    city: v.optional(v.string()),
    
    // Metadata
    addedAt: v.optional(v.number()),
    lastUpdatedAt: v.optional(v.number()),
    sourceType: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    
    // Engagement metrics
    totalTimesContacted: v.optional(v.number()),
    totalResponsesReceived: v.optional(v.number()),
    lastGlobalContactAt: v.optional(v.number()),
    globalResponseRate: v.optional(v.number()),
    
    // Lead quality
    leadScore: v.optional(v.number()),
    leadQuality: v.optional(v.string()),
    
    // Migration support
    originalContactId: v.optional(v.string()),
    lastFallbackProcessedAt: v.optional(v.number()),
  }).index("by_company", ["companyId"])
    .index("by_email_unique", ["email"], { unique: true })
    .index("by_function_group", ["functionGroup"])
    .index("by_country", ["country"]),

  // ===============================
  // CAMPAIGNS & PROPOSITIONS
  // ===============================

  propositions: defineTable({
    clientId: v.optional(v.id("clients")),
    name: v.string(),
    description: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    uniqueValue: v.optional(v.string()),
    problemsSolved: v.optional(v.string()),
    painTriggers: v.optional(v.string()),
    offerType: v.optional(v.string()),
    aiSummary: v.optional(v.string()),
    aiPersonalizationPrompt: v.optional(v.string()),
  }).index("by_client", ["clientId"]),

  campaigns: defineTable({
    clientId: v.optional(v.id("clients")),
    propositionId: v.optional(v.id("propositions")),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    status: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    autoAssignEnabled: v.optional(v.boolean()),
    audienceFilter: v.optional(v.object({
      functionGroups: v.optional(v.array(v.string())),
      industries: v.optional(v.array(v.string())),
      subindustries: v.optional(v.array(v.string())),
      countries: v.optional(v.array(v.string())),
      states: v.optional(v.array(v.string())),
      companySizeMin: v.optional(v.number()),
      companySizeMax: v.optional(v.number()),
    })),
    priority: v.optional(v.number()),
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
    companySummary: v.optional(v.string()),
    shortCompanySummary: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
    subindustryLabel: v.optional(v.string()),
    external_id: v.optional(v.string()),
  }).index("by_client", ["clientId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"]),

  campaignContacts: defineTable({
    campaignId: v.id("campaigns"),
    contactId: v.id("contacts"),
    clientId: v.optional(v.id("clients")),
    status: v.optional(v.string()),
    addedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    nextEligibleAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_campaign", ["campaignId"])
    .index("by_contact", ["contactId"]),

  // ===============================
  // LINKEDIN CAMPAIGNS
  // ===============================

  liCampaigns: defineTable({
    clientId: v.id("clients"),
    propositionId: v.id("propositions"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    functionGroups: v.array(v.string()),
    industries: v.array(v.string()),
    subindustries: v.array(v.string()),
    countries: v.array(v.string()),
    states: v.array(v.string()),
    companySizeMin: v.optional(v.number()),
    companySizeMax: v.optional(v.number()),
    connectionNoteA: v.optional(v.string()),
    connectionNoteB: v.optional(v.string()),
    messageA: v.optional(v.string()),
    messageB: v.optional(v.string()),
    followupA: v.optional(v.string()),
    followupB: v.optional(v.string()),
    dailyConnectLimit: v.number(),
    dailyMessageLimit: v.number(),
    windowStart: v.optional(v.string()),
    windowEnd: v.optional(v.string()),
    timezone: v.optional(v.string()),
    sentCount: v.number(),
    acceptedCount: v.number(),
    repliedCount: v.number(),
    bookedCount: v.number(),
    lastRunAt: v.optional(v.number()),
    phantombusterAgentId: v.optional(v.string()),
    phantombusterEnabled: v.boolean(),
  }).index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  // ===============================
  // DEALS & SALES PIPELINE
  // ===============================

  pipelines: defineTable({
    clientId: v.id("clients"),
    propositionId: v.id("propositions"),
    createdBy: v.optional(v.id("profiles")),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    isDefault: v.optional(v.boolean()),
    color: v.optional(v.string()),
    archived: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  }).index("by_client", ["clientId"]),

  stages: defineTable({
    pipelineId: v.id("pipelines"),
    name: v.string(),
    description: v.optional(v.string()),
    position: v.number(),
    isWon: v.optional(v.boolean()),
    isLost: v.optional(v.boolean()),
    defaultProbability: v.optional(v.number()),
  }).index("by_pipeline", ["pipelineId"]),

  deals: defineTable({
    contactId: v.optional(v.id("contacts")),
    companyId: v.optional(v.id("companies")),
    campaignId: v.optional(v.id("campaigns")),
    clientId: v.id("clients"),
    pipelineId: v.id("pipelines"),
    stageId: v.id("stages"),
    propositionId: v.optional(v.id("propositions")),
    ownerId: v.optional(v.id("profiles")),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    value: v.optional(v.number()),
    currency: v.optional(v.string()),
    confidence: v.optional(v.number()),
    priority: v.optional(v.number()),
    source: v.optional(v.string()),
    closedAt: v.optional(v.number()),
    isAutoCreated: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    meetingPrepSummary: v.optional(v.string()),
    extra: v.optional(v.object({})),
  }).index("by_client", ["clientId"])
    .index("by_contact", ["contactId"])
    .index("by_company", ["companyId"])
    .index("by_pipeline", ["pipelineId"])
    .index("by_stage", ["stageId"])
    .index("by_status", ["status"]),

  // ===============================
  // COMMUNICATIONS & NOTES
  // ===============================

  communications: defineTable({
    contactId: v.id("contacts"),
    campaignId: v.optional(v.id("campaigns")),
    clientId: v.id("clients"),
    direction: v.string(),
    channel: v.string(),
    type: v.optional(v.string()),
    timestamp: v.number(),
    content: v.optional(v.string()),
    metadata: v.optional(v.object({})),
    sentiment: v.optional(v.string()),
    isFirstMessage: v.optional(v.boolean()),
    isLastMessage: v.optional(v.boolean()),
    isAutomated: v.optional(v.boolean()),
    isRead: v.optional(v.boolean()),
  }).index("by_contact", ["contactId"])
    .index("by_campaign", ["campaignId"])
    .index("by_client", ["clientId"])
    .index("by_timestamp", ["timestamp"]),

  notes: defineTable({
    dealId: v.optional(v.id("deals")),
    contactId: v.optional(v.id("contacts")),
    companyId: v.optional(v.id("companies")),
    clientId: v.id("clients"),
    authorId: v.optional(v.id("profiles")),
    content: v.string(),
    type: v.optional(v.string()),
    isAiGenerated: v.optional(v.boolean()),
  }).index("by_deal", ["dealId"])
    .index("by_contact", ["contactId"])
    .index("by_company", ["companyId"])
    .index("by_client", ["clientId"]),

  // ===============================
  // ACTIVITY & AUDIT
  // ===============================

  activityLog: defineTable({
    dealId: v.optional(v.id("deals")),
    contactId: v.optional(v.id("contacts")),
    companyId: v.optional(v.id("companies")),
    campaignId: v.optional(v.id("campaigns")),
    clientId: v.id("clients"),
    userId: v.optional(v.id("profiles")),
    action: v.string(),
    category: v.optional(v.string()),
    priority: v.optional(v.string()),
    isSystemGenerated: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
    timestamp: v.optional(v.number()),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
  }).index("by_client", ["clientId"])
    .index("by_timestamp", ["timestamp"]),

  // ===============================
  // EMAIL & INDUSTRIES
  // ===============================

  emailDispatchLog: defineTable({
    clientId: v.id("clients"),
    contactId: v.id("contacts"),
    targetCampaignId: v.id("campaigns"),
    dispatchDate: v.string(),
    reservedAt: v.number(),
    deliveredAt: v.optional(v.number()),
    status: v.string(),
    httpStatus: v.optional(v.number()),
    error: v.optional(v.string()),
    response: v.optional(v.object({})),
  }).index("by_client", ["clientId"])
    .index("by_contact", ["contactId"])
    .index("by_campaign", ["targetCampaignId"]),

  industries: defineTable({
    slug: v.string(),
    label: v.string(),
    parentSlug: v.optional(v.string()),
    description: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
  }).index("by_slug", ["slug"]),

  locationAliases: defineTable({
    kind: v.string(),
    alias: v.string(),
    canonical: v.string(),
  }).index("by_kind_alias", ["kind", "alias"]),

  // ===============================
  // LEAD-CONTACT BRIDGING
  // ===============================

  leadPurchases: defineTable({
    leadId: v.id("leads"),
    clientId: v.id("clients"),
    contactId: v.id("contacts"),
    purchasePrice: v.optional(v.number()),
    purchaseMethod: v.optional(v.string()),
    purchasedAt: v.number(),
    purchasedBy: v.optional(v.id("profiles")),
  }).index("by_lead", ["leadId"])
    .index("by_client", ["clientId"])
    .index("by_contact", ["contactId"]),

  leadAvailability: defineTable({
    leadId: v.id("leads"),
    clientId: v.id("clients"),
    isAvailable: v.boolean(),
    restrictionReason: v.optional(v.string()),
    availableUntil: v.optional(v.number()),
  }).index("by_lead", ["leadId"])
    .index("by_client", ["clientId"]),

  // ===============================
  // CREDIT SYSTEM
  // ===============================

  creditTransactions: defineTable({
    transactionId: v.string(),
    clientId: v.id("clients"),
    creditType: v.string(),
    debitAmount: v.number(),
    creditAmount: v.number(),
    netAmount: v.number(),
    transactionType: v.string(),
    description: v.string(),
    referenceId: v.optional(v.string()),
    timestamp: v.number(),
    processedBy: v.optional(v.id("profiles")),
    systemGenerated: v.boolean(),
    batchId: v.optional(v.string()),
    balanceAfter: v.number(),
    runningTotal: v.number(),
    status: v.string(),
    errorMessage: v.optional(v.string()),
    parentTransactionId: v.optional(v.string()),
  }).index("by_client", ["clientId"])
    .index("by_idempotency", ["transactionId"])
    .index("by_timestamp", ["timestamp"]),

  creditPackages: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    leadCredits: v.number(),
    emailCredits: v.number(),
    linkedinCredits: v.number(),
    abmCredits: v.number(),
    firstMonthBonusLeadCredits: v.number(),
    price: v.number(),
    currency: v.string(),
    billingPeriod: v.string(),
    isActive: v.boolean(),
    validFrom: v.number(),
    validUntil: v.optional(v.number()),
    maxPurchasesPerDomain: v.optional(v.number()),
    isSpecialOffer: v.boolean(),
    autoUpgradeToPackage: v.optional(v.id("creditPackages")),
    stripeProductId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    isStripeIntegrated: v.optional(v.boolean()),
    priority: v.number(),
    isPopular: v.boolean(),
    features: v.array(v.string()),
    tags: v.array(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_slug", ["slug"], { unique: true })
    .index("by_active", ["isActive"]),

  // ===============================
  // AUTOMATION SYSTEM (SIMPLIFIED)
  // ===============================

  automationTemplates: defineTable({
    key: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    type: v.string(), // Required field from existing schema
    executionFunction: v.optional(v.string()),
    handlerFunction: v.optional(v.string()),
    defaultSettings: v.object({
      dailyLimit: v.optional(v.number()),
      executionTime: v.optional(v.string()),
      maxRetries: v.optional(v.number()),
      retryDelayMinutes: v.optional(v.number()),
      targetingOptions: v.array(v.string()),
      requiredCredits: v.optional(v.number()),
    }),
    validationRules: v.optional(v.object({
      requiredFields: v.array(v.string()),
      minDailyLimit: v.optional(v.number()),
      maxDailyLimit: v.optional(v.number()),
      allowedExecutionTimes: v.optional(v.array(v.string())),
    })),
    isActive: v.boolean(),
    version: v.string(),
    priority: v.optional(v.number()),
    compatibility: v.optional(v.array(v.string())),
    totalExecutions: v.optional(v.number()),
    successRate: v.optional(v.number()),
    lastExecuted: v.optional(v.number()),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  clientAutomations: defineTable({
    clientId: v.string(), // Keep as string for backwards compatibility
    templateId: v.optional(v.id("automationTemplates")),
    customName: v.optional(v.string()),
    isActive: v.boolean(),
    isPaused: v.optional(v.boolean()),
    
    // Targeting criteria (new format)
    targetingCriteria: v.optional(v.object({
      functionGroups: v.optional(v.array(v.string())),
      industries: v.optional(v.array(v.string())),
      countries: v.optional(v.array(v.string())),
      employeeMin: v.optional(v.number()),
      employeeMax: v.optional(v.number()),
      customFilters: v.optional(v.object({})),
    })),
    
    // Legacy fields (keeping for backward compatibility)
    targetFunctionGroups: v.optional(v.array(v.string())),
    targetIndustries: v.optional(v.array(v.string())),
    targetCountries: v.optional(v.array(v.string())),
    targetEmployeeMin: v.optional(v.number()),
    targetEmployeeMax: v.optional(v.number()),
    
    // Settings
    settings: v.optional(v.object({
      dailyLimit: v.optional(v.number()),
      executionTime: v.optional(v.string()),
      maxRetries: v.optional(v.number()),
      retryDelayMinutes: v.optional(v.number()),
      priority: v.optional(v.number()),
    })),
    
    // Legacy settings
    dailyLimit: v.number(),
    executionTime: v.optional(v.string()),
    
    // Execution tracking
    lastExecuted: v.optional(v.number()),
    lastExecutionStatus: v.optional(v.string()),
    consecutiveFailures: v.optional(v.number()),
    totalExecutions: v.optional(v.number()),
    totalConverted: v.number(),
    totalCreditsUsed: v.optional(v.number()),
    
    // Error handling
    lastError: v.optional(v.string()),
    nextRetryAt: v.optional(v.number()),
    
    // Metadata
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_client", ["clientId"])
    .index("by_template", ["templateId"])
    .index("by_active", ["isActive"]),

  // ===============================
  // SETTINGS
  // ===============================

  clientSettings: defineTable({
    clientId: v.id("clients"),
    settings: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_client", ["clientId"]),

});