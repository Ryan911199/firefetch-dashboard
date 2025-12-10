"use strict";
/**
 * Appwrite Service Layer
 *
 * Provides high-level functions for interacting with Appwrite backend.
 * Includes graceful degradation - all functions handle Appwrite being unavailable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSettings = saveSettings;
exports.getSettings = getSettings;
exports.saveMetricsSnapshot = saveMetricsSnapshot;
exports.getMetricsHistory = getMetricsHistory;
exports.createIncident = createIncident;
exports.resolveIncident = resolveIncident;
exports.getIncidents = getIncidents;
exports.saveAlert = saveAlert;
exports.updateAlert = updateAlert;
exports.getAlerts = getAlerts;
exports.deleteAlert = deleteAlert;
const appwrite_1 = require("./appwrite");
const appwrite_2 = require("appwrite");
// User ID for anonymous settings (can be replaced with real user ID when auth is implemented)
const ANONYMOUS_USER_ID = 'anonymous';
/**
 * Settings Management
 */
async function saveSettings(settings) {
    try {
        // Check if Appwrite is available
        const isHealthy = await (0, appwrite_1.checkAppwriteHealth)();
        if (!isHealthy) {
            console.warn('Appwrite is not available, skipping save');
            return false;
        }
        // Ensure we have a session
        const hasSession = await (0, appwrite_1.getOrCreateSession)();
        if (!hasSession) {
            console.warn('No session available, skipping save');
            return false;
        }
        // Try to get existing settings document
        const existingDocs = await appwrite_1.databases.listDocuments(appwrite_1.APPWRITE_CONFIG.databaseId, appwrite_1.APPWRITE_CONFIG.collections.settings, [appwrite_1.Query.equal('userId', ANONYMOUS_USER_ID)]);
        const data = {
            userId: ANONYMOUS_USER_ID,
            settings: JSON.stringify(settings),
            updatedAt: new Date().toISOString(),
        };
        if (existingDocs.documents.length > 0) {
            // Update existing document
            await appwrite_1.databases.updateDocument(appwrite_1.APPWRITE_CONFIG.databaseId, appwrite_1.APPWRITE_CONFIG.collections.settings, existingDocs.documents[0].$id, data);
        }
        else {
            // Create new document
            await appwrite_1.databases.createDocument(appwrite_1.APPWRITE_CONFIG.databaseId, appwrite_1.APPWRITE_CONFIG.collections.settings, appwrite_2.ID.unique(), data);
        }
        console.log('Settings saved to Appwrite successfully');
        return true;
    }
    catch (error) {
        console.error('Failed to save settings to Appwrite:', error);
        return false;
    }
}
async function getSettings() {
    try {
        // Check if Appwrite is available
        const isHealthy = await (0, appwrite_1.checkAppwriteHealth)();
        if (!isHealthy) {
            return null;
        }
        // Ensure we have a session
        const hasSession = await (0, appwrite_1.getOrCreateSession)();
        if (!hasSession) {
            return null;
        }
        const docs = await appwrite_1.databases.listDocuments(appwrite_1.APPWRITE_CONFIG.databaseId, appwrite_1.APPWRITE_CONFIG.collections.settings, [appwrite_1.Query.equal('userId', ANONYMOUS_USER_ID)]);
        if (docs.documents.length === 0) {
            return null;
        }
        const settingsData = docs.documents[0].settings;
        return JSON.parse(settingsData);
    }
    catch (error) {
        console.error('Failed to get settings from Appwrite:', error);
        return null;
    }
}
async function saveMetricsSnapshot(metrics) {
    try {
        const isHealthy = await (0, appwrite_1.checkAppwriteHealth)();
        if (!isHealthy)
            return false;
        const hasSession = await (0, appwrite_1.getOrCreateSession)();
        if (!hasSession)
            return false;
        await appwrite_1.databases.createDocument(appwrite_1.APPWRITE_CONFIG.databaseId, appwrite_1.APPWRITE_CONFIG.collections.metricsHistory, appwrite_2.ID.unique(), {
            timestamp: new Date().toISOString(),
            ...metrics,
        });
        return true;
    }
    catch (error) {
        console.error('Failed to save metrics snapshot:', error);
        return false;
    }
}
async function getMetricsHistory(timeRange = 'day') {
    try {
        const isHealthy = await (0, appwrite_1.checkAppwriteHealth)();
        if (!isHealthy)
            return [];
        const hasSession = await (0, appwrite_1.getOrCreateSession)();
        if (!hasSession)
            return [];
        // Calculate time range
        const now = new Date();
        const ranges = {
            hour: 1000 * 60 * 60,
            day: 1000 * 60 * 60 * 24,
            week: 1000 * 60 * 60 * 24 * 7,
            month: 1000 * 60 * 60 * 24 * 30,
        };
        const startTime = new Date(now.getTime() - ranges[timeRange]).toISOString();
        const docs = await appwrite_1.databases.listDocuments(appwrite_1.APPWRITE_CONFIG.databaseId, appwrite_1.APPWRITE_CONFIG.collections.metricsHistory, [
            appwrite_1.Query.greaterThan('timestamp', startTime),
            appwrite_1.Query.orderDesc('timestamp'),
            appwrite_1.Query.limit(1000),
        ]);
        return docs.documents.map((doc) => ({
            timestamp: doc.timestamp,
            cpu: doc.cpu,
            memoryUsed: doc.memoryUsed,
            memoryTotal: doc.memoryTotal,
            diskUsed: doc.diskUsed,
            diskTotal: doc.diskTotal,
            networkUp: doc.networkUp,
            networkDown: doc.networkDown,
        }));
    }
    catch (error) {
        console.error('Failed to get metrics history:', error);
        return [];
    }
}
async function createIncident(incident) {
    try {
        const isHealthy = await (0, appwrite_1.checkAppwriteHealth)();
        if (!isHealthy)
            return false;
        const hasSession = await (0, appwrite_1.getOrCreateSession)();
        if (!hasSession)
            return false;
        await appwrite_1.databases.createDocument(appwrite_1.APPWRITE_CONFIG.databaseId, appwrite_1.APPWRITE_CONFIG.collections.incidents, appwrite_2.ID.unique(), incident);
        return true;
    }
    catch (error) {
        console.error('Failed to create incident:', error);
        return false;
    }
}
async function resolveIncident(incidentId) {
    try {
        const isHealthy = await (0, appwrite_1.checkAppwriteHealth)();
        if (!isHealthy)
            return false;
        const hasSession = await (0, appwrite_1.getOrCreateSession)();
        if (!hasSession)
            return false;
        await appwrite_1.databases.updateDocument(appwrite_1.APPWRITE_CONFIG.databaseId, appwrite_1.APPWRITE_CONFIG.collections.incidents, incidentId, {
            endTime: new Date().toISOString(),
            status: 'resolved',
        });
        return true;
    }
    catch (error) {
        console.error('Failed to resolve incident:', error);
        return false;
    }
}
async function getIncidents(status, limit = 50) {
    try {
        const isHealthy = await (0, appwrite_1.checkAppwriteHealth)();
        if (!isHealthy)
            return [];
        const hasSession = await (0, appwrite_1.getOrCreateSession)();
        if (!hasSession)
            return [];
        const queries = [appwrite_1.Query.orderDesc('startTime'), appwrite_1.Query.limit(limit)];
        if (status) {
            queries.push(appwrite_1.Query.equal('status', status));
        }
        const docs = await appwrite_1.databases.listDocuments(appwrite_1.APPWRITE_CONFIG.databaseId, appwrite_1.APPWRITE_CONFIG.collections.incidents, queries);
        return docs.documents.map((doc) => ({
            $id: doc.$id,
            serviceId: doc.serviceId,
            serviceName: doc.serviceName,
            startTime: doc.startTime,
            endTime: doc.endTime,
            status: doc.status,
            severity: doc.severity,
            description: doc.description,
        }));
    }
    catch (error) {
        console.error('Failed to get incidents:', error);
        return [];
    }
}
async function saveAlert(alert) {
    try {
        const isHealthy = await (0, appwrite_1.checkAppwriteHealth)();
        if (!isHealthy)
            return false;
        const hasSession = await (0, appwrite_1.getOrCreateSession)();
        if (!hasSession)
            return false;
        await appwrite_1.databases.createDocument(appwrite_1.APPWRITE_CONFIG.databaseId, appwrite_1.APPWRITE_CONFIG.collections.alerts, appwrite_2.ID.unique(), {
            userId: ANONYMOUS_USER_ID,
            createdAt: new Date().toISOString(),
            ...alert,
        });
        return true;
    }
    catch (error) {
        console.error('Failed to save alert:', error);
        return false;
    }
}
async function updateAlert(alertId, updates) {
    try {
        const isHealthy = await (0, appwrite_1.checkAppwriteHealth)();
        if (!isHealthy)
            return false;
        const hasSession = await (0, appwrite_1.getOrCreateSession)();
        if (!hasSession)
            return false;
        await appwrite_1.databases.updateDocument(appwrite_1.APPWRITE_CONFIG.databaseId, appwrite_1.APPWRITE_CONFIG.collections.alerts, alertId, updates);
        return true;
    }
    catch (error) {
        console.error('Failed to update alert:', error);
        return false;
    }
}
async function getAlerts(enabled) {
    try {
        const isHealthy = await (0, appwrite_1.checkAppwriteHealth)();
        if (!isHealthy)
            return [];
        const hasSession = await (0, appwrite_1.getOrCreateSession)();
        if (!hasSession)
            return [];
        const queries = [
            appwrite_1.Query.equal('userId', ANONYMOUS_USER_ID),
            appwrite_1.Query.orderDesc('createdAt'),
        ];
        if (enabled !== undefined) {
            queries.push(appwrite_1.Query.equal('enabled', enabled));
        }
        const docs = await appwrite_1.databases.listDocuments(appwrite_1.APPWRITE_CONFIG.databaseId, appwrite_1.APPWRITE_CONFIG.collections.alerts, queries);
        return docs.documents.map((doc) => ({
            $id: doc.$id,
            userId: doc.userId,
            type: doc.type,
            threshold: doc.threshold,
            enabled: doc.enabled,
            createdAt: doc.createdAt,
            triggeredAt: doc.triggeredAt,
            metadata: doc.metadata,
        }));
    }
    catch (error) {
        console.error('Failed to get alerts:', error);
        return [];
    }
}
async function deleteAlert(alertId) {
    try {
        const isHealthy = await (0, appwrite_1.checkAppwriteHealth)();
        if (!isHealthy)
            return false;
        const hasSession = await (0, appwrite_1.getOrCreateSession)();
        if (!hasSession)
            return false;
        await appwrite_1.databases.deleteDocument(appwrite_1.APPWRITE_CONFIG.databaseId, appwrite_1.APPWRITE_CONFIG.collections.alerts, alertId);
        return true;
    }
    catch (error) {
        console.error('Failed to delete alert:', error);
        return false;
    }
}
