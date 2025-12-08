/**
 * Appwrite Service Layer
 *
 * Provides high-level functions for interacting with Appwrite backend.
 * Includes graceful degradation - all functions handle Appwrite being unavailable.
 */

import { databases, APPWRITE_CONFIG, Query, checkAppwriteHealth, getOrCreateSession } from './appwrite';
import { DashboardSettings } from './settings';
import { ID } from 'appwrite';

// User ID for anonymous settings (can be replaced with real user ID when auth is implemented)
const ANONYMOUS_USER_ID = 'anonymous';

/**
 * Settings Management
 */

export async function saveSettings(settings: DashboardSettings): Promise<boolean> {
  try {
    // Check if Appwrite is available
    const isHealthy = await checkAppwriteHealth();
    if (!isHealthy) {
      console.warn('Appwrite is not available, skipping save');
      return false;
    }

    // Ensure we have a session
    const hasSession = await getOrCreateSession();
    if (!hasSession) {
      console.warn('No session available, skipping save');
      return false;
    }

    // Try to get existing settings document
    const existingDocs = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.settings,
      [Query.equal('userId', ANONYMOUS_USER_ID)]
    );

    const data = {
      userId: ANONYMOUS_USER_ID,
      settings: JSON.stringify(settings),
      updatedAt: new Date().toISOString(),
    };

    if (existingDocs.documents.length > 0) {
      // Update existing document
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.settings,
        existingDocs.documents[0].$id,
        data
      );
    } else {
      // Create new document
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.settings,
        ID.unique(),
        data
      );
    }

    console.log('Settings saved to Appwrite successfully');
    return true;
  } catch (error) {
    console.error('Failed to save settings to Appwrite:', error);
    return false;
  }
}

export async function getSettings(): Promise<DashboardSettings | null> {
  try {
    // Check if Appwrite is available
    const isHealthy = await checkAppwriteHealth();
    if (!isHealthy) {
      return null;
    }

    // Ensure we have a session
    const hasSession = await getOrCreateSession();
    if (!hasSession) {
      return null;
    }

    const docs = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.settings,
      [Query.equal('userId', ANONYMOUS_USER_ID)]
    );

    if (docs.documents.length === 0) {
      return null;
    }

    const settingsData = docs.documents[0].settings as string;
    return JSON.parse(settingsData) as DashboardSettings;
  } catch (error) {
    console.error('Failed to get settings from Appwrite:', error);
    return null;
  }
}

/**
 * Metrics History Management
 */

export interface MetricsSnapshot {
  timestamp: string;
  cpu: number;
  memoryUsed: number;
  memoryTotal: number;
  diskUsed: number;
  diskTotal: number;
  networkUp: number;
  networkDown: number;
}

export async function saveMetricsSnapshot(metrics: Omit<MetricsSnapshot, 'timestamp'>): Promise<boolean> {
  try {
    const isHealthy = await checkAppwriteHealth();
    if (!isHealthy) return false;

    const hasSession = await getOrCreateSession();
    if (!hasSession) return false;

    await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.metricsHistory,
      ID.unique(),
      {
        timestamp: new Date().toISOString(),
        ...metrics,
      }
    );

    return true;
  } catch (error) {
    console.error('Failed to save metrics snapshot:', error);
    return false;
  }
}

export async function getMetricsHistory(
  timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<MetricsSnapshot[]> {
  try {
    const isHealthy = await checkAppwriteHealth();
    if (!isHealthy) return [];

    const hasSession = await getOrCreateSession();
    if (!hasSession) return [];

    // Calculate time range
    const now = new Date();
    const ranges = {
      hour: 1000 * 60 * 60,
      day: 1000 * 60 * 60 * 24,
      week: 1000 * 60 * 60 * 24 * 7,
      month: 1000 * 60 * 60 * 24 * 30,
    };
    const startTime = new Date(now.getTime() - ranges[timeRange]).toISOString();

    const docs = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.metricsHistory,
      [
        Query.greaterThan('timestamp', startTime),
        Query.orderDesc('timestamp'),
        Query.limit(1000),
      ]
    );

    return docs.documents.map((doc) => ({
      timestamp: doc.timestamp as string,
      cpu: doc.cpu as number,
      memoryUsed: doc.memoryUsed as number,
      memoryTotal: doc.memoryTotal as number,
      diskUsed: doc.diskUsed as number,
      diskTotal: doc.diskTotal as number,
      networkUp: doc.networkUp as number,
      networkDown: doc.networkDown as number,
    }));
  } catch (error) {
    console.error('Failed to get metrics history:', error);
    return [];
  }
}

/**
 * Incident Management
 */

export interface Incident {
  $id?: string;
  serviceId: string;
  serviceName: string;
  startTime: string;
  endTime?: string;
  status: 'ongoing' | 'resolved';
  severity: 'critical' | 'major' | 'minor';
  description?: string;
}

