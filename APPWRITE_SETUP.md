# Appwrite Backend Integration Setup Guide

This guide walks you through setting up Appwrite backend integration for the FireFetch Dashboard.

## Overview

The dashboard now supports persistent storage through Appwrite, with graceful degradation to localStorage if Appwrite is unavailable.

**Features:**
- User settings persistence across devices
- Historical metrics data for graphs
- Incident tracking and management
- Alert configuration and history

## Prerequisites

- Appwrite backend running at https://backend.firefetch.org (or http://localhost:8090)
- Access to Appwrite Console
- Dashboard project dependencies installed (`npm install`)

## Setup Methods

You have two options for setting up Appwrite:

### Option 1: Automated Setup (Recommended)

Use the automated setup script for quick configuration:

```bash
cd /home/ubuntu/ai/dashboard
npm run setup:appwrite
```

The script will:
1. Connect to your Appwrite instance
2. Prompt for Project ID (create manually in console first)
3. Automatically create database and all collections
4. Set up attributes, indexes, and permissions
5. Update `.env.local` with configuration

**Note:** You still need to manually create the project in Appwrite Console and enable authentication.

See `/home/ubuntu/ai/dashboard/scripts/README.md` for detailed script documentation.

### Option 2: Manual Setup

Follow the steps below for manual configuration.

---

## Manual Setup Steps

### Step 1: Access Appwrite Console

Open the Appwrite Console:
- **External:** https://backend.firefetch.org/console
- **Local:** http://localhost:8090

### Step 2: Create Project

1. Click "Create Project"
2. Enter project details:
   - **Name:** FireFetch Dashboard
   - **Project ID:** firefetch-dashboard (or auto-generated)
3. Click "Create"
4. **Copy the Project ID** - you'll need this later

### Step 3: Create Database (Skip if using automated script)

1. In the left sidebar, click "Databases"
2. Click "Create Database"
3. Enter database details:
   - **Name:** dashboard
   - **Database ID:** dashboard (or auto-generated)
4. Click "Create"
5. **Copy the Database ID** - you'll need this later

### Step 4: Create Collections

You need to create 4 collections in the "dashboard" database. For each collection below:

1. Click "Create Collection"
2. Enter the collection name and ID
3. Add attributes as specified
4. Create indexes as specified
5. Set permissions as specified

---

#### Collection 1: settings

**Purpose:** Store user dashboard settings

**Collection ID:** `settings`

**Attributes:**
| Name | Type | Size | Required | Default | Array |
|------|------|------|----------|---------|-------|
| userId | String | 255 | Yes | - | No |
| settings | String | 10000 | Yes | - | No |
| updatedAt | DateTime | - | Yes | - | No |

**Indexes:**
| Key | Type | Attributes |
|-----|------|------------|
| userId | Unique | userId |

**Permissions:**
- Role: Any - Read
- Role: Any - Create
- Role: Any - Update
- Role: Any - Delete

---

#### Collection 2: metrics_history

**Purpose:** Store historical system metrics for graphing

**Collection ID:** `metrics_history`

**Attributes:**
| Name | Type | Required | Default | Array |
|------|------|----------|---------|-------|
| timestamp | DateTime | Yes | - | No |
| cpu | Integer | Yes | - | No |
| memoryUsed | Integer | Yes | - | No |
| memoryTotal | Integer | Yes | - | No |
| diskUsed | Integer | Yes | - | No |
| diskTotal | Integer | Yes | - | No |
| networkUp | Integer | Yes | - | No |
| networkDown | Integer | Yes | - | No |

**Indexes:**
| Key | Type | Attributes |
|-----|------|------------|
| timestamp | Key | timestamp |

**Permissions:**
- Role: Any - Read
- Role: Any - Create
- Role: Any - Update
- Role: Any - Delete

---

#### Collection 3: incidents

**Purpose:** Track service incidents and downtime

**Collection ID:** `incidents`

**Attributes:**
| Name | Type | Size | Required | Default | Array |
|------|------|------|----------|---------|-------|
| serviceId | String | 255 | Yes | - | No |
| serviceName | String | 255 | Yes | - | No |
| startTime | DateTime | - | Yes | - | No |
| endTime | DateTime | - | No | - | No |
| status | String | 50 | Yes | - | No |
| severity | String | 50 | Yes | - | No |
| description | String | 1000 | No | - | No |

