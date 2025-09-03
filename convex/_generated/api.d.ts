/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as activityLogger from "../activityLogger.js";
import type * as activityPerformanceOptimizer from "../activityPerformanceOptimizer.js";
import type * as activitySecurityAuditor from "../activitySecurityAuditor.js";
import type * as analyticsViews from "../analyticsViews.js";
import type * as apolloProcessor from "../apolloProcessor.js";
import type * as auth from "../auth.js";
import type * as autoAssignment from "../autoAssignment.js";
import type * as autoClientManager from "../autoClientManager.js";
import type * as autoClientSetup from "../autoClientSetup.js";
import type * as automationEngine from "../automationEngine.js";
import type * as automationMaintenance from "../automationMaintenance.js";
import type * as automationMonitoring from "../automationMonitoring.js";
import type * as automationScheduler from "../automationScheduler.js";
import type * as automationSchedulerInternal from "../automationSchedulerInternal.js";
import type * as automationSeeds from "../automationSeeds.js";
import type * as automationSystemRobust from "../automationSystemRobust.js";
import type * as automations from "../automations.js";
import type * as automationsStringClient from "../automationsStringClient.js";
import type * as bulkConvert from "../bulkConvert.js";
import type * as campaigns from "../campaigns.js";
import type * as candidateViews from "../candidateViews.js";
import type * as candidateViewsOptimized from "../candidateViewsOptimized.js";
import type * as checkSpecificAutomation from "../checkSpecificAutomation.js";
import type * as cleanAutomationSystem from "../cleanAutomationSystem.js";
import type * as clients from "../clients.js";
import type * as communications from "../communications.js";
import type * as companies from "../companies.js";
import type * as companiesOptimized from "../companiesOptimized.js";
import type * as companyEnrichment from "../companyEnrichment.js";
import type * as contacts from "../contacts.js";
import type * as creditBusinessLogic from "../creditBusinessLogic.js";
import type * as creditSystem from "../creditSystem.js";
import type * as creditSystemSecure from "../creditSystemSecure.js";
import type * as cronStatsRefresh from "../cronStatsRefresh.js";
import type * as crons from "../crons.js";
import type * as deals from "../deals.js";
import type * as emailAccounts from "../emailAccounts.js";
import type * as emailSync from "../emailSync.js";
import type * as exactLeadConversion from "../exactLeadConversion.js";
import type * as exactLeadDatabase from "../exactLeadDatabase.js";
import type * as finalDealsTest from "../finalDealsTest.js";
import type * as findAutomation from "../findAutomation.js";
import type * as firecrawl from "../firecrawl.js";
import type * as fixAutomation from "../fixAutomation.js";
import type * as http from "../http.js";
import type * as http_backup from "../http_backup.js";
import type * as inbox from "../inbox.js";
import type * as leadConversion_streamingConversion from "../leadConversion/streamingConversion.js";
import type * as leadConversion from "../leadConversion.js";
import type * as leadConversionView from "../leadConversionView.js";
import type * as leadSearch from "../leadSearch.js";
import type * as leadUpdater from "../leadUpdater.js";
import type * as leads from "../leads.js";
import type * as microBatch from "../microBatch.js";
import type * as migrateCampaignColumns from "../migrateCampaignColumns.js";
import type * as migrations from "../migrations.js";
import type * as mutations_batchMutations from "../mutations/batchMutations.js";
import type * as oauth from "../oauth.js";
import type * as payAsYouScale from "../payAsYouScale.js";
import type * as payAsYouScaleSchema from "../payAsYouScaleSchema.js";
import type * as payAsYouScaleStripe from "../payAsYouScaleStripe.js";
import type * as performanceTest from "../performanceTest.js";
import type * as pilotUpgradeBonus from "../pilotUpgradeBonus.js";
import type * as pipelines from "../pipelines.js";
import type * as propositions from "../propositions.js";
import type * as queries_paginatedCompanies from "../queries/paginatedCompanies.js";
import type * as queries_paginatedLeads from "../queries/paginatedLeads.js";
import type * as rateLimiting from "../rateLimiting.js";
import type * as repairSystemIntegrity from "../repairSystemIntegrity.js";
import type * as resetAutomationTemplates from "../resetAutomationTemplates.js";
import type * as sampleData from "../sampleData.js";
import type * as schema_backup from "../schema_backup.js";
import type * as schema_clean from "../schema_clean.js";
import type * as searchViews from "../searchViews.js";
import type * as seedCreditPackages from "../seedCreditPackages.js";
import type * as seedPayAsYouScale from "../seedPayAsYouScale.js";
import type * as settings from "../settings.js";
import type * as setupClientAutomations from "../setupClientAutomations.js";
import type * as setupStripeProducts from "../setupStripeProducts.js";
import type * as simpleBulkConvert from "../simpleBulkConvert.js";
import type * as simpleWorkflows from "../simpleWorkflows.js";
import type * as smartAssignmentQueue from "../smartAssignmentQueue.js";
import type * as stageAutomations from "../stageAutomations.js";
import type * as stages from "../stages.js";
import type * as stripeIntegration from "../stripeIntegration.js";
import type * as stripeIntegrationRobust from "../stripeIntegrationRobust.js";
import type * as stripeReal from "../stripeReal.js";
import type * as systemValidation from "../systemValidation.js";
import type * as testDealsOptimization from "../testDealsOptimization.js";
import type * as testInbox from "../testInbox.js";
import type * as testInstantlyIntegration from "../testInstantlyIntegration.js";
import type * as timelineViews from "../timelineViews.js";
import type * as updateStartToPilot from "../updateStartToPilot.js";
import type * as utils_batchProcessor from "../utils/batchProcessor.js";
import type * as utils_memoryOptimized from "../utils/memoryOptimized.js";
import type * as views from "../views.js";
import type * as webhooks from "../webhooks.js";
import type * as workflowHelpers from "../workflowHelpers.js";
import type * as workflowSeeds from "../workflowSeeds.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activityLogger: typeof activityLogger;
  activityPerformanceOptimizer: typeof activityPerformanceOptimizer;
  activitySecurityAuditor: typeof activitySecurityAuditor;
  analyticsViews: typeof analyticsViews;
  apolloProcessor: typeof apolloProcessor;
  auth: typeof auth;
  autoAssignment: typeof autoAssignment;
  autoClientManager: typeof autoClientManager;
  autoClientSetup: typeof autoClientSetup;
  automationEngine: typeof automationEngine;
  automationMaintenance: typeof automationMaintenance;
  automationMonitoring: typeof automationMonitoring;
  automationScheduler: typeof automationScheduler;
  automationSchedulerInternal: typeof automationSchedulerInternal;
  automationSeeds: typeof automationSeeds;
  automationSystemRobust: typeof automationSystemRobust;
  automations: typeof automations;
  automationsStringClient: typeof automationsStringClient;
  bulkConvert: typeof bulkConvert;
  campaigns: typeof campaigns;
  candidateViews: typeof candidateViews;
  candidateViewsOptimized: typeof candidateViewsOptimized;
  checkSpecificAutomation: typeof checkSpecificAutomation;
  cleanAutomationSystem: typeof cleanAutomationSystem;
  clients: typeof clients;
  communications: typeof communications;
  companies: typeof companies;
  companiesOptimized: typeof companiesOptimized;
  companyEnrichment: typeof companyEnrichment;
  contacts: typeof contacts;
  creditBusinessLogic: typeof creditBusinessLogic;
  creditSystem: typeof creditSystem;
  creditSystemSecure: typeof creditSystemSecure;
  cronStatsRefresh: typeof cronStatsRefresh;
  crons: typeof crons;
  deals: typeof deals;
  emailAccounts: typeof emailAccounts;
  emailSync: typeof emailSync;
  exactLeadConversion: typeof exactLeadConversion;
  exactLeadDatabase: typeof exactLeadDatabase;
  finalDealsTest: typeof finalDealsTest;
  findAutomation: typeof findAutomation;
  firecrawl: typeof firecrawl;
  fixAutomation: typeof fixAutomation;
  http: typeof http;
  http_backup: typeof http_backup;
  inbox: typeof inbox;
  "leadConversion/streamingConversion": typeof leadConversion_streamingConversion;
  leadConversion: typeof leadConversion;
  leadConversionView: typeof leadConversionView;
  leadSearch: typeof leadSearch;
  leadUpdater: typeof leadUpdater;
  leads: typeof leads;
  microBatch: typeof microBatch;
  migrateCampaignColumns: typeof migrateCampaignColumns;
  migrations: typeof migrations;
  "mutations/batchMutations": typeof mutations_batchMutations;
  oauth: typeof oauth;
  payAsYouScale: typeof payAsYouScale;
  payAsYouScaleSchema: typeof payAsYouScaleSchema;
  payAsYouScaleStripe: typeof payAsYouScaleStripe;
  performanceTest: typeof performanceTest;
  pilotUpgradeBonus: typeof pilotUpgradeBonus;
  pipelines: typeof pipelines;
  propositions: typeof propositions;
  "queries/paginatedCompanies": typeof queries_paginatedCompanies;
  "queries/paginatedLeads": typeof queries_paginatedLeads;
  rateLimiting: typeof rateLimiting;
  repairSystemIntegrity: typeof repairSystemIntegrity;
  resetAutomationTemplates: typeof resetAutomationTemplates;
  sampleData: typeof sampleData;
  schema_backup: typeof schema_backup;
  schema_clean: typeof schema_clean;
  searchViews: typeof searchViews;
  seedCreditPackages: typeof seedCreditPackages;
  seedPayAsYouScale: typeof seedPayAsYouScale;
  settings: typeof settings;
  setupClientAutomations: typeof setupClientAutomations;
  setupStripeProducts: typeof setupStripeProducts;
  simpleBulkConvert: typeof simpleBulkConvert;
  simpleWorkflows: typeof simpleWorkflows;
  smartAssignmentQueue: typeof smartAssignmentQueue;
  stageAutomations: typeof stageAutomations;
  stages: typeof stages;
  stripeIntegration: typeof stripeIntegration;
  stripeIntegrationRobust: typeof stripeIntegrationRobust;
  stripeReal: typeof stripeReal;
  systemValidation: typeof systemValidation;
  testDealsOptimization: typeof testDealsOptimization;
  testInbox: typeof testInbox;
  testInstantlyIntegration: typeof testInstantlyIntegration;
  timelineViews: typeof timelineViews;
  updateStartToPilot: typeof updateStartToPilot;
  "utils/batchProcessor": typeof utils_batchProcessor;
  "utils/memoryOptimized": typeof utils_memoryOptimized;
  views: typeof views;
  webhooks: typeof webhooks;
  workflowHelpers: typeof workflowHelpers;
  workflowSeeds: typeof workflowSeeds;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