export async function createIncident(incident: Omit<Incident, '$id'>): Promise<boolean> {
  try {
    const isHealthy = await checkAppwriteHealth();
    if (!isHealthy) return false;

    const hasSession = await getOrCreateSession();
    if (!hasSession) return false;

    await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.incidents,
      ID.unique(),
      incident
    );

    return true;
  } catch (error) {
    console.error('Failed to create incident:', error);
    return false;
  }
}

export async function resolveIncident(incidentId: string): Promise<boolean> {
  try {
    const isHealthy = await checkAppwriteHealth();
    if (!isHealthy) return false;

    const hasSession = await getOrCreateSession();
    if (!hasSession) return false;

    await databases.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.incidents,
      incidentId,
      {
        endTime: new Date().toISOString(),
        status: 'resolved',
      }
    );

    return true;
  } catch (error) {
    console.error('Failed to resolve incident:', error);
    return false;
  }
}

export async function getIncidents(
  status?: 'ongoing' | 'resolved',
  limit: number = 50
): Promise<Incident[]> {
  try {
    const isHealthy = await checkAppwriteHealth();
    if (!isHealthy) return [];

    const hasSession = await getOrCreateSession();
    if (!hasSession) return [];

    const queries = [Query.orderDesc('startTime'), Query.limit(limit)];

    if (status) {
      queries.push(Query.equal('status', status));
    }

    const docs = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.incidents,
      queries
    );

    return docs.documents.map((doc) => ({
      $id: doc.$id,
      serviceId: doc.serviceId as string,
      serviceName: doc.serviceName as string,
      startTime: doc.startTime as string,
      endTime: doc.endTime as string | undefined,
      status: doc.status as 'ongoing' | 'resolved',
      severity: doc.severity as 'critical' | 'major' | 'minor',
      description: doc.description as string | undefined,
    }));
  } catch (error) {
    console.error('Failed to get incidents:', error);
    return [];
  }
}

/**
 * Alert Management
 */

export interface Alert {
  $id?: string;
  userId: string;
  type: 'cpu' | 'memory' | 'disk' | 'service';
  threshold: number;
  enabled: boolean;
  createdAt: string;
  triggeredAt?: string;
  metadata?: string; // JSON string
}

export async function saveAlert(alert: Omit<Alert, '$id' | 'userId' | 'createdAt'>): Promise<boolean> {
  try {
    const isHealthy = await checkAppwriteHealth();
    if (!isHealthy) return false;

    const hasSession = await getOrCreateSession();
    if (!hasSession) return false;

    await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.alerts,
      ID.unique(),
      {
        userId: ANONYMOUS_USER_ID,
        createdAt: new Date().toISOString(),
        ...alert,
      }
    );

    return true;
  } catch (error) {
    console.error('Failed to save alert:', error);
    return false;
  }
}

export async function updateAlert(alertId: string, updates: Partial<Alert>): Promise<boolean> {
  try {
    const isHealthy = await checkAppwriteHealth();
    if (!isHealthy) return false;

    const hasSession = await getOrCreateSession();
    if (!hasSession) return false;

    await databases.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.alerts,
      alertId,
      updates
    );

    return true;
  } catch (error) {
    console.error('Failed to update alert:', error);
    return false;
  }
}

export async function getAlerts(enabled?: boolean): Promise<Alert[]> {
  try {
    const isHealthy = await checkAppwriteHealth();
    if (!isHealthy) return [];

    const hasSession = await getOrCreateSession();
    if (!hasSession) return [];

    const queries = [
      Query.equal('userId', ANONYMOUS_USER_ID),
      Query.orderDesc('createdAt'),
    ];

    if (enabled !== undefined) {
      queries.push(Query.equal('enabled', enabled));
    }

    const docs = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.alerts,
      queries
    );

    return docs.documents.map((doc) => ({
      $id: doc.$id,
      userId: doc.userId as string,
      type: doc.type as 'cpu' | 'memory' | 'disk' | 'service',
      threshold: doc.threshold as number,
      enabled: doc.enabled as boolean,
      createdAt: doc.createdAt as string,
      triggeredAt: doc.triggeredAt as string | undefined,
      metadata: doc.metadata as string | undefined,
    }));
  } catch (error) {
    console.error('Failed to get alerts:', error);
    return [];
  }
}

export async function deleteAlert(alertId: string): Promise<boolean> {
  try {
    const isHealthy = await checkAppwriteHealth();
    if (!isHealthy) return false;

    const hasSession = await getOrCreateSession();
    if (!hasSession) return false;

    await databases.deleteDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.alerts,
      alertId
    );

    return true;
  } catch (error) {
    console.error('Failed to delete alert:', error);
    return false;
  }
}
