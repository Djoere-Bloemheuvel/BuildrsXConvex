# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 🚀 Buildrs Core Suite - Development Guide

## 📋 Project Overview

**Buildrs Core Suite** is a modern multi-tenant CRM and lead generation platform built with React, TypeScript, and Convex. The application manages companies, contacts, deals, campaigns, and provides advanced analytics for business development teams with sophisticated automation and credit-based billing.

### 🏗️ Architecture Stack
- **Frontend**: React 18 + TypeScript + Vite (port 8080)
- **Backend**: Convex (Real-time database + functions)
- **Authentication**: Clerk + Convex Auth with automated client management
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: Convex React hooks with real-time updates
- **External APIs**: Instantly.ai, Firecrawl, Perplexity AI, Stripe
- **Build Tool**: Lovable integration for rapid development

---

## 🎯 Key Features

### 🏢 **CRM Core**
- **Companies**: Company profiles with enrichment data
- **Contacts**: Contact management with relationship tracking
- **Deals**: Sales pipeline with stages and forecasting
- **Activities**: Complete activity timeline and logging

### 📧 **Campaign Management**
- **Email Campaigns**: Multi-step email sequences
- **LinkedIn Campaigns**: Professional outreach automation
- **ABM Campaigns**: Account-based marketing targeting
- **Performance Analytics**: Response rates, conversion tracking

### 📊 **Analytics & Insights**
- **Client Performance**: Comprehensive client dashboards
- **Campaign Effectiveness**: Response rates, ROI analysis
- **Pipeline Forecasting**: Deal probability and weighted values
- **Meeting Preparation**: Context-aware meeting briefings

---

## 🚀 Development Commands

### **Start Development Environment**
```bash
# Frontend (Vite) - runs on http://localhost:8080
npm run dev

# Backend (Convex) - real-time database + functions
npx convex dev

# Both simultaneously (recommended)
npm run dev & npx convex dev
```

### **Build & Production**
```bash
# Build for production
npm run build

# Build for development
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview

# Deploy to Convex
npx convex deploy
```

### **Testing Commands**
```bash
# Test Instantly integration (correct JSON format)
npx convex run testInstantlyIntegration:testToggleCampaignStatus '{"clientId": "client_id", "testWithRealApi": false}'

# Test error handling
npx convex run testInstantlyIntegration:testInstantlyApiErrorHandling '{"clientId": "client_id"}'

# Query data from specific tables
npx convex data clients
npx convex data contacts
npx convex data campaigns

# Test queries with parameters
npx convex run contacts:list '{"clientId": "client_id", "limit": 10}'
npx convex run companies:list '{"clientId": "client_id"}'
```

### **Database Management**
```bash
# View Convex dashboard
npx convex dashboard

# Check environment variables
npx convex env list

# Reset/clear data (development only)
npx convex run clearData

# Import/export data
npx convex import
npx convex export
```

### **Authentication Setup**
```bash
# Set Clerk secret in Convex
npx convex env set CLERK_SECRET_KEY sk_test_your_key_here

# Check auth configuration
npx convex logs
```

---

## 🗄️ Database Schema (Convex)

### **Core Entities**

#### **Clients**
- Client organizations with subscription info
- Multi-tenant architecture support

#### **Companies** 
- Company profiles with enrichment data
- Industry, size, location metadata
- Keywords and targeting information

#### **Contacts**
- Individual contact records
- Job titles, seniority, function groups
- LinkedIn connection status and engagement

#### **Deals**
- Sales opportunities with pipeline stages
- Values, confidence scores, forecasting
- Contact and company relationships

#### **Campaigns**
- Email and LinkedIn outreach campaigns
- Targeting criteria and performance metrics
- Multi-step sequences and automation

#### **Communications**
- All communication history (email, LinkedIn)
- Open/click tracking, response data
- Campaign attribution and metrics

---

## 🔧 Complex Views & Business Logic

### **Candidate Selection Views** (`convex/candidateViews.ts`)

#### **ABM Candidates**
```typescript
// Get ABM-eligible companies with 2+ decision makers
const abmCandidates = await ctx.runQuery("candidateViews:abmCandidates", {
  minCompanySize: 25,
  excludeDoNotContact: true
});
```

**Business Rules:**
- Companies with ≥25 employees
- ≥2 decision makers from key function groups
- Time-based communication eligibility:
  - 0-2 campaigns: 30-day cooldown
  - 3-4 campaigns: 45-day cooldown
  - 5-6 campaigns: 60-day cooldown
  - 7+ campaigns: 90-day cooldown

