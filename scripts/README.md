# Dashboard Setup Scripts

This directory contains utility scripts for setting up and managing the FireFetch Dashboard.

## Available Scripts

### setup-appwrite.js

Automated Appwrite database and collection setup for the FireFetch Dashboard.

**What it does:**
- Connects to your Appwrite instance
- Checks if the project exists (guides you to create if needed)
- Creates the "dashboard" database
- Creates all 4 required collections with proper schema:
  - `settings` - User dashboard settings
  - `metrics_history` - Historical system metrics
  - `incidents` - Service incident tracking
  - `alerts` - Alert configurations
- Sets up attributes with correct types and constraints
- Creates indexes for optimal query performance
- Configures permissions (Role.any() for all CRUD operations)
- Updates `.env.local` with all configuration

**Usage:**

```bash
# Run with npm script (recommended)
npm run setup:appwrite

# Or run directly with node
node scripts/setup-appwrite.js
```

**Prerequisites:**

1. Appwrite running at http://localhost:8090 (or configured endpoint)
2. Node.js and npm installed
3. Dependencies installed (`npm install`)

**Interactive Setup:**

The script will:
1. Load existing configuration from `.env.local`
2. Prompt for Project ID if not found
3. Connect to Appwrite and verify access
4. Create database and collections automatically
5. Show progress for each step
6. Save all configuration to `.env.local`

**Example Output:**

```
╔════════════════════════════════════════════════╗
║   FireFetch Dashboard - Appwrite Setup         ║
╚════════════════════════════════════════════════╝

ℹ Appwrite Endpoint: http://localhost:8090/v1
✓ Using project ID: firefetch-dashboard

▶ Connecting to Appwrite...
✓ Connected to Appwrite successfully

▶ Checking database "dashboard"...
✓ Created database "dashboard"

▶ Setting up collections...

ℹ Processing collection: settings
  Creating collection...
✓ Created collection "settings"
  Adding attribute: userId
  Adding attribute: settings
  Adding attribute: updatedAt
  Waiting for attributes to be ready...
  Creating index: userId
✓ Configured collection "settings"

[... continues for all collections ...]

╔════════════════════════════════════════════════╗
║   Setup Complete!                              ║
╚════════════════════════════════════════════════╝

✓ Appwrite setup completed successfully

ℹ Configuration saved to .env.local:
  NEXT_PUBLIC_APPWRITE_ENDPOINT=http://localhost:8090/v1
  NEXT_PUBLIC_APPWRITE_PROJECT_ID=firefetch-dashboard
  NEXT_PUBLIC_APPWRITE_DATABASE_ID=dashboard
  NEXT_PUBLIC_APPWRITE_COLLECTION_SETTINGS=settings
  NEXT_PUBLIC_APPWRITE_COLLECTION_METRICS_HISTORY=metrics_history
  NEXT_PUBLIC_APPWRITE_COLLECTION_INCIDENTS=incidents
  NEXT_PUBLIC_APPWRITE_COLLECTION_ALERTS=alerts

ℹ Next steps:
  1. Verify collections in Appwrite Console
  2. Enable Anonymous authentication in project settings
  3. Add web platform with hostname: http://localhost:3002
  4. Restart your dashboard: npm run dev
```

**Manual Steps Required:**

After running the script, you must manually configure in Appwrite Console:

1. **Enable Anonymous Authentication:**
   - Go to Project Settings > Authentication
   - Enable "Anonymous" method
   - Save

2. **Add Web Platform:**
   - Go to Project Settings > Platforms
   - Click "Add Platform" > "Web"
   - Add hostname: `http://localhost:3002`
   - Add production hostname: `https://dashboard.firefetch.org`
   - Save

**Troubleshooting:**

**Error: "Failed to connect to Appwrite"**
- Verify Appwrite is running: `curl http://localhost:8090/v1/health`
- Check if the endpoint is correct
- Ensure Project ID exists

**Error: "Project with the requested ID could not be found"**
- Create project manually in Appwrite Console
- Use the exact Project ID from the console
- Run script again

**Collections not created:**
- Check Appwrite logs: `docker logs appwrite -f`
- Verify you have permissions to create collections
- Try creating one collection manually to test

**Script hangs on attribute creation:**
- Appwrite needs time to process attributes
- Wait for completion (usually 2-3 seconds per attribute)
- If stuck, check Appwrite logs

## Collection Schema Reference

### settings
| Attribute | Type | Size | Required | Index |
|-----------|------|------|----------|-------|
| userId | String | 255 | Yes | Unique |
| settings | String | 10000 | Yes | - |
| updatedAt | DateTime | - | Yes | - |

### metrics_history
| Attribute | Type | Required | Index |
|-----------|------|----------|-------|
| timestamp | DateTime | Yes | Key |
| cpu | Integer | Yes | - |
| memoryUsed | Integer | Yes | - |
| memoryTotal | Integer | Yes | - |
| diskUsed | Integer | Yes | - |
| diskTotal | Integer | Yes | - |
| networkUp | Integer | Yes | - |
| networkDown | Integer | Yes | - |

### incidents
| Attribute | Type | Size | Required | Index |
|-----------|------|------|----------|-------|
| serviceId | String | 255 | Yes | Key |
| serviceName | String | 255 | Yes | - |
| startTime | DateTime | - | Yes | Key |
| endTime | DateTime | - | No | - |
| status | String | 50 | Yes | Key |
| severity | String | 50 | Yes | - |
| description | String | 1000 | No | - |

### alerts
| Attribute | Type | Size | Required | Index |
|-----------|------|------|----------|-------|
| userId | String | 255 | Yes | Key |
| type | String | 50 | Yes | Key |
| threshold | Integer | - | Yes | - |
| enabled | Boolean | - | Yes | Key |
| createdAt | DateTime | - | Yes | - |
| triggeredAt | DateTime | - | No | - |
| metadata | String | 1000 | No | - |

## Environment Variables

The script will update `.env.local` with:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=http://localhost:8090/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=firefetch-dashboard
NEXT_PUBLIC_APPWRITE_DATABASE_ID=dashboard
NEXT_PUBLIC_APPWRITE_COLLECTION_SETTINGS=settings
NEXT_PUBLIC_APPWRITE_COLLECTION_METRICS_HISTORY=metrics_history
NEXT_PUBLIC_APPWRITE_COLLECTION_INCIDENTS=incidents
NEXT_PUBLIC_APPWRITE_COLLECTION_ALERTS=alerts
```

## Additional Information

For more details on Appwrite integration, see:
- `/home/ubuntu/ai/dashboard/APPWRITE_SETUP.md` - Complete setup guide
- `/home/ubuntu/ai/dashboard/CLAUDE.md` - Dashboard documentation
- `/home/ubuntu/ai/backend/CLAUDE.md` - Appwrite backend documentation
