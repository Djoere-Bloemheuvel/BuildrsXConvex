import { v } from "convex/values";

/**
 * 🧠 MEMORY-SAFE CONVEX UTILITIES
 * 
 * Core utilities for handling large datasets without memory crashes
 * Auto-scaling batch sizes, cursor-based pagination, memory monitoring
 */

// ===============================
// CONFIGURATION & CONSTANTS
// ===============================

export const MEMORY_CONFIGS = {
  // Conservative limits to stay well under 16MB Convex limit
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 10,
  
  // Batch processing limits
  DEFAULT_BATCH_SIZE: 20,
  MAX_BATCH_SIZE: 50,
  MIN_BATCH_SIZE: 5,
  
  // Memory thresholds (in bytes)
  MEMORY_WARNING_THRESHOLD: 12 * 1024 * 1024, // 12MB warning
  MEMORY_CRITICAL_THRESHOLD: 14 * 1024 * 1024, // 14MB critical
  
  // Processing delays for memory relief
  BATCH_DELAY_MS: 10,
  MEMORY_RELIEF_DELAY_MS: 50,
} as const;

// ===============================
// MEMORY MONITORING
// ===============================

export class MemoryMonitor {
  private static estimateObjectSize(obj: any): number {
    return JSON.stringify(obj).length * 2; // Rough estimate: 2 bytes per char
  }
  
  static estimateArraySize<T>(arr: T[]): number {
    if (arr.length === 0) return 0;
    
    // Sample first few items to estimate average size
    const sampleSize = Math.min(3, arr.length);
    const sampleItems = arr.slice(0, sampleSize);
    const avgItemSize = sampleItems.reduce((sum, item) => 
      sum + this.estimateObjectSize(item), 0) / sampleSize;
    
    return avgItemSize * arr.length;
  }
  
  static getOptimalBatchSize(estimatedItemSize: number, maxBatch = MEMORY_CONFIGS.MAX_BATCH_SIZE): number {
    // Target ~2MB per batch to stay safe
    const targetBatchMemory = 2 * 1024 * 1024;
    const calculatedSize = Math.floor(targetBatchMemory / estimatedItemSize);
    
    return Math.max(
      MEMORY_CONFIGS.MIN_BATCH_SIZE,
      Math.min(maxBatch, calculatedSize)
    );
  }
}

// ===============================
// PAGINATION UTILITIES
// ===============================

export const PaginationArgs = {
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
};

export type PaginationOptions = {
  cursor?: string;
  limit?: number;
  maxLimit?: number;
};

export function sanitizePaginationArgs(options: PaginationOptions = {}) {
  const { cursor, limit = MEMORY_CONFIGS.DEFAULT_PAGE_SIZE, maxLimit = MEMORY_CONFIGS.MAX_PAGE_SIZE } = options;
  
  return {
    cursor,
    limit: Math.max(
      MEMORY_CONFIGS.MIN_PAGE_SIZE,
      Math.min(limit, maxLimit)
    ),
  };
}

// ===============================
// CHUNKING UTILITIES
// ===============================

/**
 * Split array into memory-safe chunks
 */
export function chunk<T>(array: T[], size = MEMORY_CONFIGS.DEFAULT_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  
  return chunks;
}

/**
 * Progressive chunking with memory monitoring
 */
export function adaptiveChunk<T>(array: T[], startSize = MEMORY_CONFIGS.DEFAULT_BATCH_SIZE): T[][] {
  if (array.length === 0) return [];
  
  const estimatedItemSize = MemoryMonitor.estimateArraySize(array) / array.length;
  const optimalSize = MemoryMonitor.getOptimalBatchSize(estimatedItemSize);
  
  console.log(`📊 Adaptive chunking: ${array.length} items, estimated ${Math.round(estimatedItemSize)} bytes/item, chunk size: ${optimalSize}`);
  
  return chunk(array, optimalSize);
}

// ===============================
// ASYNC PROCESSING UTILITIES
// ===============================

/**
 * Process array in memory-safe batches with delays
 */
export async function processBatches<T, R>(
  items: T[],
  processor: (batch: T[], batchIndex: number) => Promise<R>,
  options: {
    batchSize?: number;
    delayMs?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const { batchSize, delayMs = MEMORY_CONFIGS.BATCH_DELAY_MS, onProgress } = options;
  
  const chunks = batchSize ? chunk(items, batchSize) : adaptiveChunk(items);
  const results: R[] = [];
  
  console.log(`🔄 Processing ${chunks.length} batches of ~${Math.round(items.length / chunks.length)} items each`);
  
  for (let i = 0; i < chunks.length; i++) {
    const batch = chunks[i];
    
    try {
      const result = await processor(batch, i);
      results.push(result);
      
      onProgress?.(i + 1, chunks.length);
      
      // Add delay between batches for memory relief
      if (i < chunks.length - 1 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
    } catch (error) {
      console.error(`❌ Batch ${i + 1}/${chunks.length} failed:`, error);
      throw error;
    }
  }
  
  return results;
}

// ===============================
// FIELD SELECTION UTILITIES
// ===============================

/**
 * Select only specified fields to reduce memory usage
 */
export function selectFields<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  fields: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  
  for (const field of fields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  
  return result;
}

/**
 * Select fields from array of objects
 */
export function selectFieldsFromArray<T extends Record<string, any>, K extends keyof T>(
  array: T[],
  fields: K[]
): Pick<T, K>[] {
  return array.map(item => selectFields(item, fields));
}

// ===============================
// QUERY OPTIMIZATION HELPERS
// ===============================

export type IndexQuery<T> = {
  indexName: string;
  value: T;
  range?: { gt?: T; gte?: T; lt?: T; lte?: T };
};

/**
 * Helper for building efficient index queries
 */
export function buildIndexQuery<T>(
  indexName: string,
  value: T,
  range?: { gt?: T; gte?: T; lt?: T; lte?: T }
): IndexQuery<T> {
  return { indexName, value, range };
}

// ===============================
// VALIDATION UTILITIES
// ===============================

export const MemoryOptimizedValidation = {
  // Standard pagination arguments
  paginationArgs: PaginationArgs,
  
  // Batch processing arguments
  batchArgs: {
    batchSize: v.optional(v.number()),
    startIndex: v.optional(v.number()),
  },
  
  // Field selection arguments
  fieldSelection: {
    fields: v.optional(v.array(v.string())),
    includeMetadata: v.optional(v.boolean()),
  },
};

// ===============================
// EXPORT ALL UTILITIES
// ===============================

export const MemoryUtils = {
  Monitor: MemoryMonitor,
  configs: MEMORY_CONFIGS,
  sanitizePaginationArgs,
  chunk,
  adaptiveChunk,
  processBatches,
  selectFields,
  selectFieldsFromArray,
  buildIndexQuery,
  validation: MemoryOptimizedValidation,
};

export default MemoryUtils;