#### **Cold Email Candidates**
```typescript
// Get contacts eligible for cold email outreach
const coldEmailCandidates = await ctx.runQuery("candidateViews:coldEmailCandidates", {
  includeAssignable: true
});
```

**Business Rules:**
- Status: "cold" contacts only
- Excludes ABM candidates (different strategy)
- No active campaigns (planned/active status)
- Same time-based eligibility as ABM

#### **LinkedIn Candidates**
```typescript
// Get contacts for LinkedIn outreach
const linkedinCandidates = await ctx.runQuery("candidateViews:linkedinCandidates", {
  minCompanySize: 5
});
```

**Business Rules:**
- Warm/cold contacts not yet LinkedIn connected
- Company size ≥5 employees
- Not in active LinkedIn campaigns
- No recent communications (14-day buffer)
- No active email campaigns

### **Timeline Views** (`convex/timelineViews.ts`)

#### **Full Timeline**
```typescript
// Get complete activity timeline for contact/company
const timeline = await ctx.runQuery("timelineViews:fullTimeline", {
  contactId: "...",
  fromDate: Date.now() - 90*24*60*60*1000, // 90 days
  limit: 100
});
```

**Includes:**
- All communications (email, LinkedIn)
- Campaign enrollments and status changes
- Deal creation and stage movements
- Activity log entries with metadata

#### **Meeting Preparation**
```typescript
// Get comprehensive meeting context
const meetingPrep = await ctx.runQuery("timelineViews:meetingPrep", {
  contactIds: ["contact1", "contact2"],
  companyId: "company123",
  includePastDays: 30
});
```

**Provides:**
- Attendee relationship scores
- Recent communications summary
- Active campaigns and deals
- Company intelligence metrics
- AI-generated talking points

### **Search & Analytics** (`convex/searchViews.ts`)

#### **Global Search**
```typescript
// Search across all entities with relevance scoring
const results = await ctx.runQuery("searchViews:globalSearch", {
  searchTerm: "buildrs",
  entityTypes: ["companies", "contacts", "deals"],
  limit: 20
});
```

#### **Advanced Contact Search**
```typescript
// Sophisticated contact filtering with facets
const searchResults = await ctx.runQuery("searchViews:advancedContactSearch", {
  functionGroups: ["Marketing Decision Makers"],
  industries: ["Technology"],
  companySizeMin: 50,
  responseRate: 10,
  sortBy: "responseRate",
  limit: 50
});
```

---

## 🔐 Authentication Flow (Clerk + Convex)

### **Setup Process**
1. **Clerk Project**: Create at https://dashboard.clerk.com
2. **Environment Variables**:
   ```bash
   # .env.local
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   
   # Convex environment
   npx convex env set CLERK_SECRET_KEY sk_test_...
   ```

### **Implementation**
```typescript
// Custom auth hook with client management
import { useConvexAuth } from '@/hooks/useConvexAuth';

function MyComponent() {
  const { user, isAuthenticated, isLoaded, getClientId } = useConvexAuth();
  const clientId = getClientId();
  
  // Always check loading state first
  if (!isLoaded) return <div>Loading...</div>;
  
  // Then check authentication
  if (!isAuthenticated || !clientId) return <div>Please sign in</div>;
  
  return (
    <div>
      <h1>Welcome {user?.name}!</h1>
      <p>Client: {clientId}</p>
    </div>
  );
}
```

**Authentication Flow:**
1. `useConvexAuth` automatically creates/links clients via `autoClientManager`
2. Always check `isLoaded` before `isAuthenticated` to avoid race conditions
3. Use `getClientId()` to get the current user's client ID for queries
4. The system automatically handles client creation based on user email domain

### **Protected Convex Functions**
```typescript
import { authenticatedQuery } from '@convex-dev/auth/server';

export const myQuery = authenticatedQuery({
  args: {},
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    // User is authenticated here
    return await ctx.db.query("companies").collect();
  },
});
```

---

## 📊 Performance Considerations

### **Query Optimization**
- Use indexed queries for large datasets
- Batch related data fetching
- Implement pagination for lists
- Cache expensive calculations

### **Real-time Updates**
```typescript
// Convex automatically handles real-time updates
const campaigns = useQuery("campaigns:list", { clientId });
// UI updates automatically when data changes
```

### **Data Loading Patterns**
```typescript
// Optimistic updates for better UX
const updateCampaign = useMutation("campaigns:update");

const handleUpdate = async (data) => {
  try {
    await updateCampaign({ id, ...data });
    toast.success("Campaign updated!");
  } catch (error) {
    toast.error("Update failed");
  }
};
```

