"use strict";
/**
 * Aggregation Scheduler for FireFetch Dashboard
 *
 * Handles periodic aggregation of metrics data:
 * - Hourly: Aggregates live data into hourly summaries, deletes data older than 24h
 * - Daily: Aggregates hourly data into daily summaries, cleans up old data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAggregationScheduler = startAggregationScheduler;
exports.stopAggregationScheduler = stopAggregationScheduler;
exports.runAggregationNow = runAggregationNow;
exports.isAggregationRunning = isAggregationRunning;
const database_1 = require("./database");
// Run hourly aggregation every hour
const HOURLY_INTERVAL = 60 * 60 * 1000; // 1 hour
// Run daily aggregation once per day
const DAILY_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
let hourlyInterval = null;
let dailyInterval = null;
let isRunning = false;
function runHourlyAggregation() {
    try {
        console.log('[Aggregation] Running hourly aggregation...');
        const result = (0, database_1.aggregateHourlyMetrics)();
        console.log(`[Aggregation] Hourly complete: ${result.processed} records aggregated, ${result.deleted} old records deleted`);
    }
    catch (error) {
        console.error('[Aggregation] Hourly aggregation failed:', error);
    }
}
function runDailyAggregation() {
    try {
        console.log('[Aggregation] Running daily aggregation...');
        const result = (0, database_1.aggregateDailyMetrics)();
        console.log(`[Aggregation] Daily complete: ${result.processed} records aggregated, ${result.deleted} old records deleted`);
        // Log database stats
        const stats = (0, database_1.getDatabaseStats)();
        console.log('[Aggregation] Database stats:', {
            liveMetrics: stats.liveMetrics,
            hourlyMetrics: stats.hourlyMetrics,
            dailyMetrics: stats.dailyMetrics,
            dbSizeMB: (stats.dbSizeBytes / (1024 * 1024)).toFixed(2),
        });
    }
    catch (error) {
        console.error('[Aggregation] Daily aggregation failed:', error);
    }
}
function startAggregationScheduler() {
    if (isRunning)
        return;
    isRunning = true;
    console.log('[Aggregation Scheduler] Starting...');
    // Calculate time until next hour boundary for hourly aggregation
    const now = new Date();
    const minutesToNextHour = 60 - now.getMinutes();
    const msToNextHour = minutesToNextHour * 60 * 1000;
    // Run first hourly aggregation at next hour boundary, then every hour
    setTimeout(() => {
        runHourlyAggregation();
        hourlyInterval = setInterval(runHourlyAggregation, HOURLY_INTERVAL);
    }, msToNextHour);
    // Calculate time until next midnight for daily aggregation
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msToMidnight = tomorrow.getTime() - now.getTime();
    // Run first daily aggregation at midnight, then every 24 hours
    setTimeout(() => {
        runDailyAggregation();
        dailyInterval = setInterval(runDailyAggregation, DAILY_INTERVAL);
    }, msToMidnight);
    console.log('[Aggregation Scheduler] Started:', {
        nextHourlyIn: `${minutesToNextHour} minutes`,
        nextDailyIn: `${Math.round(msToMidnight / (60 * 60 * 1000))} hours`,
    });
    // Also run an initial aggregation pass after 1 minute to clean up any old data
    setTimeout(() => {
        console.log('[Aggregation] Running initial cleanup pass...');
        runHourlyAggregation();
        runDailyAggregation();
    }, 60000);
}
function stopAggregationScheduler() {
    if (!isRunning)
        return;
    isRunning = false;
    if (hourlyInterval)
        clearInterval(hourlyInterval);
    if (dailyInterval)
        clearInterval(dailyInterval);
    hourlyInterval = null;
    dailyInterval = null;
    console.log('[Aggregation Scheduler] Stopped');
}
function runAggregationNow() {
    const hourly = (0, database_1.aggregateHourlyMetrics)();
    const daily = (0, database_1.aggregateDailyMetrics)();
    return { hourly, daily };
}
function isAggregationRunning() {
    return isRunning;
}
