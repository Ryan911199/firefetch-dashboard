#!/usr/bin/env node

/**
 * Appwrite Setup Script for FireFetch Dashboard
 *
 * This script automates the setup of Appwrite database and collections
 * for the FireFetch Dashboard project.
 *
 * Usage: node scripts/setup-appwrite.js
 */

const { Client, Databases, ID, Permission, Role } = require('node-appwrite');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper functions for colored output
const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.blue}▶${colors.reset} ${msg}`),
  dim: (msg) => console.log(`${colors.dim}${msg}${colors.reset}`),
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');

  if (!fs.existsSync(envPath)) {
    log.warning('.env.local file not found');
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

// Update .env.local file with new values
function updateEnvFile(updates) {
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or add each key
  Object.entries(updates).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  });

  fs.writeFileSync(envPath, envContent.trim() + '\n');
  log.success('Updated .env.local file');
}

// Database and collection configuration
const DATABASE_ID = 'dashboard';
const DATABASE_NAME = 'dashboard';

const COLLECTIONS = [
  {
    id: 'settings',
    name: 'settings',
    attributes: [
      { key: 'userId', type: 'string', size: 255, required: true },
      { key: 'settings', type: 'string', size: 10000, required: true },
      { key: 'updatedAt', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'userId', type: 'unique', attributes: ['userId'] },
    ],
  },
  {
    id: 'metrics_history',
    name: 'metrics_history',
    attributes: [
      { key: 'timestamp', type: 'datetime', required: true },
      { key: 'cpu', type: 'integer', required: true },
      { key: 'memoryUsed', type: 'integer', required: true },
      { key: 'memoryTotal', type: 'integer', required: true },
      { key: 'diskUsed', type: 'integer', required: true },
      { key: 'diskTotal', type: 'integer', required: true },
      { key: 'networkUp', type: 'integer', required: true },
      { key: 'networkDown', type: 'integer', required: true },
    ],
    indexes: [
      { key: 'timestamp', type: 'key', attributes: ['timestamp'] },
    ],
  },
  {
    id: 'incidents',
    name: 'incidents',
    attributes: [
      { key: 'serviceId', type: 'string', size: 255, required: true },
      { key: 'serviceName', type: 'string', size: 255, required: true },
      { key: 'startTime', type: 'datetime', required: true },
      { key: 'endTime', type: 'datetime', required: false },
      { key: 'status', type: 'string', size: 50, required: true },
      { key: 'severity', type: 'string', size: 50, required: true },
      { key: 'description', type: 'string', size: 1000, required: false },
    ],
    indexes: [
      { key: 'serviceId', type: 'key', attributes: ['serviceId'] },
      { key: 'startTime', type: 'key', attributes: ['startTime'] },
      { key: 'status', type: 'key', attributes: ['status'] },
    ],
  },
  {
    id: 'alerts',
    name: 'alerts',
    attributes: [
      { key: 'userId', type: 'string', size: 255, required: true },
      { key: 'type', type: 'string', size: 50, required: true },
      { key: 'threshold', type: 'integer', required: true },
      { key: 'enabled', type: 'boolean', required: true },
      { key: 'createdAt', type: 'datetime', required: true },
      { key: 'triggeredAt', type: 'datetime', required: false },
      { key: 'metadata', type: 'string', size: 1000, required: false },
    ],
    indexes: [
      { key: 'userId', type: 'key', attributes: ['userId'] },
      { key: 'type', type: 'key', attributes: ['type'] },
      { key: 'enabled', type: 'key', attributes: ['enabled'] },
    ],
  },
];

// Main setup function
async function setup() {
  console.log('\n' + colors.bright + '╔════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.bright + '║   FireFetch Dashboard - Appwrite Setup         ║' + colors.reset);
  console.log(colors.bright + '╚════════════════════════════════════════════════╝' + colors.reset + '\n');

  try {
    // Load environment variables
    const env = loadEnvFile();

    // Get configuration
    const endpoint = env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'http://localhost:8090/v1';
    let projectId = env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';

    log.info(`Appwrite Endpoint: ${endpoint}`);

    // Prompt for project ID if not set
    if (!projectId) {
      console.log();
      log.warning('No project ID found in .env.local');
      console.log();
      log.dim('  To create a project:');
      log.dim('  1. Open Appwrite Console: ' + endpoint.replace('/v1', '') + '/console');
      log.dim('  2. Click "Create Project"');
      log.dim('  3. Enter name: "FireFetch Dashboard"');
      log.dim('  4. Copy the generated Project ID');
      console.log();

      projectId = await question(colors.cyan + '? ' + colors.reset + 'Enter your Appwrite Project ID: ');
      projectId = projectId.trim();

      if (!projectId) {
        log.error('Project ID is required');
        process.exit(1);
      }

      // Save to .env.local
      updateEnvFile({ NEXT_PUBLIC_APPWRITE_PROJECT_ID: projectId });
    } else {
      log.success(`Using project ID: ${projectId}`);
    }

    console.log();
    log.step('Connecting to Appwrite...');

    // Initialize Appwrite client
    const client = new Client();
    client
      .setEndpoint(endpoint)
      .setProject(projectId);

    const databases = new Databases(client);

    // Test connection by trying to get the project
    try {
      await databases.list();
      log.success('Connected to Appwrite successfully');
    } catch (error) {
      log.error('Failed to connect to Appwrite');
      log.error(`Error: ${error.message}`);
      console.log();
      log.dim('  Make sure:');
      log.dim('  1. Appwrite is running');
      log.dim('  2. Project ID is correct');
      log.dim('  3. Endpoint is accessible');
      process.exit(1);
    }

    // Create or verify database
    console.log();
    log.step(`Checking database "${DATABASE_NAME}"...`);

    let databaseExists = false;
    try {
      await databases.get(DATABASE_ID);
      log.success(`Database "${DATABASE_NAME}" already exists`);
      databaseExists = true;
    } catch (error) {
      if (error.code === 404) {
        log.info(`Creating database "${DATABASE_NAME}"...`);
        try {
          await databases.create(DATABASE_ID, DATABASE_NAME);
          log.success(`Created database "${DATABASE_NAME}"`);
          databaseExists = true;
        } catch (createError) {
          log.error(`Failed to create database: ${createError.message}`);
          process.exit(1);
        }
      } else {
        log.error(`Error checking database: ${error.message}`);
        process.exit(1);
      }
    }

    // Save database ID to .env.local
    updateEnvFile({ NEXT_PUBLIC_APPWRITE_DATABASE_ID: DATABASE_ID });

    // Create collections
    console.log();
    log.step('Setting up collections...');
    console.log();

    const collectionEnvUpdates = {};

    for (const collectionConfig of COLLECTIONS) {
      log.info(`Processing collection: ${collectionConfig.name}`);

      let collectionExists = false;
      let collection;

      // Check if collection exists
      try {
        collection = await databases.getCollection(DATABASE_ID, collectionConfig.id);
        log.success(`  Collection "${collectionConfig.name}" already exists`);
        collectionExists = true;
      } catch (error) {
        if (error.code === 404) {
          // Create collection
          try {
            log.dim(`  Creating collection...`);
            collection = await databases.createCollection(
              DATABASE_ID,
              collectionConfig.id,
              collectionConfig.name,
              [
                Permission.read(Role.any()),
                Permission.create(Role.any()),
                Permission.update(Role.any()),
                Permission.delete(Role.any()),
              ]
            );
            log.success(`  Created collection "${collectionConfig.name}"`);
          } catch (createError) {
            log.error(`  Failed to create collection: ${createError.message}`);
            continue;
          }
        } else {
          log.error(`  Error checking collection: ${error.message}`);
          continue;
        }
      }

      // Add attributes
      if (!collectionExists) {
        for (const attr of collectionConfig.attributes) {
          try {
            log.dim(`  Adding attribute: ${attr.key}`);

            switch (attr.type) {
              case 'string':
                await databases.createStringAttribute(
                  DATABASE_ID,
                  collectionConfig.id,
                  attr.key,
                  attr.size,
                  attr.required
                );
                break;
              case 'integer':
                await databases.createIntegerAttribute(
                  DATABASE_ID,
                  collectionConfig.id,
                  attr.key,
                  attr.required
                );
                break;
              case 'boolean':
                await databases.createBooleanAttribute(
                  DATABASE_ID,
                  collectionConfig.id,
                  attr.key,
                  attr.required
                );
                break;
              case 'datetime':
                await databases.createDatetimeAttribute(
                  DATABASE_ID,
                  collectionConfig.id,
                  attr.key,
                  attr.required
                );
                break;
            }

            // Wait a bit to allow attribute to be created
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            if (error.code === 409) {
              log.dim(`  Attribute ${attr.key} already exists`);
            } else {
              log.warning(`  Failed to create attribute ${attr.key}: ${error.message}`);
            }
          }
        }

        // Wait for all attributes to be ready
        log.dim(`  Waiting for attributes to be ready...`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create indexes
        for (const index of collectionConfig.indexes) {
          try {
            log.dim(`  Creating index: ${index.key}`);
            await databases.createIndex(
              DATABASE_ID,
              collectionConfig.id,
              index.key,
              index.type,
              index.attributes
            );
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            if (error.code === 409) {
              log.dim(`  Index ${index.key} already exists`);
            } else {
              log.warning(`  Failed to create index ${index.key}: ${error.message}`);
            }
          }
        }

        log.success(`  Configured collection "${collectionConfig.name}"`);
      }

      // Save collection ID to env updates
      const envKey = `NEXT_PUBLIC_APPWRITE_COLLECTION_${collectionConfig.id.toUpperCase()}`;
      collectionEnvUpdates[envKey] = collectionConfig.id;

      console.log();
    }

    // Update .env.local with collection IDs
    updateEnvFile(collectionEnvUpdates);

    // Final summary
    console.log();
    console.log(colors.bright + '╔════════════════════════════════════════════════╗' + colors.reset);
    console.log(colors.bright + '║   Setup Complete!                              ║' + colors.reset);
    console.log(colors.bright + '╚════════════════════════════════════════════════╝' + colors.reset);
    console.log();
    log.success('Appwrite setup completed successfully');
    console.log();
    log.info('Configuration saved to .env.local:');
    log.dim(`  NEXT_PUBLIC_APPWRITE_ENDPOINT=${endpoint}`);
    log.dim(`  NEXT_PUBLIC_APPWRITE_PROJECT_ID=${projectId}`);
    log.dim(`  NEXT_PUBLIC_APPWRITE_DATABASE_ID=${DATABASE_ID}`);
    COLLECTIONS.forEach(col => {
      const envKey = `NEXT_PUBLIC_APPWRITE_COLLECTION_${col.id.toUpperCase()}`;
      log.dim(`  ${envKey}=${col.id}`);
    });
    console.log();
    log.info('Next steps:');
    log.dim('  1. Verify collections in Appwrite Console');
    log.dim('  2. Enable Anonymous authentication in project settings');
    log.dim('  3. Add web platform with hostname: http://localhost:3002');
    log.dim('  4. Restart your dashboard: npm run dev');
    console.log();
    log.dim('For more information, see: APPWRITE_SETUP.md');
    console.log();

  } catch (error) {
    console.log();
    log.error('Setup failed');
    log.error(`Error: ${error.message}`);
    console.log();
    if (error.stack) {
      log.dim(error.stack);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
setup().catch(error => {
  console.error(error);
  process.exit(1);
});
