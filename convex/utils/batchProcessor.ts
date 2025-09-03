import { v } from "convex/values";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { MemoryUtils, MEMORY_CONFIGS } from "./memoryOptimized";

/**
 * 🚀 BATCH PROCESSOR ENGINE
 * 
 * High-performance batch processing for Convex with memory safety
 * Handles bulk inserts, updates, and complex operations without crashes
 */

// ===============================
// TYPES & INTERFACES
// ===============================

export type BatchResult<T = any> = {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
  results?: T[];
  metrics: {
    totalBatches: number;
    avgBatchSize: number;
    totalTimeMs: number;
    memoryEstimate: number;
  };
};

export type BatchProcessorOptions = {
  batchSize?: number;
  maxRetries?: number;
  delayMs?: number;
  onProgress?: (completed: number, total: number, batchResult?: any) => void;
  onBatchComplete?: (batchIndex: number, result: any) => void;
  onError?: (error: Error, batchIndex: number, batch: any) => void;
  continueOnError?: boolean;
};

export type UpsertItem = {
  matchField: string;
  matchValue: any;
  data: Record<string, any>;
};

// ===============================
// CORE BATCH PROCESSOR CLASS
// ===============================

export class BatchProcessor {
  private ctx: MutationCtx;
  private options: Required<BatchProcessorOptions>;
  
  constructor(ctx: MutationCtx, options: BatchProcessorOptions = {}) {
    this.ctx = ctx;
    this.options = {
      batchSize: MEMORY_CONFIGS.DEFAULT_BATCH_SIZE,
      maxRetries: 2,
      delayMs: MEMORY_CONFIGS.BATCH_DELAY_MS,
      onProgress: () => {},
      onBatchComplete: () => {},
      onError: () => {},
      continueOnError: true,
      ...options,
    };
  }
  
  // ===============================
  // BULK INSERT OPERATIONS
  // ===============================
  
