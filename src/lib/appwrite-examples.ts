/**
 * Appwrite Service Usage Examples
 *
 * This file contains examples of how to use the Appwrite service functions
 * throughout the dashboard application.
 */

import {
  saveSettings,
  getSettings,
  saveMetricsSnapshot,
  getMetricsHistory,
  createIncident,
  resolveIncident,
  getIncidents,
  saveAlert,
  updateAlert,
  getAlerts,
  deleteAlert,
  type MetricsSnapshot,
  type Incident,
  type Alert,
} from './appwrite-service';
import type { DashboardSettings } from './settings';

// ============================================================================
// SETTINGS EXAMPLES
// ============================================================================

/**
 * Example: Load user settings on app initialization
 */
async function exampleLoadSettings() {
  const settings = await getSettings();

  if (settings) {
    console.log('Loaded settings from Appwrite:', settings);
    return settings;
  } else {
    console.log('No settings found, using defaults');
    return null;
  }
}

/**
 * Example: Save user settings when they change
 */
async function exampleSaveSettings(settings: DashboardSettings) {
  const success = await saveSettings(settings);

  if (success) {
    console.log('Settings saved successfully');
  } else {
    console.log('Failed to save to Appwrite (localStorage still saved)');
  }
}

// ============================================================================
// METRICS HISTORY EXAMPLES
// ============================================================================

/**
 * Example: Save current system metrics snapshot
 * This could be called every minute to build historical data
 */
async function exampleSaveMetrics(currentMetrics: any) {
  await saveMetricsSnapshot({
    cpu: currentMetrics.cpu,
    memoryUsed: currentMetrics.memory.used,
    memoryTotal: currentMetrics.memory.total,
    diskUsed: currentMetrics.disk.used,
    diskTotal: currentMetrics.disk.total,
    networkUp: currentMetrics.network.up,
    networkDown: currentMetrics.network.down,
  });
}

/**
 * Example: Get metrics history for graphing
 */
async function exampleGetMetricsForGraph() {
  // Get last 24 hours of metrics
  const dayMetrics = await getMetricsHistory('day');

  // Transform for chart
  const chartData = dayMetrics.map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString(),
    cpu: m.cpu,
    memory: Math.round((m.memoryUsed / m.memoryTotal) * 100),
    disk: Math.round((m.diskUsed / m.diskTotal) * 100),
  }));

  return chartData;
}

/**
 * Example: Get different time ranges
 */
async function exampleGetMetricsByTimeRange() {
  const hourMetrics = await getMetricsHistory('hour');   // Last hour
  const dayMetrics = await getMetricsHistory('day');     // Last 24 hours
  const weekMetrics = await getMetricsHistory('week');   // Last 7 days
  const monthMetrics = await getMetricsHistory('month'); // Last 30 days

  return { hourMetrics, dayMetrics, weekMetrics, monthMetrics };
}

// ============================================================================
// INCIDENT TRACKING EXAMPLES
// ============================================================================

/**
 * Example: Create incident when service goes down
 */
async function exampleCreateIncident(serviceId: string, serviceName: string) {
  await createIncident({
    serviceId,
    serviceName,
    startTime: new Date().toISOString(),
    status: 'ongoing',
    severity: 'critical',
    description: 'Service is not responding to health checks',
  });
}

/**
 * Example: Resolve incident when service recovers
 */
async function exampleResolveIncident(incidentId: string) {
  const success = await resolveIncident(incidentId);

  if (success) {
    console.log('Incident resolved successfully');
  }
}

/**
 * Example: Get all ongoing incidents for display
 */
async function exampleGetOngoingIncidents() {
  const incidents = await getIncidents('ongoing');

  // Display in UI
  incidents.forEach(incident => {
    const duration = Date.now() - new Date(incident.startTime).getTime();
    console.log(`${incident.serviceName}: Down for ${Math.round(duration / 60000)} minutes`);
  });

  return incidents;
}

/**
 * Example: Get incident history for a specific service
 */
async function exampleGetServiceIncidentHistory(serviceId: string) {
  const allIncidents = await getIncidents();

  // Filter by service
  const serviceIncidents = allIncidents.filter(i => i.serviceId === serviceId);

  // Calculate uptime
  const totalDowntime = serviceIncidents.reduce((sum, incident) => {
    const start = new Date(incident.startTime).getTime();
    const end = incident.endTime ? new Date(incident.endTime).getTime() : Date.now();
    return sum + (end - start);
  }, 0);

  return {
    incidents: serviceIncidents,
    totalDowntime,
    incidentCount: serviceIncidents.length,
  };
}

// ============================================================================
// ALERT MANAGEMENT EXAMPLES
// ============================================================================

/**
 * Example: Create CPU usage alert
 */
async function exampleCreateCPUAlert() {
  await saveAlert({
    type: 'cpu',
    threshold: 80,
    enabled: true,
    metadata: JSON.stringify({
      notifyEmail: 'admin@example.com',
      description: 'Alert when CPU usage exceeds 80%',
    }),
  });
}

