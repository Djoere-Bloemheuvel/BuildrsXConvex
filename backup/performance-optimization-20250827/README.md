# Performance Optimization Backup - 2025-08-27

## Files Backed Up
- `candidateViews.ts` - Critical campaign candidate selection logic
- `exactLeadDatabase.ts` - Lead filtering and search functionality  
- `companies.ts` - Company management and enrichment
- `schema.ts` - Database schema definitions

## Performance Issues Identified

### 1. CandidateViews.ts (CRITICAL)
- `collect()` anti-pattern - loads ALL contacts into memory
- N+1 query problem in candidate filtering
- No pagination support
- Complex business logic mixed with data access

### 2. ExactLeadDatabase.ts (HIGH IMPACT)
- `collect()` on entire leads, companies, contacts tables
- In-memory filtering instead of database-level filtering
- No proper indexing strategy
- Offset-based pagination on full table scan

### 3. Companies.ts (MEDIUM IMPACT)  
- N+1 enrichment pattern with contacts
- Missing batch query optimizations

## Optimization Plan
1. Replace `collect()` with indexed queries
2. Implement batch queries to eliminate N+1 patterns
3. Add proper pagination with cursors
4. Denormalize frequently accessed data
5. Add search indexes for full-text search

## Safety Notes
- All changes will be made incrementally
- Each change will be tested before proceeding
- Original functionality must be preserved
- Real-time updates must continue working