  async bulkInsert<T extends Record<string, any>>(
    tableName: string,
    items: T[]
  ): Promise<BatchResult<string>> {
    console.log(`📝 Bulk inserting ${items.length} items into ${tableName}`);
    
    const startTime = Date.now();
    const chunks = MemoryUtils.adaptiveChunk(items, this.options.batchSize);
    const results: string[] = [];
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const batch = chunks[i];
      
      try {
        console.log(`📦 Processing batch ${i + 1}/${chunks.length} (${batch.length} items)`);
        
        const batchResults: string[] = [];
        
        for (const item of batch) {
          try {
            const id = await this.ctx.db.insert(tableName as any, item);
            batchResults.push(id);
            processed++;
          } catch (error) {
            failed++;
            errors.push(`Insert failed: ${error.message}`);
            
            if (!this.options.continueOnError) {
              throw error;
            }
          }
        }
        
        results.push(...batchResults);
        this.options.onBatchComplete(i, batchResults);
        this.options.onProgress(i + 1, chunks.length, batchResults);
        
        // Memory relief delay
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.options.delayMs));
        }
        
      } catch (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error);
        failed += batch.length;
        errors.push(`Batch ${i + 1}: ${error.message}`);
        this.options.onError(error as Error, i, batch);
        
        if (!this.options.continueOnError) {
          break;
        }
      }
    }
    
    const totalTimeMs = Date.now() - startTime;
    const memoryEstimate = MemoryUtils.Monitor.estimateArraySize(items);
    
    console.log(`✅ Bulk insert complete: ${processed} processed, ${failed} failed in ${totalTimeMs}ms`);
    
    return {
      success: processed > 0,
      processed,
      failed,
      errors,
      results,
      metrics: {
        totalBatches: chunks.length,
        avgBatchSize: Math.round(items.length / chunks.length),
        totalTimeMs,
        memoryEstimate,
      },
    };
  }
  
  // ===============================
  // BULK UPSERT OPERATIONS
  // ===============================
  
  async bulkUpsert<T extends Record<string, any>>(
    tableName: string,
    items: UpsertItem[],
    indexName?: string
  ): Promise<BatchResult<string>> {
    console.log(`🔄 Bulk upserting ${items.length} items into ${tableName}`);
    
    const startTime = Date.now();
    const chunks = MemoryUtils.adaptiveChunk(items, this.options.batchSize);
    const results: string[] = [];
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const batch = chunks[i];
      
      try {
        console.log(`🔄 Processing upsert batch ${i + 1}/${chunks.length} (${batch.length} items)`);
        
        const batchResults: string[] = [];
        
        for (const item of batch) {
          try {
            // Try to find existing record
            let existing;
            if (indexName) {
              existing = await this.ctx.db
                .query(tableName as any)
                .withIndex(indexName as any, (q: any) => q.eq(item.matchField, item.matchValue))
                .first();
            } else {
              existing = await this.ctx.db
                .query(tableName as any)
                .filter((q: any) => q.eq(q.field(item.matchField), item.matchValue))
                .first();
            }
            
            let id: string;
            if (existing) {
              // Update existing
              await this.ctx.db.patch(existing._id, item.data);
              id = existing._id;
            } else {
              // Insert new
              id = await this.ctx.db.insert(tableName as any, {
                [item.matchField]: item.matchValue,
                ...item.data,
              });
            }
            
            batchResults.push(id);
            processed++;
            
          } catch (error) {
            failed++;
            errors.push(`Upsert failed for ${item.matchValue}: ${error.message}`);
            
            if (!this.options.continueOnError) {
              throw error;
            }
          }
        }
        
        results.push(...batchResults);
        this.options.onBatchComplete(i, batchResults);
        this.options.onProgress(i + 1, chunks.length, batchResults);
        
        // Memory relief delay
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.options.delayMs));
        }
        
      } catch (error) {
        console.error(`❌ Upsert batch ${i + 1} failed:`, error);
        failed += batch.length;
        errors.push(`Batch ${i + 1}: ${error.message}`);
        this.options.onError(error as Error, i, batch);
        
        if (!this.options.continueOnError) {
          break;
        }
      }
    }
    
    const totalTimeMs = Date.now() - startTime;
    const memoryEstimate = MemoryUtils.Monitor.estimateArraySize(items);
    
    console.log(`✅ Bulk upsert complete: ${processed} processed, ${failed} failed in ${totalTimeMs}ms`);
    
    return {
      success: processed > 0,
      processed,
      failed,
      errors,
      results,
      metrics: {
        totalBatches: chunks.length,
        avgBatchSize: Math.round(items.length / chunks.length),
        totalTimeMs,
        memoryEstimate,
      },
    };
  }
  
  // ===============================
  // BULK UPDATE OPERATIONS
  // ===============================
  
  async bulkUpdate<T extends Record<string, any>>(
    updates: { id: string; data: Partial<T> }[]
  ): Promise<BatchResult<void>> {
    console.log(`📝 Bulk updating ${updates.length} records`);
    
    const startTime = Date.now();
    const chunks = MemoryUtils.adaptiveChunk(updates, this.options.batchSize);
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const batch = chunks[i];
      
      try {
        console.log(`📝 Processing update batch ${i + 1}/${chunks.length} (${batch.length} items)`);
        
        for (const update of batch) {
          try {
            await this.ctx.db.patch(update.id as any, update.data);
            processed++;
          } catch (error) {
            failed++;
            errors.push(`Update failed for ${update.id}: ${error.message}`);
            
            if (!this.options.continueOnError) {
              throw error;
            }
          }
        }
        
        this.options.onBatchComplete(i, batch);
        this.options.onProgress(i + 1, chunks.length, batch);
        
        // Memory relief delay
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.options.delayMs));
        }
        
      } catch (error) {
        console.error(`❌ Update batch ${i + 1} failed:`, error);
        failed += batch.length;
        errors.push(`Batch ${i + 1}: ${error.message}`);
        this.options.onError(error as Error, i, batch);
        
        if (!this.options.continueOnError) {
          break;
        }
      }
    }
    
    const totalTimeMs = Date.now() - startTime;
    const memoryEstimate = MemoryUtils.Monitor.estimateArraySize(updates);
    
    console.log(`✅ Bulk update complete: ${processed} processed, ${failed} failed in ${totalTimeMs}ms`);
    
    return {
      success: processed > 0,
      processed,
      failed,
      errors,
      metrics: {
        totalBatches: chunks.length,
        avgBatchSize: Math.round(updates.length / chunks.length),
        totalTimeMs,
        memoryEstimate,
      },
    };
  }
  
  // ===============================
  // BULK DELETE OPERATIONS
  // ===============================
  
  async bulkDelete(ids: string[]): Promise<BatchResult<void>> {
    console.log(`🗑️ Bulk deleting ${ids.length} records`);
    
    const startTime = Date.now();
    const chunks = MemoryUtils.adaptiveChunk(ids, this.options.batchSize);
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const batch = chunks[i];
      
      try {
        console.log(`🗑️ Processing delete batch ${i + 1}/${chunks.length} (${batch.length} items)`);
        
        for (const id of batch) {
          try {
            await this.ctx.db.delete(id as any);
            processed++;
          } catch (error) {
            failed++;
            errors.push(`Delete failed for ${id}: ${error.message}`);
            
            if (!this.options.continueOnError) {
              throw error;
            }
          }
        }
        
        this.options.onBatchComplete(i, batch);
        this.options.onProgress(i + 1, chunks.length, batch);
        
        // Memory relief delay
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.options.delayMs));
        }
        
      } catch (error) {
        console.error(`❌ Delete batch ${i + 1} failed:`, error);
        failed += batch.length;
        errors.push(`Batch ${i + 1}: ${error.message}`);
        this.options.onError(error as Error, i, batch);
        
        if (!this.options.continueOnError) {
          break;
        }
      }
    }
    
    const totalTimeMs = Date.now() - startTime;
    
    console.log(`✅ Bulk delete complete: ${processed} processed, ${failed} failed in ${totalTimeMs}ms`);
    
    return {
      success: processed > 0,
      processed,
      failed,
      errors,
      metrics: {
        totalBatches: chunks.length,
        avgBatchSize: Math.round(ids.length / chunks.length),
        totalTimeMs,
        memoryEstimate: ids.length * 50, // Rough estimate for ID strings
      },
    };
  }
}

