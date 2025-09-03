# Deals Performance Optimization Backup - 2025-08-27

## Performance Issues Identified

### Critical Issue: N+1 Query Pattern in `deals.getByPipeline`
- **Problem**: For each deal, a separate company lookup is performed
- **Impact**: 50 deals = 50 extra database queries = ~1500ms load time
- **Location**: `convex/deals.ts` lines 315-338

### Secondary Issues
- Waterfall loading: pipelines → stages → deals (sequential)
- No caching of pipeline/stage data
- Frontend renders all deals at once (no virtualization)

## Files Backed Up
- `convex/deals.ts` - Original deals functions
- `src/pages/Deals.tsx` - Deals page component

## Optimization Plan
1. **Batch Company Queries**: Replace N+1 pattern with single batch query
2. **Preserve Exact Same Interface**: Keep same return types and API
3. **Parallel Query Loading**: Load related data simultaneously
4. **Safety First**: New function alongside old, test thoroughly

## Expected Performance Improvement
- **Before**: ~1500ms load time with 50 deals
- **After**: ~200-400ms load time 
- **Improvement**: 75-85% faster

## Safety Notes
- Original functions remain untouched during testing
- New optimized functions will be created with "_optimized" suffix
- Only switch after thorough testing confirms compatibility
- All existing functionality must work exactly the same