---

## 🧩 Convex Function Guidelines

### **Function Syntax (CRITICAL)**
Always use the new function syntax for Convex functions with comprehensive type validation:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getCompanies = query({
  args: { clientId: v.id("clients") },
  returns: v.array(v.object({ 
    _id: v.id("companies"), 
    name: v.string(),
    // Always include ALL fields that might be returned from database
    website: v.optional(v.string()),
    industryLabel: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("companies")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();
  },
});
```

**Critical Notes:**
- Return validators MUST include all fields that may be present in database records
- Missing fields in validators will cause runtime errors
- Use `v.optional()` for fields that may not exist on all records
- Always use indexed queries with `withIndex` for client isolation

### **Function Registration & Calling**
- Use `query`, `mutation`, `action` for public functions
- Use `internalQuery`, `internalMutation`, `internalAction` for private functions
- Always include argument and return validators
- Use `ctx.runQuery`, `ctx.runMutation`, `ctx.runAction` to call functions

### **Database Operations**
- DO NOT use `filter` in queries - use indexed queries with `withIndex`
- Use `ctx.db.patch` for partial updates, `ctx.db.replace` for full replacement
- Always create proper indexes in schema for query performance

### **HTTP Endpoints**
HTTP endpoints are defined in `convex/http.ts`:
```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();
http.route({
  path: "/webhook/instantly",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    // Handle webhook
  }),
});
```

---

## 🏗️ Multi-Tenant Architecture

### **Client Isolation**
Every entity has a `clientId` field for tenant isolation:

```typescript
// Always filter by clientId in queries
const contacts = await ctx.db
  .query("contacts")
  .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
  .collect();
```

### **Smart Assignment Queue**
The system includes automated contact assignment:
- `contacts.suggestedCampaignId` - pending assignment queue
- `contacts.lastAssignmentAt` - assignment timestamp tracking
- Smart assignment considers function groups, industries, and timing rules

---

## 🔧 Development Workflow

### **1. Feature Development**
```bash
# Create feature branch
git checkout -b feature/new-campaign-type

# Start development servers
npm run dev & npx convex dev

# Make changes and test
# Commit and push
```

### **2. Schema Changes**
```bash
# Update convex/schema.ts
# Deploy schema changes
npx convex deploy

# Update React components to use new schema
# Test migration with existing data
```

### **3. Data Migration**
```bash
# Create migration script in convex/
# Run migration
npx convex run migrationScript

# Verify data integrity
npx convex dashboard
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **Convex Connection Issues**
```bash
# If you get "No access to project"
npx convex dev --configure=new

# If environment variables don't work
npx convex env list
npx convex env set CLERK_SECRET_KEY your_key_here
```

#### **Authentication Problems**
```bash
# Check Clerk configuration
# Verify publishable key in .env.local
# Ensure secret key is set in Convex
npx convex env list
```

#### **Real-time Updates Not Working**
```bash
# Check Convex connection status
npx convex logs

# Verify subscription patterns in React
# Check browser network tab for WebSocket connection
```

### **Performance Issues**
- Check query efficiency in Convex dashboard
- Implement pagination for large result sets
- Use indexes for filtered queries
- Consider data denormalization for complex views

---

## 📚 Key Files & Directories

### **Frontend Structure**
```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication (Clerk + Convex)
│   ├── ui/             # shadcn/ui components
│   ├── email/          # Email campaign components
│   ├── lead/           # Lead management components
│   └── settings/       # Settings panels
├── pages/              # Route components
│   ├── LeadDatabase.tsx # Lead database management
│   ├── LeadEmail.tsx    # Email campaign management  
│   ├── LeadLinkedIn.tsx # LinkedIn campaign management
│   ├── Companies.tsx    # Company management
│   └── ops/            # Operations management pages
├── hooks/              # Custom React hooks
│   ├── useConvexAuth.tsx # Convex authentication
│   └── useInfiniteData.ts # Infinite scroll data loading
├── integrations/       # External service integrations
│   └── convex/         # Convex client configuration
└── lib/                # Utilities (Firecrawl, Perplexity)
```

