import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { BatchProcessor, BatchResult, createBatchProcessor } from "../utils/batchProcessor";
import { MemoryUtils } from "../utils/memoryOptimized";

/**
 * 🚀 MEMORY-SAFE BATCH MUTATIONS
 * 
 * High-performance batch operations for large datasets
 * Handles leads, companies, contacts with automatic memory management
 */

// ===============================
// VALIDATION SCHEMAS
// ===============================

const LeadInsertSchema = v.object({
  email: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  jobTitle: v.optional(v.string()),
  functionGroup: v.optional(v.string()),
  companyId: v.optional(v.id("companies")),
  country: v.optional(v.string()),
  city: v.optional(v.string()),
  isActive: v.optional(v.boolean()),
  mobilePhone: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  seniority: v.optional(v.string()),
});

const CompanyInsertSchema = v.object({
  name: v.string(),
  domain: v.optional(v.string()),
  website: v.optional(v.string()),
  industryLabel: v.optional(v.string()),
  subindustryLabel: v.optional(v.string()),
  companySize: v.optional(v.number()),
  country: v.optional(v.string()),
  city: v.optional(v.string()),
  fullEnrichment: v.optional(v.boolean()),
});

const ContactInsertSchema = v.object({
  leadId: v.id("leads"),
  clientId: v.id("clients"),
  companyId: v.id("companies"),
  status: v.optional(v.string()),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  email: v.optional(v.string()),
  jobTitle: v.optional(v.string()),
  functionGroup: v.optional(v.string()),
});

// ===============================
// LEAD BATCH OPERATIONS
// ===============================

/**
 * Bulk insert leads with memory safety
 */
export const bulkInsertLeads = mutation({
  args: {
    leads: v.array(LeadInsertSchema),
    batchSize: v.optional(v.number()),
    continueOnError: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    processed: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
    totalTimeMs: v.number(),
    memoryEstimate: v.number(),
  }),
  handler: async (ctx, args) => {
    const { leads, batchSize = 20, continueOnError = true } = args;
    
    console.log(`📝 Bulk inserting ${leads.length} leads`);
    
    const processor = createBatchProcessor(ctx, {
      batchSize,
      continueOnError,
      onProgress: (completed, total) => {
        console.log(`📊 Progress: ${completed}/${total} batches completed`);
      },
    });
    
    const result = await processor.bulkInsert("leads", leads);
    
    return {
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
      totalTimeMs: result.metrics.totalTimeMs,
      memoryEstimate: result.metrics.memoryEstimate,
    };
  },
});

/**
 * Bulk upsert leads (insert or update based on email)
 */
export const bulkUpsertLeads = mutation({
  args: {
    leads: v.array(LeadInsertSchema),
    batchSize: v.optional(v.number()),
    continueOnError: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    processed: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
    totalTimeMs: v.number(),
  }),
  handler: async (ctx, args) => {
    const { leads, batchSize = 15, continueOnError = true } = args;
    
    console.log(`🔄 Bulk upserting ${leads.length} leads by email`);
    
    const processor = createBatchProcessor(ctx, {
      batchSize,
      continueOnError,
      onProgress: (completed, total) => {
        console.log(`📊 Upsert progress: ${completed}/${total} batches completed`);
      },
    });
    
    // Convert to upsert format
    const upsertItems = leads.map(lead => ({
      matchField: "email",
      matchValue: lead.email,
      data: lead,
    }));
    
    const result = await processor.bulkUpsert("leads", upsertItems, "by_email_unique");
    
    return {
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
      totalTimeMs: result.metrics.totalTimeMs,
    };
  },
});

/**
 * Bulk update lead status
 */
export const bulkUpdateLeadStatus = mutation({
  args: {
    updates: v.array(v.object({
      leadId: v.id("leads"),
      isActive: v.boolean(),
      lastUpdatedAt: v.optional(v.number()),
    })),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    processed: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const { updates, batchSize = 30 } = args;
    
    console.log(`📝 Bulk updating status for ${updates.length} leads`);
    
    const processor = createBatchProcessor(ctx, { batchSize });
    
    const updateItems = updates.map(update => ({
      id: update.leadId,
      data: {
        isActive: update.isActive,
        lastUpdatedAt: update.lastUpdatedAt || Date.now(),
      },
    }));
    
    const result = await processor.bulkUpdate(updateItems);
    
    return {
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
    };
  },
});

// ===============================
// COMPANY BATCH OPERATIONS
// ===============================

/**
 * Bulk insert companies with memory safety
 */
