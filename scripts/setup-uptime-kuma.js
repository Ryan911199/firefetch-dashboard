#!/usr/bin/env node
/**
 * Uptime Kuma Setup Script
 *
 * This script programmatically configures Uptime Kuma with monitors for all
 * FireFetch services and creates a public status page.
 *
 * Requirements:
 * - Uptime Kuma running at http://localhost:3001
 * - Valid admin credentials or API token
 * - socket.io-client installed (npm install socket.io-client)
 *
 * Usage:
 *   node scripts/setup-uptime-kuma.js
 *
 * Environment Variables:
 *   UPTIME_KUMA_URL - Uptime Kuma URL (default: http://localhost:3001)
 *   UPTIME_KUMA_USERNAME - Admin username (required if no token)
 *   UPTIME_KUMA_PASSWORD - Admin password (required if no token)
 *   UPTIME_KUMA_TOKEN - JWT token (alternative to username/password)
 */

const { io } = require('socket.io-client');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  uptimeKumaUrl: process.env.UPTIME_KUMA_URL || 'http://localhost:3001',
  username: process.env.UPTIME_KUMA_USERNAME,
  password: process.env.UPTIME_KUMA_PASSWORD,
  token: process.env.UPTIME_KUMA_TOKEN,
  servicesJsonPath: '/home/ubuntu/ai/infrastructure/services.json',
  statusPageSlug: 'firefetch',
  statusPageTitle: 'FireFetch Services Status',
};

// Service monitor configurations
const monitorDefaults = {
  interval: 60, // Check every 60 seconds
  retryInterval: 60,
  maxretries: 3,
  notificationIDList: [],
  upsideDown: false,
  maxredirects: 10,
  accepted_statuscodes: ['200-299'],
  dns_resolve_type: 'A',
  dns_resolve_server: '1.1.1.1',
  proxyId: null,
};

// Colors for logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

// Logging helpers
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.cyan);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

// Load services from services.json
function loadServices() {
  try {
    const servicesData = fs.readFileSync(config.servicesJsonPath, 'utf8');
    const servicesJson = JSON.parse(servicesData);
    return servicesJson.services.filter(s => s.status === 'active');
  } catch (error) {
    logError(`Failed to load services.json: ${error.message}`);
    process.exit(1);
  }
}

// Connect to Uptime Kuma via Socket.IO
function connectToUptimeKuma() {
  return new Promise((resolve, reject) => {
    log('\nConnecting to Uptime Kuma...', colors.bright);
    logInfo(`URL: ${config.uptimeKumaUrl}`);

    const socket = io(config.uptimeKumaUrl, {
      reconnection: false,
      timeout: 10000,
    });

    socket.on('connect', () => {
      logSuccess('Connected to Uptime Kuma');
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      logError(`Connection failed: ${error.message}`);
      reject(error);
    });

    socket.on('disconnect', () => {
      logInfo('Disconnected from Uptime Kuma');
    });
  });
}

// Authenticate with Uptime Kuma
function authenticate(socket) {
  return new Promise((resolve, reject) => {
    log('\nAuthenticating...', colors.bright);

    if (config.token) {
      logInfo('Using token authentication');
      socket.emit('loginByToken', config.token, (response) => {
        if (response.ok) {
          logSuccess('Authentication successful (token)');
          resolve();
        } else {
          logError(`Authentication failed: ${response.msg}`);
          reject(new Error(response.msg));
        }
      });
    } else if (config.username && config.password) {
      logInfo(`Authenticating as: ${config.username}`);
      socket.emit('login', {
        username: config.username,
        password: config.password,
      }, (response) => {
        if (response.ok) {
          logSuccess('Authentication successful');
          if (response.token) {
            logInfo('JWT Token received (save this for future use):');
            log(response.token, colors.yellow);
          }
          resolve();
        } else {
          logError(`Authentication failed: ${response.msg}`);
          reject(new Error(response.msg));
        }
      });
    } else {
      logError('No authentication credentials provided');
      logInfo('Set UPTIME_KUMA_USERNAME and UPTIME_KUMA_PASSWORD environment variables');
      logInfo('Or set UPTIME_KUMA_TOKEN for token-based authentication');
      reject(new Error('Missing credentials'));
    }
  });
}

// Get existing monitors
function getMonitorList(socket) {
  return new Promise((resolve) => {
    log('\nFetching existing monitors...', colors.bright);

    // Listen for monitor list
    socket.once('monitorList', (data) => {
      const monitors = Object.values(data);
      logInfo(`Found ${monitors.length} existing monitor(s)`);
      resolve(monitors);
    });

    // Request monitor list
    socket.emit('getMonitorList');
  });
}

