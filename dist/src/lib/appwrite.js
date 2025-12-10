"use strict";
/**
 * Appwrite Client Configuration
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. Install Appwrite SDK:
 *    npm install appwrite
 *
 * 2. Create Appwrite Project:
 *    - Open Appwrite Console: https://backend.firefetch.org/console (or http://localhost:8090)
 *    - Click "Create Project"
 *    - Name: "FireFetch Dashboard"
 *    - Copy the Project ID
 *    - Update APPWRITE_PROJECT_ID below
 *
 * 3. Create Database:
 *    - Go to Databases in sidebar
 *    - Click "Create Database"
 *    - Name: "dashboard"
 *    - Copy Database ID
 *    - Update APPWRITE_DATABASE_ID below
 *
 * 4. Create Collections (in the "dashboard" database):
 *
 *    Collection: "settings"
 *    - Attributes:
 *      - userId (string, required, size: 255)
 *      - settings (string, required, size: 10000) - JSON stringified settings
 *      - updatedAt (datetime, required)
 *    - Indexes:
 *      - userId (unique)
 *    - Permissions:
 *      - Role: Any - Read
 *      - Role: Any - Write
 *
 *    Collection: "metrics_history"
 *    - Attributes:
 *      - timestamp (datetime, required)
 *      - cpu (integer, required)
 *      - memoryUsed (integer, required)
 *      - memoryTotal (integer, required)
 *      - diskUsed (integer, required)
 *      - diskTotal (integer, required)
 *      - networkUp (integer, required)
 *      - networkDown (integer, required)
 *    - Indexes:
 *      - timestamp (key)
 *    - Permissions:
 *      - Role: Any - Read
 *      - Role: Any - Write
 *
 *    Collection: "incidents"
 *    - Attributes:
 *      - serviceId (string, required, size: 255)
 *      - serviceName (string, required, size: 255)
 *      - startTime (datetime, required)
 *      - endTime (datetime, optional)
 *      - status (string, required, size: 50) - "ongoing" | "resolved"
 *      - severity (string, required, size: 50) - "critical" | "major" | "minor"
 *      - description (string, optional, size: 1000)
 *    - Indexes:
 *      - serviceId (key)
 *      - startTime (key)
 *      - status (key)
 *    - Permissions:
 *      - Role: Any - Read
 *      - Role: Any - Write
 *
 *    Collection: "alerts"
 *    - Attributes:
 *      - userId (string, required, size: 255)
 *      - type (string, required, size: 50) - "cpu" | "memory" | "disk" | "service"
 *      - threshold (integer, required)
 *      - enabled (boolean, required)
 *      - createdAt (datetime, required)
 *      - triggeredAt (datetime, optional)
 *      - metadata (string, optional, size: 1000) - JSON string
 *    - Indexes:
 *      - userId (key)
 *      - type (key)
 *      - enabled (key)
 *    - Permissions:
 *      - Role: Any - Read
 *      - Role: Any - Write
 *
 * 5. Update Collection IDs below after creation
 *
 * 6. (Optional) Create API Key for server-side operations:
 *    - Go to Settings > API Keys
 *    - Create key with appropriate scopes
 *    - Store in .env file (never commit)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = exports.account = exports.databases = exports.appwriteClient = exports.APPWRITE_CONFIG = void 0;
exports.checkAppwriteHealth = checkAppwriteHealth;
exports.getOrCreateSession = getOrCreateSession;
const appwrite_1 = require("appwrite");
Object.defineProperty(exports, "Query", { enumerable: true, get: function () { return appwrite_1.Query; } });
// Configuration - Update these values after Appwrite setup
exports.APPWRITE_CONFIG = {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'http://localhost:8090/v1',
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'firefetch-dashboard', // UPDATE THIS
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'dashboard', // UPDATE THIS
    collections: {
        settings: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_SETTINGS || 'settings', // UPDATE THIS
        metricsHistory: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_METRICS || 'metrics_history', // UPDATE THIS
        incidents: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_INCIDENTS || 'incidents', // UPDATE THIS
        alerts: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ALERTS || 'alerts', // UPDATE THIS
    },
};
// Initialize Appwrite Client
exports.appwriteClient = new appwrite_1.Client()
    .setEndpoint(exports.APPWRITE_CONFIG.endpoint)
    .setProject(exports.APPWRITE_CONFIG.projectId);
// Initialize Appwrite Services
exports.databases = new appwrite_1.Databases(exports.appwriteClient);
exports.account = new appwrite_1.Account(exports.appwriteClient);
// Health check function
async function checkAppwriteHealth() {
    try {
        const response = await fetch(`${exports.APPWRITE_CONFIG.endpoint}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.ok;
    }
    catch (error) {
        console.error('Appwrite health check failed:', error);
        return false;
    }
}
// Get or create anonymous session
async function getOrCreateSession() {
    try {
        // Try to get current session
        await exports.account.get();
        return true;
    }
    catch (error) {
        // No session exists, create anonymous session
        try {
            await exports.account.createAnonymousSession();
            return true;
        }
        catch (sessionError) {
            console.error('Failed to create anonymous session:', sessionError);
            return false;
        }
    }
}
