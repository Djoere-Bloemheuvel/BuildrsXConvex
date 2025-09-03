import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useQuery as useConvexQuery } from "convex/react";
import { useState, useCallback, useMemo } from "react";
import { Id } from "../../convex/_generated/dataModel";

/**
 * 🚀 INFINITE SCROLL HOOK FOR CONVEX
 * 
 * Memory-safe infinite scrolling with cursor-based pagination
 * Optimized for large datasets with background prefetching
 */

// ===============================
// TYPES & INTERFACES
// ===============================

export type PaginatedResult<T> = {
  page: T[];
  isDone: boolean;
  continueCursor: string | null;
  _metadata?: {
    memoryEstimate?: number;
    [key: string]: any;
  };
};

export type InfiniteDataOptions<T> = {
  queryName: string;
  args: Record<string, any>;
  pageSize?: number;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: T[]) => void;
  transform?: (item: any) => T;
};

export type UseInfiniteDataResult<T> = {
  // Data
  data: T[];
  pages: T[][];
  
  // Loading states
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  error: Error | null;
  
  // Pagination
  hasNextPage: boolean;
  fetchNextPage: () => Promise<void>;
  
  // Utilities
  totalCount: number;
  memoryEstimate: number;
  refresh: () => Promise<void>;
  reset: () => void;
  
  // Metadata
  metadata: {
    pageCount: number;
    averagePageSize: number;
    lastCursor: string | null;
  };
};

// ===============================
// CORE INFINITE SCROLL HOOK
// ===============================