**Enum Values:**
- **status:** "ongoing", "resolved"
- **severity:** "critical", "major", "minor"

**Indexes:**
| Key | Type | Attributes |
|-----|------|------------|
| serviceId | Key | serviceId |
| startTime | Key | startTime |
| status | Key | status |

**Permissions:**
- Role: Any - Read
- Role: Any - Create
- Role: Any - Update
- Role: Any - Delete

---

#### Collection 4: alerts

**Purpose:** Store alert configurations and history

**Collection ID:** `alerts`

**Attributes:**
| Name | Type | Size | Required | Default | Array |
|------|------|------|----------|---------|-------|
| userId | String | 255 | Yes | - | No |
| type | String | 50 | Yes | - | No |
| threshold | Integer | - | Yes | - | No |
| enabled | Boolean | - | Yes | - | No |
| createdAt | DateTime | - | Yes | - | No |
| triggeredAt | DateTime | - | No | - | No |
| metadata | String | 1000 | No | - | No |

**Enum Values:**
- **type:** "cpu", "memory", "disk", "service"

**Indexes:**
| Key | Type | Attributes |
|-----|------|------------|
| userId | Key | userId |
| type | Key | type |
| enabled | Key | enabled |

**Permissions:**
- Role: Any - Read
- Role: Any - Create
- Role: Any - Update
- Role: Any - Delete

---

### Step 5: Configure Environment Variables

Create a `.env.local` file in the dashboard root directory:

```bash
cd /home/ubuntu/ai/dashboard
nano .env.local
```

Add the following variables (replace with your actual IDs):

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=http://localhost:8090/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=firefetch-dashboard
NEXT_PUBLIC_APPWRITE_DATABASE_ID=dashboard

# Collection IDs
NEXT_PUBLIC_APPWRITE_COLLECTION_SETTINGS=settings
NEXT_PUBLIC_APPWRITE_COLLECTION_METRICS=metrics_history
NEXT_PUBLIC_APPWRITE_COLLECTION_INCIDENTS=incidents
NEXT_PUBLIC_APPWRITE_COLLECTION_ALERTS=alerts
```

**Note:** If using the external URL, use `https://backend.firefetch.org/v1` for the endpoint.

### Step 6: Update Configuration File

Open `/home/ubuntu/ai/dashboard/src/lib/appwrite.ts` and update the configuration:

```typescript
export const APPWRITE_CONFIG = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'http://localhost:8090/v1',
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'YOUR_PROJECT_ID',
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'YOUR_DATABASE_ID',
  collections: {
    settings: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_SETTINGS || 'YOUR_SETTINGS_ID',
    metricsHistory: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_METRICS || 'YOUR_METRICS_ID',
    incidents: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_INCIDENTS || 'YOUR_INCIDENTS_ID',
    alerts: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ALERTS || 'YOUR_ALERTS_ID',
  },
};
```

Replace `YOUR_*_ID` placeholders with the actual IDs from Appwrite.

### Step 7: Restart the Dashboard

```bash
cd /home/ubuntu/ai/dashboard

# If running in development:
npm run dev

# If running in production (Docker):
docker compose restart
```

### Step 8: Verify Integration

1. Open the dashboard in your browser
2. Open browser console (F12)
3. Look for log messages:
   - "Loaded settings from Appwrite" - Success!
   - "Loading settings from localStorage (Appwrite unavailable)" - Appwrite not accessible
4. Change a setting in the dashboard
5. Check Appwrite Console > Databases > dashboard > settings
6. You should see a document with your settings

## How It Works

### Graceful Degradation

The dashboard uses a **tiered storage approach**:

1. **Primary:** Appwrite (persistent, cross-device)
2. **Fallback:** localStorage (local, per-browser)

If Appwrite is unavailable, the dashboard automatically falls back to localStorage without any user-facing errors.

### Settings Flow

**On Load:**
1. Try to load settings from Appwrite
2. If successful, use Appwrite settings and sync to localStorage
3. If Appwrite unavailable, use localStorage settings
4. If nothing exists, use DEFAULT_SETTINGS

**On Save:**
1. Immediately save to localStorage (synchronous)
2. Attempt to save to Appwrite (asynchronous)
3. If Appwrite save fails, log error but continue (localStorage already saved)

### Anonymous Sessions

The dashboard uses Appwrite's anonymous sessions, meaning:
- No user authentication required
- Settings are stored per-device
- When real authentication is added, this can be upgraded seamlessly