### **Backend Structure (Convex)**
```
convex/
├── schema.ts              # Database schema (25+ tables)
├── auth.config.ts         # Clerk authentication config
├── autoClientManager.ts   # Automated client creation/linking
├── companies.ts           # Company CRUD operations
├── contacts.ts            # Contact management with client isolation
├── deals.ts              # Deal pipeline functions
├── campaigns.ts          # Email campaign management + Instantly integration
├── candidateViews.ts     # Complex candidate selection logic
├── timelineViews.ts      # Activity timeline functions
├── searchViews.ts        # Search and filtering
├── creditSystem.ts       # Credit-based billing system
├── automationEngine.ts   # Campaign automation with templates
├── automationScheduler.ts # Automation scheduling and execution
├── leadConversion.ts     # Lead purchasing and conversion
├── smartAssignmentQueue.ts # Automated contact assignment
├── stripeIntegration.ts  # Payment processing
├── http.ts               # HTTP endpoints and webhooks
├── mutations/            # Batch operations
├── queries/              # Paginated queries
└── utils/                # Memory-optimized utilities
```

### **Critical Integration Files**
- `convex/http.ts` - Webhook endpoints for external services
- `src/lib/firecrawl.ts` - Web scraping integration
- `src/lib/perplexity.ts` - AI research integration  
- `convex/testInstantlyIntegration.ts` - Email API testing

---

## 🔌 External API Integrations

### **Instantly.ai Email Campaigns**
- Production-ready integration with Instantly API v2
- Campaign status synchronization (activation only)
- Environment variable: `INSTANTLY_API_KEY`
- Atomic operations ensure data consistency

### **Firecrawl Web Scraping**
- Company data enrichment from websites
- Integration via `@mendable/firecrawl-js`
- Used in company research and profiling

### **Perplexity AI Research**  
- AI-powered company and contact research
- Integration via `@ai-sdk/perplexity`
- Enhanced lead qualification and insights

### **Clerk Authentication**
- User authentication and session management
- Multi-tenant client isolation
- Environment variables: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

---

## ⚠️ Important Development Notes

### **Authentication & Client Management**
- **Automatic Client Creation**: The `autoClientManager` automatically creates client records based on user email domains
- **Race Conditions**: Always check `isLoaded` before `isAuthenticated` in React components
- **Client ID Usage**: Use `getClientId()` from `useConvexAuth` hook for all queries
- **Multi-Tenant Isolation**: Every query must include `clientId` filtering

### **Convex Function Development**
- **Type Validation**: Return validators MUST include ALL database fields that might exist
- **Query Patterns**: Always use indexed queries with `withIndex` for performance
- **JSON Parameters**: Use proper JSON format for Convex CLI commands: `'{"key": "value"}'`
- **Error Handling**: Missing fields in validators cause runtime errors, not compile-time errors

### **Database Architecture**
- **Smart Assignment Queue**: Uses `suggestedCampaignId` and `lastAssignmentAt` fields on contacts
- **Denormalized Data**: Contacts table includes denormalized lead and company data for performance
- **Credit System**: Multi-tier billing with usage tracking per client
- **Automation Engine**: Template-based campaign automation with scheduling

### **Performance Considerations**
- Use indexed queries for all database operations
- Implement pagination for large datasets (`useInfiniteData.ts`)
- Batch operations where possible for external API calls
- Monitor Convex function execution times in dashboard
- Leverage denormalized data to avoid complex joins

---

## 🛠️ Common Development Patterns

### **Query with Client Isolation**
```typescript
// React component
const { getClientId } = useConvexAuth();
const clientId = getClientId();

const contacts = useQuery(api.contacts.list, 
  clientId ? { clientId, limit: 25 } : "skip"
);
```

### **Handling Loading States**
```typescript
const { isLoaded, isAuthenticated, getClientId } = useConvexAuth();
const clientId = getClientId();

// Loading states
if (!isLoaded) return <div>Loading auth...</div>;
if (!isAuthenticated || !clientId) return <div>Please sign in</div>;
if (data === undefined) return <div>Loading data...</div>;
```

### **Error Handling in Convex Functions**
```typescript
export const updateContact = mutation({
  args: { id: v.id("contacts"), updates: v.object({...}) },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.id);
    if (!contact) {
      throw new Error("Contact not found");
    }
    
    // Validate client access
    if (contact.clientId !== args.clientId) {
      throw new Error("Access denied");
    }
    
    return await ctx.db.patch(args.id, args.updates);
  }
});
```

---

## 📞 Support & Resources

- **Convex Docs**: https://docs.convex.dev
- **Clerk Docs**: https://docs.clerk.com
- **Instantly API Docs**: https://developer.instantly.ai
- **Lovable Platform**: https://lovable.dev/projects/57583b20-da0a-4fa3-96cc-27f4fc778e1e

---

*Last updated: 2025-08-27 | Multi-tenant CRM with advanced automation and credit billing*