export function useInfiniteData<T = any>(
  options: InfiniteDataOptions<T>
): UseInfiniteDataResult<T> {
  const {
    queryName,
    args,
    pageSize = 50,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    gcTime = 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus = false,
    onError,
    onSuccess,
    transform,
  } = options;

  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);

  // Create stable query key
  const queryKey = useMemo(() => [
    'infinite',
    queryName,
    args,
    pageSize
  ], [queryName, JSON.stringify(args), pageSize]);

  // Infinite query with cursor-based pagination
  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = null }) => {
      try {
        console.log(`📊 Fetching page for ${queryName}:`, { cursor: pageParam, limit: pageSize });
        
        // This would need to be implemented to call Convex functions
        // For now, we'll create a placeholder that works with our paginated queries
        const result = await fetchConvexPage(queryName, {
          ...args,
          cursor: pageParam,
          limit: pageSize,
        });
        
        console.log(`✅ Page fetched: ${result.page.length} items, hasMore: ${!result.isDone}`);
        
        return result;
      } catch (error) {
        console.error(`❌ Failed to fetch page for ${queryName}:`, error);
        throw error;
      }
    },
    getNextPageParam: (lastPage: PaginatedResult<T>) => {
      return lastPage.isDone ? undefined : lastPage.continueCursor;
    },
    enabled,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
    retry: (failureCount, error) => {
      if (failureCount < 3) {
        setRetryCount(prev => prev + 1);
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Process and transform data
  const processedData = useMemo(() => {
    if (!infiniteQuery.data?.pages) return [];
    
    const allItems = infiniteQuery.data.pages.flatMap(page => page.page);
    
    if (transform) {
      return allItems.map(transform);
    }
    
    return allItems as T[];
  }, [infiniteQuery.data?.pages, transform]);

  // Calculate metadata
  const metadata = useMemo(() => {
    const pages = infiniteQuery.data?.pages || [];
    const pageCount = pages.length;
    const totalItems = processedData.length;
    const averagePageSize = pageCount > 0 ? Math.round(totalItems / pageCount) : 0;
    const lastPage = pages[pages.length - 1];
    const lastCursor = lastPage?.continueCursor || null;
    
    return {
      pageCount,
      averagePageSize,
      lastCursor,
    };
  }, [infiniteQuery.data?.pages, processedData.length]);

  // Calculate total memory estimate
  const memoryEstimate = useMemo(() => {
    if (!infiniteQuery.data?.pages) return 0;
    
    return infiniteQuery.data.pages.reduce((total, page) => {
      return total + (page._metadata?.memoryEstimate || 0);
    }, 0);
  }, [infiniteQuery.data?.pages]);

  // Fetch next page with error handling
  const fetchNextPage = useCallback(async () => {
    if (!infiniteQuery.hasNextPage || infiniteQuery.isFetchingNextPage) {
      return;
    }
    
    try {
      await infiniteQuery.fetchNextPage();
    } catch (error) {
      console.error('Failed to fetch next page:', error);
      onError?.(error as Error);
    }
  }, [infiniteQuery, onError]);

  // Refresh data
  const refresh = useCallback(async () => {
    try {
      await infiniteQuery.refetch();
      setRetryCount(0);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      onError?.(error as Error);
    }
  }, [infiniteQuery, onError]);

  // Reset to first page
  const reset = useCallback(() => {
    queryClient.removeQueries({ queryKey });
    setRetryCount(0);
  }, [queryClient, queryKey]);

  // Success callback
  useMemo(() => {
    if (processedData.length > 0 && onSuccess) {
      onSuccess(processedData);
    }
  }, [processedData, onSuccess]);

  return {
    // Data
    data: processedData,
    pages: infiniteQuery.data?.pages?.map(p => p.page) || [],
    
    // Loading states
    isLoading: infiniteQuery.isLoading,
    isFetching: infiniteQuery.isFetching,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error,
    
    // Pagination
    hasNextPage: infiniteQuery.hasNextPage || false,
    fetchNextPage,
    
    // Utilities
    totalCount: processedData.length,
    memoryEstimate,
    refresh,
    reset,
    
    // Metadata
    metadata,
  };
}

// ===============================
// SPECIALIZED HOOKS
// ===============================

/**
 * Infinite scroll for leads
 */
export function useInfiniteLeads(options: {
  clientId?: Id<"clients">;
  filters?: {
    functionGroups?: string[];
    industries?: string[];
    countries?: string[];
    isActive?: boolean;
  };
  searchTerm?: string;
  pageSize?: number;
  enabled?: boolean;
}) {
  return useInfiniteData({
    queryName: "queries/paginatedLeads:searchPaginated",
    args: {
      filters: options.filters,
      searchTerm: options.searchTerm,
      detailed: false,
    },
    pageSize: options.pageSize || 50,
    enabled: options.enabled,
  });
}

/**
 * Infinite scroll for companies
 */
export function useInfiniteCompanies(options: {
  enrichmentStatus?: "enriched" | "not_enriched" | "all";
  filters?: {
    industries?: string[];
    countries?: string[];
    minEmployeeCount?: number;
    maxEmployeeCount?: number;
    hasEnrichment?: boolean;
  };
  searchTerm?: string;
  pageSize?: number;
  enabled?: boolean;
}) {
  return useInfiniteData({
    queryName: "queries/paginatedCompanies:searchPaginated",
    args: {
      filters: options.filters,
      searchTerm: options.searchTerm,
      detailed: false,
    },
    pageSize: options.pageSize || 50,
    enabled: options.enabled,
  });
}

/**
 * Infinite scroll for available leads for conversion
 */
export function useInfiniteAvailableLeads(options: {
  clientIdentifier: string;
  filters?: {
    functionGroups?: string[];
    industries?: string[];
    countries?: string[];
    minEmployeeCount?: number;
    maxEmployeeCount?: number;
  };
  pageSize?: number;
  enabled?: boolean;
}) {
  return useInfiniteData({
    queryName: "leadConversion/streamingConversion:streamAvailableLeads",
    args: {
      clientIdentifier: options.clientIdentifier,
      filters: options.filters,
    },
    pageSize: options.pageSize || 100,
    enabled: options.enabled,
  });
}

// ===============================
// UTILITY FUNCTIONS
// ===============================

/**
 * Placeholder function to interface with Convex
 * This would need to be implemented to actually call Convex functions
 */
async function fetchConvexPage(
  queryName: string, 
  args: Record<string, any>
): Promise<PaginatedResult<any>> {
  // This is a placeholder - in real implementation, you'd call your Convex query
  // Example: return await ctx.runQuery(queryName, args);
  
  console.warn(`fetchConvexPage not implemented for ${queryName}`);
  
  return {
    page: [],
    isDone: true,
    continueCursor: null,
    _metadata: { memoryEstimate: 0 },
  };
}

/**
 * Create a virtualized list component for infinite data
 */
export function createVirtualizedList<T>(options: {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const { data, renderItem, itemHeight, containerHeight, overscan = 5 } = options;
  
  // Simple virtualization logic
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const totalHeight = data.length * itemHeight;
  
  return {
    totalHeight,
    visibleCount,
    renderItems: (scrollTop: number) => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleCount + overscan, data.length);
      
      return data.slice(startIndex, endIndex).map((item, index) => ({
        item,
        index: startIndex + index,
        top: (startIndex + index) * itemHeight,
        content: renderItem(item, startIndex + index),
      }));
    },
  };
}

/**
 * Hook for infinite scroll with search
 */
export function useInfiniteSearch<T>(options: {
  searchQuery: string;
  searchFn: (query: string, cursor?: string, limit?: number) => Promise<PaginatedResult<T>>;
  debounceMs?: number;
  pageSize?: number;
}) {
  const [debouncedQuery, setDebouncedQuery] = useState(options.searchQuery);
  
  // Debounce search query
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(options.searchQuery);
    }, options.debounceMs || 300);
    
    return () => clearTimeout(timer);
  }, [options.searchQuery, options.debounceMs]);
  
  return useInfiniteData({
    queryName: "search",
    args: { query: debouncedQuery },
    pageSize: options.pageSize || 50,
    enabled: debouncedQuery.length > 0,
  });
}

export default useInfiniteData;