// Create or update a monitor
function createOrUpdateMonitor(socket, service, existingMonitors) {
  return new Promise((resolve, reject) => {
    // Check if monitor already exists
    const existingMonitor = existingMonitors.find(m => m.name === service.name);

    const monitorData = {
      type: 'http',
      name: service.name,
      url: service.url,
      method: 'GET',
      headers: '',
      body: '',
      active: true,
      ...monitorDefaults,
    };

    if (existingMonitor) {
      logInfo(`Updating existing monitor: ${service.name}`);
      monitorData.id = existingMonitor.id;

      socket.emit('editMonitor', monitorData, (response) => {
        if (response.ok) {
          logSuccess(`Updated monitor: ${service.name} (ID: ${response.monitorID})`);
          resolve({ id: response.monitorID, name: service.name, created: false });
        } else {
          logError(`Failed to update monitor ${service.name}: ${response.msg}`);
          reject(new Error(response.msg));
        }
      });
    } else {
      logInfo(`Creating new monitor: ${service.name}`);

      socket.emit('add', monitorData, (response) => {
        if (response.ok) {
          logSuccess(`Created monitor: ${service.name} (ID: ${response.monitorID})`);
          resolve({ id: response.monitorID, name: service.name, created: true });
        } else {
          logError(`Failed to create monitor ${service.name}: ${response.msg}`);
          reject(new Error(response.msg));
        }
      });
    }
  });
}

// Create or update status page
function createOrUpdateStatusPage(socket, monitorIds) {
  return new Promise((resolve, reject) => {
    log('\nConfiguring status page...', colors.bright);

    const publicGroupList = [
      {
        name: 'FireFetch Services',
        monitorList: monitorIds.map(m => ({
          id: m.id,
        })),
      },
    ];

    const statusPageConfig = {
      slug: config.statusPageSlug,
      title: config.statusPageTitle,
      description: 'Real-time status of all FireFetch infrastructure services',
      icon: '/icon.svg',
      theme: 'auto',
      published: true,
      showTags: false,
      domainNameList: [],
      googleAnalyticsId: '',
      customCSS: '',
      footerText: null,
      showPoweredBy: true,
      config: {
        statusPageTheme: 'auto',
        statusPagePublished: true,
        statusPageTags: false,
        statusPageThemeAutomatic: true,
      },
      publicGroupList,
    };

    socket.emit('saveStatusPage',
      config.statusPageSlug,
      statusPageConfig,
      null, // imgDataUrl
      publicGroupList,
      (response) => {
        if (response.ok) {
          logSuccess(`Status page configured: ${config.statusPageSlug}`);
          logInfo(`Public URL: ${config.uptimeKumaUrl}/status/${config.statusPageSlug}`);
          logInfo(`API Endpoint: ${config.uptimeKumaUrl}/api/status-page/${config.statusPageSlug}`);
          resolve();
        } else {
          logError(`Failed to save status page: ${response.msg}`);
          reject(new Error(response.msg));
        }
      }
    );
  });
}

// Main setup function
async function setup() {
  let socket;

  try {
    log('='.repeat(60), colors.bright);
    log('  Uptime Kuma Setup for FireFetch Dashboard', colors.bright);
    log('='.repeat(60), colors.bright);

    // Load services
    const services = loadServices();
    logSuccess(`Loaded ${services.length} active service(s) from services.json`);
    services.forEach(s => logInfo(`  - ${s.name}: ${s.url}`));

    // Connect
    socket = await connectToUptimeKuma();

    // Authenticate
    await authenticate(socket);

    // Wait a bit for initial data
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get existing monitors
    const existingMonitors = await getMonitorList(socket);

    // Create/update monitors
    log('\nConfiguring monitors...', colors.bright);
    const monitorResults = [];
    for (const service of services) {
      try {
        const result = await createOrUpdateMonitor(socket, service, existingMonitors);
        monitorResults.push(result);
      } catch (error) {
        logWarning(`Skipping ${service.name}: ${error.message}`);
      }
    }

    // Create/update status page
    if (monitorResults.length > 0) {
      await createOrUpdateStatusPage(socket, monitorResults);
    } else {
      logWarning('No monitors were created, skipping status page setup');
    }

    // Summary
    log('\n' + '='.repeat(60), colors.bright);
    log('  Setup Complete!', colors.green + colors.bright);
    log('='.repeat(60), colors.bright);

    const created = monitorResults.filter(m => m.created).length;
    const updated = monitorResults.filter(m => !m.created).length;

    logSuccess(`Created ${created} new monitor(s)`);
    if (updated > 0) {
      logSuccess(`Updated ${updated} existing monitor(s)`);
    }

    log('\nNext Steps:', colors.bright);
    logInfo('1. Visit Uptime Kuma dashboard to verify monitors are running');
    logInfo(`   ${config.uptimeKumaUrl}`);
    logInfo('2. Check the public status page:');
    logInfo(`   ${config.uptimeKumaUrl}/status/${config.statusPageSlug}`);
    logInfo('3. Update your dashboard to use the status page API:');
    logInfo(`   ${config.uptimeKumaUrl}/api/status-page/${config.statusPageSlug}`);
    logInfo('4. The dashboard will auto-refresh uptime data every 60 seconds');

    log('');
  } catch (error) {
    logError(`\nSetup failed: ${error.message}`);
    process.exit(1);
  } finally {
    if (socket) {
      socket.disconnect();
    }
  }
}

// Run setup
if (require.main === module) {
  setup().catch(error => {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { setup };
