# Uptime Kuma Setup Guide for FireFetch Dashboard

This guide explains how to configure Uptime Kuma monitors for all FireFetch services and integrate them with the dashboard.

## Table of Contents

- [Automated Setup (Recommended)](#automated-setup-recommended)
- [Manual Setup](#manual-setup)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Automated Setup (Recommended)

The automated setup script will:
- Create HTTP monitors for all active services in `/home/ubuntu/ai/infrastructure/services.json`
- Configure a public status page with slug `firefetch`
- Add all monitors to the status page
- Configure proper monitoring intervals and retry policies

### Prerequisites

1. **Uptime Kuma is running** at http://localhost:3001 (or https://status.firefetch.org)
2. **You have admin credentials** (username and password)
3. **Node.js and npm** are installed

### Step 1: Install Dependencies

```bash
cd /home/ubuntu/ai/dashboard
npm install
```

This will install `socket.io-client` needed for the setup script.

### Step 2: Set Environment Variables

Create a `.env.local` file or export environment variables:

```bash
# Option 1: Create .env.local file
cat > .env.local << 'EOF'
UPTIME_KUMA_URL=http://localhost:3001
UPTIME_KUMA_USERNAME=admin
UPTIME_KUMA_PASSWORD=your_password_here
EOF

# Option 2: Export environment variables (temporary)
export UPTIME_KUMA_URL=http://localhost:3001
export UPTIME_KUMA_USERNAME=admin
export UPTIME_KUMA_PASSWORD=your_password_here
```

**Alternative: Using a Token**

If you already have a JWT token from Uptime Kuma:

```bash
export UPTIME_KUMA_TOKEN=your_jwt_token_here
```

### Step 3: Run the Setup Script

```bash
npm run setup:uptime-kuma
```

Or directly:

```bash
node scripts/setup-uptime-kuma.js
```

### Step 4: Verify Setup

The script will output:
- Connection status
- Authentication success
- Monitor creation/update results
- Status page configuration
- Public URLs

Example output:
```
============================================================
  Uptime Kuma Setup for FireFetch Dashboard
============================================================
✓ Loaded 5 active service(s) from services.json
  ℹ   - research: https://research.firefetch.org
  ℹ   - uptime-kuma: https://status.firefetch.org
  ℹ   - appwrite: https://backend.firefetch.org
  ℹ   - dashboard: https://dashboard.firefetch.org
  ℹ   - beszel: https://beszel.firefetch.org

Connecting to Uptime Kuma...
✓ Connected to Uptime Kuma

Authenticating...
✓ Authentication successful

Fetching existing monitors...
ℹ Found 0 existing monitor(s)

Configuring monitors...
✓ Created monitor: research (ID: 1)
✓ Created monitor: uptime-kuma (ID: 2)
✓ Created monitor: appwrite (ID: 3)
✓ Created monitor: dashboard (ID: 4)
✓ Created monitor: beszel (ID: 5)

Configuring status page...
✓ Status page configured: firefetch
ℹ Public URL: http://localhost:3001/status/firefetch
ℹ API Endpoint: http://localhost:3001/api/status-page/firefetch

============================================================
  Setup Complete!
============================================================
✓ Created 5 new monitor(s)

Next Steps:
ℹ 1. Visit Uptime Kuma dashboard to verify monitors are running
   http://localhost:3001
ℹ 2. Check the public status page:
   http://localhost:3001/status/firefetch
ℹ 3. Update your dashboard to use the status page API:
   http://localhost:3001/api/status-page/firefetch
ℹ 4. The dashboard will auto-refresh uptime data every 60 seconds
```

---

## Manual Setup

If you prefer to configure monitors manually or if the automated setup doesn't work:

### Step 1: Login to Uptime Kuma

1. Open your browser and navigate to http://localhost:3001 (or https://status.firefetch.org)
2. Login with your admin credentials

### Step 2: Create Monitors

For each service in `/home/ubuntu/ai/infrastructure/services.json`, create a monitor:

#### Service: Research
1. Click **"Add New Monitor"**
2. Configure:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** research
   - **URL:** https://research.firefetch.org
   - **Heartbeat Interval:** 60 seconds
   - **Retries:** 3
   - **Heartbeat Retry Interval:** 60 seconds
   - **Accepted Status Codes:** 200-299
3. Click **"Save"**

#### Service: Uptime Kuma
1. Click **"Add New Monitor"**
2. Configure:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** uptime-kuma
   - **URL:** https://status.firefetch.org
   - **Heartbeat Interval:** 60 seconds
   - **Retries:** 3
   - **Heartbeat Retry Interval:** 60 seconds
   - **Accepted Status Codes:** 200-299
3. Click **"Save"**

#### Service: Appwrite
1. Click **"Add New Monitor"**
2. Configure:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** appwrite
   - **URL:** https://backend.firefetch.org
   - **Heartbeat Interval:** 60 seconds
   - **Retries:** 3
   - **Heartbeat Retry Interval:** 60 seconds
   - **Accepted Status Codes:** 200-299
3. Click **"Save"**

#### Service: Dashboard
1. Click **"Add New Monitor"**
2. Configure:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** dashboard
   - **URL:** https://dashboard.firefetch.org
   - **Heartbeat Interval:** 60 seconds
   - **Retries:** 3
   - **Heartbeat Retry Interval:** 60 seconds
   - **Accepted Status Codes:** 200-299
3. Click **"Save"**

#### Service: Beszel
1. Click **"Add New Monitor"**
2. Configure:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** beszel
   - **URL:** https://beszel.firefetch.org
   - **Heartbeat Interval:** 60 seconds
   - **Retries:** 3
   - **Heartbeat Retry Interval:** 60 seconds
   - **Accepted Status Codes:** 200-299
3. Click **"Save"**

### Step 3: Create Status Page

1. Click **"Status Pages"** in the left sidebar
2. Click **"Add New Status Page"**
3. Configure:
   - **Title:** FireFetch Services Status
   - **Slug:** firefetch
   - **Description:** Real-time status of all FireFetch infrastructure services
   - **Theme:** Auto (or your preference)
   - **Published:** ✓ Enable (make it public)

4. In the **"Add Group"** section:
   - Click **"Add Group"**
   - **Group Name:** FireFetch Services
   - Click **"Add Monitor to Group"**
   - Select all monitors: research, uptime-kuma, appwrite, dashboard, beszel
   - Click **"Save"**

5. Click **"Save Status Page"**

### Step 4: Verify Status Page

1. Visit the public status page: http://localhost:3001/status/firefetch
2. Verify all 5 services are listed and showing status
3. Check the API endpoint: http://localhost:3001/api/status-page/firefetch
   - Should return JSON with monitor data

---

## Verification

After setup (automated or manual), verify everything is working:

### 1. Check Uptime Kuma Dashboard

Visit http://localhost:3001 and verify:
- All 5 monitors are listed
- All monitors show "Up" status (green checkmark)
- Heartbeats are being recorded

### 2. Check Status Page

Visit http://localhost:3001/status/firefetch and verify:
- Page loads successfully
- All 5 services are displayed
- Status indicators are accurate
- Uptime percentages are shown

### 3. Check API Endpoint

Test the API endpoint:

```bash
curl -s http://localhost:3001/api/status-page/firefetch | jq
```

Expected response structure:
```json
{
  "config": {
    "slug": "firefetch",
    "title": "FireFetch Services Status",
    "publicGroupList": [
      {
        "name": "FireFetch Services",
        "monitorList": [...]
      }
    ]
  },
  "heartbeatList": {
    "1": [...],
    "2": [...],
    ...
  },
  "uptimeList": {
    "1": [...],
    "2": [...],
    ...
  }
}
```

### 4. Test Dashboard Integration

1. Start the dashboard:
   ```bash
   cd /home/ubuntu/ai/dashboard
   npm run dev
   ```

2. Open http://localhost:3000 in your browser

3. Check the Uptime Status widget:
   - Should show all 5 services
   - Should display uptime percentages
   - Should show current status (online/offline)
   - Should show response times

4. Open browser console (F12) and check for any errors related to Uptime Kuma

---

## Troubleshooting

### Script Fails to Connect

**Error:** `Connection failed: connect ECONNREFUSED`

**Solution:**
1. Verify Uptime Kuma is running:
   ```bash
   curl http://localhost:3001
   ```
2. Check the URL in environment variables
3. If using Docker, verify the container is running:
   ```bash
   docker ps | grep uptime-kuma
   ```

### Authentication Failed

**Error:** `Authentication failed: Incorrect username or password`

**Solution:**
1. Verify credentials are correct
2. Login manually to http://localhost:3001 to confirm credentials
3. Check environment variables are set correctly:
   ```bash
   echo $UPTIME_KUMA_USERNAME
   echo $UPTIME_KUMA_PASSWORD
   ```

### Monitors Not Showing in Dashboard

**Solution:**
1. Check the status page exists:
   ```bash
   curl http://localhost:3001/api/status-page/firefetch
   ```
2. If 404 error, the status page wasn't created - run setup script again
3. Check browser console for errors
4. Verify the slug in `/home/ubuntu/ai/dashboard/src/lib/uptime-kuma.ts` matches "firefetch"

### Status Page Returns 404

**Solution:**
1. The status page wasn't created or isn't published
2. Run the setup script again
3. Or manually create the status page (see Manual Setup section)
4. Verify the slug is exactly "firefetch" (case-sensitive)

### CORS Errors in Browser

**Solution:**
1. This shouldn't happen with server-side fetching in Next.js
2. If you see CORS errors, ensure you're using the API routes (`/api/uptime`)
3. Don't fetch directly from the browser - use the Next.js API route

### Socket.IO Version Mismatch

**Error:** Socket.IO compatibility issues

**Solution:**
1. Check installed version:
   ```bash
   npm list socket.io-client
   ```
2. Uptime Kuma uses Socket.IO v4, ensure you have 4.x installed
3. Reinstall if needed:
   ```bash
   npm install socket.io-client@^4.8.1 --save-dev
   ```

### Re-running the Setup Script

The setup script is **idempotent** - it's safe to run multiple times:
- Existing monitors will be **updated** (not duplicated)
- Status page will be **updated** with current configuration
- No data will be lost

To re-run:
```bash
npm run setup:uptime-kuma
```

---

## Advanced Configuration

### Custom Monitor Settings

Edit the `monitorDefaults` object in `/home/ubuntu/ai/dashboard/scripts/setup-uptime-kuma.js`:

```javascript
const monitorDefaults = {
  interval: 60,              // Check every 60 seconds
  retryInterval: 60,         // Retry after 60 seconds
  maxretries: 3,             // Maximum retry attempts
  accepted_statuscodes: ['200-299'],  // Accept 2xx codes
  // Add more settings as needed
};
```

### Using a Different Status Page Slug

1. Edit `/home/ubuntu/ai/dashboard/scripts/setup-uptime-kuma.js`:
   ```javascript
   statusPageSlug: 'your-custom-slug',
   ```

2. Edit `/home/ubuntu/ai/dashboard/src/lib/uptime-kuma.ts`:
   ```typescript
   const statusPageSlug = 'your-custom-slug';
   ```

3. Re-run the setup script

### Adding Notifications

Notifications must be configured in Uptime Kuma UI:
1. Go to Settings → Notifications
2. Add your notification providers (email, Slack, Discord, etc.)
3. Edit each monitor and select notification providers

### Monitoring Additional Services

1. Add the service to `/home/ubuntu/ai/infrastructure/services.json`
2. Re-run the setup script:
   ```bash
   npm run setup:uptime-kuma
   ```
3. The new service will be automatically added

---

## API Reference

### Status Page API Endpoint

**GET** `/api/status-page/:slug`

**Example:** http://localhost:3001/api/status-page/firefetch

**Response:**
- `config` - Status page configuration and monitor list
- `heartbeatList` - Recent heartbeats for each monitor (last 100)
- `uptimeList` - Uptime percentages for each monitor (24h, 30d, 90d, etc.)

**No authentication required** - This is a public endpoint

### Dashboard API Endpoint

**GET** `/api/uptime`

**Example:** http://localhost:3000/api/uptime

**Response:**
```json
{
  "monitors": [
    {
      "id": 1,
      "name": "research",
      "url": "https://research.firefetch.org",
      "status": "online",
      "uptime": 99.9,
      "responseTime": 124,
      "lastChecked": "2025-12-07T21:30:00Z"
    }
  ],
  "stats": {
    "totalMonitors": 5,
    "onlineMonitors": 5,
    "offlineMonitors": 0,
    "averageUptime": 99.8
  }
}
```

---

## Security Notes

1. **Never commit credentials** to git
   - Add `.env.local` to `.gitignore`
   - Use environment variables

2. **Use API tokens** when possible
   - Generate a token in Uptime Kuma settings
   - Use `UPTIME_KUMA_TOKEN` instead of username/password

3. **Protect the status page** if needed
   - You can make the status page private in Uptime Kuma settings
   - Use Socket.IO authentication for private data access

4. **HTTPS in production**
   - Always use HTTPS URLs (https://status.firefetch.org)
   - Cloudflare Tunnel handles SSL for you

---

## Additional Resources

- **Uptime Kuma Documentation:** https://github.com/louislam/uptime-kuma/wiki
- **API Documentation:** https://github.com/louislam/uptime-kuma/wiki/API-Documentation
- **Socket.IO Documentation:** https://socket.io/docs/v4/
- **Python API Wrapper:** https://github.com/lucasheld/uptime-kuma-api

---

## Support

If you encounter issues:

1. Check this troubleshooting guide first
2. Review Uptime Kuma logs:
   ```bash
   docker logs uptime-kuma
   # or
   sudo journalctl -u uptime-kuma.service -f
   ```
3. Check dashboard logs:
   ```bash
   npm run dev
   # Check browser console
   ```
4. Consult the Uptime Kuma GitHub issues: https://github.com/louislam/uptime-kuma/issues

---

**Setup complete! Your FireFetch Dashboard is now integrated with Uptime Kuma monitoring.**
