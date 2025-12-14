/**
 * Database Module Index
 * 
 * Re-exports all database operations from sub-modules for backward compatibility.
 */

// Connection and core operations
export { getDb, closeDb, getDatabaseStats } from './connection';

// Metrics operations
export {
  type MetricsSnapshot,
  insertMetricsSnapshot,
  getLatestMetrics,
  getMetricsHistory,
} from './metrics';

// Container operations
export {
  type ContainerSnapshot,
  insertContainerStats,
  getContainerHistory,
  getLatestContainerStats,
} from './containers';

// Service operations
export {
  type ServiceSnapshot,
  insertServiceStatus,
  getServiceHistory,
  getLatestServiceStatus,
  getTrackedServiceIds,
  removeServiceData,
} from './services';

// Notification operations
export {
  type Notification,
  addNotification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from './notifications';

// Aggregation operations
export {
  aggregateHourlyMetrics,
  aggregateDailyMetrics,
} from './aggregation';

// Uptime operations
export {
  type ServiceUptime,
  type UptimeHistoryEntry,
  getServiceUptime,
  getAllServiceUptimes,
  getServiceUptimeHistory,
} from './uptime';

// Incident operations
export {
  type Incident,
  ensureIncidentsTable,
  createIncident,
  updateIncident,
  getActiveIncidents,
  getRecentIncidents,
  resolveIncident,
} from './incidents';