// ===============================
// VALIDATION SCHEMAS
// ===============================

export const BatchProcessorValidation = {
  batchOptions: v.object({
    batchSize: v.optional(v.number()),
    maxRetries: v.optional(v.number()),
    delayMs: v.optional(v.number()),
    continueOnError: v.optional(v.boolean()),
  }),
  
  upsertItem: v.object({
    matchField: v.string(),
    matchValue: v.any(),
    data: v.any(),
  }),
  
  updateItem: v.object({
    id: v.id("_any"),
    data: v.any(),
  }),
};

// ===============================
// UTILITY FUNCTIONS
// ===============================

/**
 * Create a new batch processor instance
 */
export function createBatchProcessor(
  ctx: MutationCtx, 
  options?: BatchProcessorOptions
): BatchProcessor {
  return new BatchProcessor(ctx, options);
}

/**
 * Quick batch insert helper
 */
export async function quickBatchInsert<T extends Record<string, any>>(
  ctx: MutationCtx,
  tableName: string,
  items: T[],
  batchSize = MEMORY_CONFIGS.DEFAULT_BATCH_SIZE
): Promise<BatchResult<string>> {
  const processor = new BatchProcessor(ctx, { batchSize });
  return processor.bulkInsert(tableName, items);
}

/**
 * Quick batch upsert helper
 */
export async function quickBatchUpsert<T extends Record<string, any>>(
  ctx: MutationCtx,
  tableName: string,
  items: UpsertItem[],
  options: { indexName?: string; batchSize?: number } = {}
): Promise<BatchResult<string>> {
  const processor = new BatchProcessor(ctx, { batchSize: options.batchSize });
  return processor.bulkUpsert(tableName, items, options.indexName);
}

export default BatchProcessor;