export const bulkInsertCompanies = mutation({
  args: {
    companies: v.array(CompanyInsertSchema),
    batchSize: v.optional(v.number()),
    continueOnError: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    processed: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
    totalTimeMs: v.number(),
  }),
  handler: async (ctx, args) => {
    const { companies, batchSize = 25, continueOnError = true } = args;
    
    console.log(`🏢 Bulk inserting ${companies.length} companies`);
    
    const processor = createBatchProcessor(ctx, {
      batchSize,
      continueOnError,
      onProgress: (completed, total) => {
        console.log(`📊 Company insert progress: ${completed}/${total} batches completed`);
      },
    });
    
    const result = await processor.bulkInsert("companies", companies);
    
    return {
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
      totalTimeMs: result.metrics.totalTimeMs,
    };
  },
});

/**
 * Bulk upsert companies (insert or update based on domain)
 */
export const bulkUpsertCompanies = mutation({
  args: {
    companies: v.array(CompanyInsertSchema),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    processed: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const { companies, batchSize = 20 } = args;
    
    console.log(`🔄 Bulk upserting ${companies.length} companies by domain`);
    
    const processor = createBatchProcessor(ctx, { batchSize });
    
    // Convert to upsert format, filter companies with domains
    const upsertItems = companies
      .filter(company => company.domain)
      .map(company => ({
        matchField: "domain",
        matchValue: company.domain!,
        data: company,
      }));
    
    if (upsertItems.length === 0) {
      return {
        success: false,
        processed: 0,
        failed: companies.length,
        errors: ["No companies with domains to upsert"],
      };
    }
    
    const result = await processor.bulkUpsert("companies", upsertItems, "by_domain");
    
    return {
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
    };
  },
});

/**
 * Bulk update company enrichment status
 */
export const bulkUpdateCompanyEnrichment = mutation({
  args: {
    updates: v.array(v.object({
      companyId: v.id("companies"),
      enrichmentData: v.object({
        fullEnrichment: v.boolean(),
        companySummary: v.optional(v.string()),
        shortCompanySummary: v.optional(v.string()),
        companySize: v.optional(v.number()),
        industryLabel: v.optional(v.string()),
        lastUpdatedAt: v.optional(v.number()),
      }),
    })),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    processed: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const { updates, batchSize = 25 } = args;
    
    console.log(`🔄 Bulk updating enrichment for ${updates.length} companies`);
    
    const processor = createBatchProcessor(ctx, { batchSize });
    
    const updateItems = updates.map(update => ({
      id: update.companyId,
      data: {
        ...update.enrichmentData,
        lastUpdatedAt: update.enrichmentData.lastUpdatedAt || Date.now(),
      },
    }));
    
    const result = await processor.bulkUpdate(updateItems);
    
    return {
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
    };
  },
});

// ===============================
// CONTACT BATCH OPERATIONS
// ===============================

/**
 * Bulk convert leads to contacts (optimized version)
 */