/**
 * Example: Create multiple alerts for different metrics
 */
async function exampleCreateSystemAlerts() {
  const alerts = [
    { type: 'cpu' as const, threshold: 80, description: 'High CPU usage' },
    { type: 'memory' as const, threshold: 85, description: 'High memory usage' },
    { type: 'disk' as const, threshold: 90, description: 'Low disk space' },
  ];

  for (const alert of alerts) {
    await saveAlert({
      type: alert.type,
      threshold: alert.threshold,
      enabled: true,
      metadata: JSON.stringify({ description: alert.description }),
    });
  }
}

/**
 * Example: Check if any alerts should be triggered
 */
async function exampleCheckAlerts(currentMetrics: any) {
  const enabledAlerts = await getAlerts(true);

  for (const alert of enabledAlerts) {
    let currentValue = 0;

    switch (alert.type) {
      case 'cpu':
        currentValue = currentMetrics.cpu;
        break;
      case 'memory':
        currentValue = currentMetrics.memory.percent;
        break;
      case 'disk':
        currentValue = currentMetrics.disk.percent;
        break;
    }

    if (currentValue >= alert.threshold && alert.$id) {
      // Alert triggered!
      await updateAlert(alert.$id, {
        triggeredAt: new Date().toISOString(),
      });

      console.log(`ALERT: ${alert.type} is at ${currentValue}% (threshold: ${alert.threshold}%)`);

      // Send notification here...
    }
  }
}

/**
 * Example: Toggle alert on/off
 */
async function exampleToggleAlert(alertId: string, enabled: boolean) {
  await updateAlert(alertId, { enabled });
}

/**
 * Example: Update alert threshold
 */
async function exampleUpdateAlertThreshold(alertId: string, newThreshold: number) {
  await updateAlert(alertId, { threshold: newThreshold });
}

/**
 * Example: Delete old alerts
 */
async function exampleDeleteOldAlerts() {
  const allAlerts = await getAlerts();

  // Delete alerts older than 30 days
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  for (const alert of allAlerts) {
    const createdAt = new Date(alert.createdAt).getTime();

    if (createdAt < thirtyDaysAgo && alert.$id) {
      await deleteAlert(alert.$id);
      console.log('Deleted old alert:', alert.type);
    }
  }
}

// ============================================================================
// COMBINED USAGE EXAMPLES
// ============================================================================

/**
 * Example: Complete monitoring workflow
 */
async function exampleMonitoringWorkflow() {
  // 1. Fetch current metrics
  const metrics = await fetch('/api/metrics').then(r => r.json());

  // 2. Save metrics snapshot for history
  await saveMetricsSnapshot({
    cpu: metrics.cpu,
    memoryUsed: metrics.memory.used,
    memoryTotal: metrics.memory.total,
    diskUsed: metrics.disk.used,
    diskTotal: metrics.disk.total,
    networkUp: metrics.network.up,
    networkDown: metrics.network.down,
  });

  // 3. Check if any alerts should be triggered
  await exampleCheckAlerts(metrics);

  // 4. Check service health
  const services = await fetch('/api/services').then(r => r.json());

  for (const service of services.services) {
    if (service.status === 'offline') {
      // Check if incident already exists
      const incidents = await getIncidents('ongoing');
      const existingIncident = incidents.find(i => i.serviceId === service.id);

      if (!existingIncident) {
        // Create new incident
        await createIncident({
          serviceId: service.id,
          serviceName: service.name,
          startTime: new Date().toISOString(),
          status: 'ongoing',
          severity: 'critical',
          description: `Service is ${service.status}`,
        });
      }
    } else {
      // Service is online, resolve any ongoing incidents
      const incidents = await getIncidents('ongoing');
      const serviceIncident = incidents.find(i => i.serviceId === service.id);

      if (serviceIncident && serviceIncident.$id) {
        await resolveIncident(serviceIncident.$id);
      }
    }
  }
}

/**
 * Example: Dashboard initialization
 */
async function exampleDashboardInit() {
  // Load user settings
  const settings = await getSettings();

  // Get recent incidents
  const recentIncidents = await getIncidents(undefined, 10);

  // Get metrics for the last hour
  const metricsHistory = await getMetricsHistory('hour');

  // Get active alerts
  const activeAlerts = await getAlerts(true);

  return {
    settings,
    recentIncidents,
    metricsHistory,
    activeAlerts,
  };
}

// Export examples for reference
export {
  exampleLoadSettings,
  exampleSaveSettings,
  exampleSaveMetrics,
  exampleGetMetricsForGraph,
  exampleGetMetricsByTimeRange,
  exampleCreateIncident,
  exampleResolveIncident,
  exampleGetOngoingIncidents,
  exampleGetServiceIncidentHistory,
  exampleCreateCPUAlert,
  exampleCreateSystemAlerts,
  exampleCheckAlerts,
  exampleToggleAlert,
  exampleUpdateAlertThreshold,
  exampleDeleteOldAlerts,
  exampleMonitoringWorkflow,
  exampleDashboardInit,
};
