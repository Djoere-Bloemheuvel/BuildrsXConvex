import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * BACKGROUND STATS REFRESH CRON JOBS
 * 
 * Automatically refresh candidate statistics cache to ensure
 * dashboard performance stays optimal even with large datasets.
 */

const crons = cronJobs();

// Refresh stats every 15 minutes during business hours
crons.interval(
  "refresh-candidate-stats",
  { minutes: 15 },
  internal.candidateViewsOptimized.backgroundRefreshStats
);

// Full refresh once daily at 2 AM to ensure data integrity
crons.cron(
  "daily-full-refresh",
  "0 2 * * *", // Daily at 2:00 AM
  internal.candidateViewsOptimized.dailyFullRefresh
);

export default crons;