## API Reference

### Settings API

```typescript
import { saveSettings, getSettings } from '@/lib/appwrite-service';

// Save settings
const success = await saveSettings(settings);

// Load settings
const settings = await getSettings(); // Returns null if not found
```

### Metrics History API

```typescript
import { saveMetricsSnapshot, getMetricsHistory } from '@/lib/appwrite-service';

// Save a metrics snapshot
await saveMetricsSnapshot({
  cpu: 45,
  memoryUsed: 8500000000,
  memoryTotal: 16000000000,
  diskUsed: 45000000000,
  diskTotal: 200000000000,
  networkUp: 2100000,
  networkDown: 540000,
});

// Get metrics history
const metrics = await getMetricsHistory('day'); // 'hour' | 'day' | 'week' | 'month'
```

### Incidents API

```typescript
import { createIncident, resolveIncident, getIncidents } from '@/lib/appwrite-service';

// Create an incident
await createIncident({
  serviceId: 'appwrite',
  serviceName: 'Appwrite Backend',
  startTime: new Date().toISOString(),
  status: 'ongoing',
  severity: 'critical',
  description: 'Database connection failed',
});

// Resolve an incident
await resolveIncident(incidentId);

// Get incidents
const incidents = await getIncidents('ongoing'); // 'ongoing' | 'resolved' | undefined (all)
```

### Alerts API

```typescript
import { saveAlert, updateAlert, getAlerts, deleteAlert } from '@/lib/appwrite-service';

// Create an alert
await saveAlert({
  type: 'cpu',
  threshold: 80,
  enabled: true,
  metadata: JSON.stringify({ notifyEmail: 'admin@example.com' }),
});

// Update an alert
await updateAlert(alertId, { enabled: false });

// Get alerts
const alerts = await getAlerts(true); // true (enabled only) | false | undefined (all)

// Delete an alert
await deleteAlert(alertId);
```

## Troubleshooting

### Settings not persisting

**Check:**
1. Appwrite is running: `curl http://localhost:8090/v1/health`
2. Project ID is correct in `.env.local`
3. Database and collections exist in Appwrite Console
4. Browser console for errors

### "Failed to create anonymous session"

**Fix:**
1. Go to Appwrite Console > Settings > Authentication
2. Enable "Anonymous" authentication method
3. Save and retry

### CORS errors

**Fix:**
1. Go to Appwrite Console > Settings > Platforms
2. Add a web platform
3. Add hostname: `http://localhost:3002` (or your dashboard URL)
4. Save and retry

### Collection permission errors

**Fix:**
1. Go to each collection in Appwrite Console
2. Click "Settings" tab
3. Under "Permissions", ensure:
   - Role: Any - Read, Create, Update, Delete
4. Save

### Cannot connect to Appwrite

**Check:**
1. Appwrite containers running: `docker ps | grep appwrite`
2. Appwrite accessible: `curl http://localhost:8090/v1/health`
3. Endpoint in `.env.local` is correct
4. Firewall not blocking port 8090

## Future Enhancements

### User Authentication

Replace anonymous sessions with real user authentication:

```typescript
import { account } from '@/lib/appwrite';

// Sign up
await account.create('unique()', 'email@example.com', 'password', 'Name');

// Login
await account.createEmailPasswordSession('email@example.com', 'password');

// Get current user
const user = await account.get();
```

### Real-time Updates

Subscribe to settings changes across devices:

```typescript
import { appwriteClient } from '@/lib/appwrite';

appwriteClient.subscribe('databases.*.collections.settings.documents', (response) => {
  console.log('Settings updated:', response.payload);
  // Update UI
});
```

### Metrics Collection Automation

Create a background job to periodically save metrics:

```typescript
// In a useEffect or API route
setInterval(async () => {
  const metrics = await fetch('/api/metrics').then(r => r.json());
  await saveMetricsSnapshot(metrics);
}, 60000); // Every minute
```

## Security Notes

- Never commit `.env.local` to git (already in .gitignore)
- Collection permissions currently set to "Any" for simplicity
- For production, implement proper user authentication
- Restrict permissions to authenticated users only
- Use API keys for server-side operations only

## Support

- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Discord](https://appwrite.io/discord)
- Dashboard CLAUDE.md: `/home/ubuntu/ai/dashboard/CLAUDE.md`
- Backend CLAUDE.md: `/home/ubuntu/ai/backend/CLAUDE.md`