export const bulkConvertLeadsToContacts = mutation({
  args: {
    conversions: v.array(v.object({
      leadId: v.id("leads"),
      clientId: v.id("clients"),
      status: v.optional(v.string()),
    })),
    batchSize: v.optional(v.number()),
    continueOnError: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    processed: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
    totalTimeMs: v.number(),
  }),
  handler: async (ctx, args) => {
    const { conversions, batchSize = 10, continueOnError = true } = args;
    
    console.log(`🔄 Bulk converting ${conversions.length} leads to contacts`);
    
    const startTime = Date.now();
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];
    
    // Process in memory-safe chunks
    const chunks = MemoryUtils.chunk(conversions, batchSize);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      console.log(`📦 Processing conversion batch ${i + 1}/${chunks.length} (${chunk.length} conversions)`);
      
      try {
        // Get all leads and companies for this batch
        const leadIds = chunk.map(c => c.leadId);
        const leads = await Promise.all(
          leadIds.map(async (id) => {
            try {
              return await ctx.db.get(id);
            } catch {
              return null;
            }
          })
        );
        
        const validLeads = leads.filter(Boolean);
        const companyIds = [...new Set(validLeads.map(lead => lead!.companyId).filter(Boolean))];
        
        // Get companies
        const companies = await Promise.all(
          companyIds.map(async (id) => {
            try {
              return await ctx.db.get(id!);
            } catch {
              return null;
            }
          })
        );
        
        const companiesMap = new Map(companies.filter(Boolean).map(c => [c!._id, c!]));
        
        // Process each conversion in this batch
        for (const conversion of chunk) {
          try {
            const lead = validLeads.find(l => l!._id === conversion.leadId);
            if (!lead) {
              failed++;
              errors.push(`Lead ${conversion.leadId} not found`);
              continue;
            }
            
            const company = lead.companyId ? companiesMap.get(lead.companyId) : null;
            if (!company) {
              failed++;
              errors.push(`Company for lead ${conversion.leadId} not found`);
              continue;
            }
            
            // Check if contact already exists
            const existingContact = await ctx.db
              .query("contacts")
              .filter((q) => q.and(
                q.eq(q.field("leadId"), conversion.leadId),
                q.eq(q.field("clientId"), conversion.clientId)
              ))
              .first();
            
            if (existingContact) {
              failed++;
              errors.push(`Contact already exists for lead ${conversion.leadId}`);
              continue;
            }
            
            // Create contact
            await ctx.db.insert("contacts", {
              leadId: conversion.leadId,
              clientId: conversion.clientId,
              companyId: company._id,
              purchasedAt: Date.now(),
              status: conversion.status || "cold",
              
              // Denormalized lead data
              firstName: lead.firstName,
              lastName: lead.lastName,
              email: lead.email,
              mobilePhone: lead.mobilePhone,
              linkedinUrl: lead.linkedinUrl,
              jobTitle: lead.jobTitle,
              functionGroup: lead.functionGroup,
              
              // Denormalized company data
              name: company.name,
              website: company.website,
              companyLinkedinUrl: company.companyLinkedinUrl,
              industryLabel: company.industryLabel,
              subindustryLabel: company.subindustryLabel,
              companySummary: company.companySummary,
              shortCompanySummary: company.shortCompanySummary,
            });
            
            processed++;
            
          } catch (error) {
            failed++;
            errors.push(`Conversion failed for lead ${conversion.leadId}: ${error.message}`);
            
            if (!continueOnError) {
              throw error;
            }
          }
        }
        
        // Memory relief delay between batches
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        
      } catch (error) {
        console.error(`❌ Conversion batch ${i + 1} failed:`, error);
        failed += chunk.length;
        errors.push(`Batch ${i + 1}: ${error.message}`);
        
        if (!continueOnError) {
          break;
        }
      }
    }
    
    const totalTimeMs = Date.now() - startTime;
    console.log(`✅ Bulk conversion complete: ${processed} processed, ${failed} failed in ${totalTimeMs}ms`);
    
    return {
      success: processed > 0,
      processed,
      failed,
      errors,
      totalTimeMs,
    };
  },
});

/**
 * Bulk delete contacts
 */
export const bulkDeleteContacts = mutation({
  args: {
    contactIds: v.array(v.id("contacts")),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    processed: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const { contactIds, batchSize = 40 } = args;
    
    console.log(`🗑️ Bulk deleting ${contactIds.length} contacts`);
    
    const processor = createBatchProcessor(ctx, { batchSize });
    const result = await processor.bulkDelete(contactIds);
    
    return {
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
    };
  },
});

// ===============================
// UTILITY FUNCTIONS
// ===============================

/**
 * Estimate memory usage for batch operations
 */
export const estimateBatchMemory = mutation({
  args: {
    operation: v.string(),
    itemCount: v.number(),
    sampleData: v.optional(v.any()),
  },
  returns: v.object({
    estimatedMemoryMB: v.number(),
    recommendedBatchSize: v.number(),
    maxSafeBatches: v.number(),
  }),
  handler: async (ctx, args) => {
    const { operation, itemCount, sampleData } = args;
    
    // Estimate item size
    const itemSizeBytes = sampleData 
      ? MemoryUtils.Monitor.estimateObjectSize(sampleData)
      : 1000; // Default 1KB per item
    
    const totalMemoryMB = (itemCount * itemSizeBytes) / (1024 * 1024);
    const recommendedBatchSize = MemoryUtils.Monitor.getOptimalBatchSize(itemSizeBytes);
    const maxSafeBatches = Math.ceil(itemCount / recommendedBatchSize);
    
    console.log(`📊 Memory estimation for ${operation}: ${itemCount} items, ~${itemSizeBytes} bytes each`);
    console.log(`📊 Total: ${totalMemoryMB.toFixed(2)}MB, recommended batch: ${recommendedBatchSize}, batches: ${maxSafeBatches}`);
    
    return {
      estimatedMemoryMB: Number(totalMemoryMB.toFixed(2)),
      recommendedBatchSize,
      maxSafeBatches,
    };
  },
});

export default {
  bulkInsertLeads,
  bulkUpsertLeads,
  bulkUpdateLeadStatus,
  bulkInsertCompanies,
  bulkUpsertCompanies,
  bulkUpdateCompanyEnrichment,
  bulkConvertLeadsToContacts,
  bulkDeleteContacts,
  estimateBatchMemory,
};