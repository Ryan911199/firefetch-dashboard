"use strict";
// Beszel API client for fetching historical metrics
// Beszel hub runs at http://localhost:8374
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBeszelSystems = getBeszelSystems;
exports.getBeszelHistory = getBeszelHistory;
exports.isBeszelAvailable = isBeszelAvailable;
exports.getTopProcessesByCpu = getTopProcessesByCpu;
exports.getTopProcessesByMemory = getTopProcessesByMemory;
exports.getAllProcessMetrics = getAllProcessMetrics;
const BESZEL_HUB_URL = process.env.BESZEL_HUB_URL || "http://localhost:8374";
/**
 * Fetch current metrics for all systems from Beszel
 */
async function getBeszelSystems() {
    try {
        const response = await fetch(`${BESZEL_HUB_URL}/api/systems`, {
            next: { revalidate: 30 }, // Cache for 30 seconds
        });
        if (!response.ok) {
            throw new Error(`Beszel API error: ${response.status}`);
        }
        return response.json();
    }
    catch (error) {
        console.error("Failed to fetch Beszel systems:", error);
        return [];
    }
}
/**
 * Fetch historical metrics for a specific system
 */
async function getBeszelHistory(systemId, period = "24h") {
    try {
        const response = await fetch(`${BESZEL_HUB_URL}/api/systems/${systemId}/history?period=${period}`, {
            next: { revalidate: 60 }, // Cache for 1 minute
        });
        if (!response.ok) {
            throw new Error(`Beszel API error: ${response.status}`);
        }
        return response.json();
    }
    catch (error) {
        console.error("Failed to fetch Beszel history:", error);
        return null;
    }
}
/**
 * Check if Beszel hub is available
 */
async function isBeszelAvailable() {
    try {
        const response = await fetch(`${BESZEL_HUB_URL}/api/health`, {
            signal: AbortSignal.timeout(3000),
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
/**
 * Get top processes by CPU usage
 * Falls back to system commands if Beszel doesn't provide process data
 */
async function getTopProcessesByCpu(limit = 20) {
    try {
        // Try Beszel API first
        const response = await fetch(`${BESZEL_HUB_URL}/api/processes?sort=cpu&limit=${limit}`, {
            next: { revalidate: 5 }, // Cache for 5 seconds
        });
        if (response.ok) {
            const data = await response.json();
            return data.processes || [];
        }
    }
    catch (error) {
        console.error("Beszel process API not available, using system fallback");
    }
    // Fallback to empty array (system commands will be used in API route)
    return [];
}
/**
 * Get top processes by memory usage
 * Falls back to system commands if Beszel doesn't provide process data
 */
async function getTopProcessesByMemory(limit = 20) {
    try {
        // Try Beszel API first
        const response = await fetch(`${BESZEL_HUB_URL}/api/processes?sort=memory&limit=${limit}`, {
            next: { revalidate: 5 }, // Cache for 5 seconds
        });
        if (response.ok) {
            const data = await response.json();
            return data.processes || [];
        }
    }
    catch (error) {
        console.error("Beszel process API not available, using system fallback");
    }
    // Fallback to empty array (system commands will be used in API route)
    return [];
}
/**
 * Get all process metrics
 */
async function getAllProcessMetrics() {
    try {
        const response = await fetch(`${BESZEL_HUB_URL}/api/processes`, {
            next: { revalidate: 5 }, // Cache for 5 seconds
        });
        if (!response.ok) {
            throw new Error(`Beszel API error: ${response.status}`);
        }
        return response.json();
    }
    catch (error) {
        console.error("Failed to fetch Beszel process metrics:", error);
        return null;
    }
}
