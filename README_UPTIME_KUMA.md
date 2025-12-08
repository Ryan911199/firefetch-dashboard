# Uptime Kuma Integration - Quick Start

This document provides a quick reference for setting up Uptime Kuma monitoring for the FireFetch Dashboard.

## What This Does

Automatically configures Uptime Kuma to monitor all FireFetch services:
- ✓ Creates HTTP monitors for all services
- ✓ Configures a public status page
- ✓ Integrates with the dashboard
- ✓ Provides real-time uptime data

## Quick Setup (3 Steps)

### 1. Install Dependencies
```bash
cd /home/ubuntu/ai/dashboard
npm install
```

### 2. Set Your Credentials
```bash
export UPTIME_KUMA_USERNAME=admin
export UPTIME_KUMA_PASSWORD=your_password_here
```

### 3. Run the Setup
```bash
npm run setup:uptime-kuma
```

That's it! The script will:
- Connect to Uptime Kuma (http://localhost:3001)
- Create monitors for all active services
- Configure a status page at `/status/firefetch`
- Display a success message with URLs

## What Gets Created

### Monitors
- **research** - https://research.firefetch.org
- **uptime-kuma** - https://status.firefetch.org
- **appwrite** - https://backend.firefetch.org
- **dashboard** - https://dashboard.firefetch.org
- **beszel** - https://beszel.firefetch.org

### Status Page
- **URL:** http://localhost:3001/status/firefetch
- **API:** http://localhost:3001/api/status-page/firefetch
- **Slug:** firefetch

## Verification

After running the setup:

1. **Check Uptime Kuma Dashboard:**
   ```
   http://localhost:3001
   ```
   All 5 monitors should be listed and showing "Up" status.

2. **Check Status Page:**
   ```
   http://localhost:3001/status/firefetch
   ```
   All services should be displayed with their status.

3. **Test API Endpoint:**
   ```bash
   curl http://localhost:3001/api/status-page/firefetch | jq
   ```
   Should return JSON with monitor data.

4. **Check Dashboard Integration:**
   - Start the dashboard: `npm run dev`
   - Open http://localhost:3000
   - Uptime widget should show all services

## Troubleshooting

### Connection Failed
```
✗ Connection failed: connect ECONNREFUSED
```
**Fix:** Make sure Uptime Kuma is running at http://localhost:3001

### Authentication Failed
```
✗ Authentication failed: Incorrect username or password
```
**Fix:** Check your username and password. Try logging in at http://localhost:3001 manually.

### Monitors Already Exist
The script is idempotent - it will update existing monitors instead of creating duplicates. Safe to run multiple times.

## Re-running the Setup

You can safely re-run the setup anytime:
```bash
npm run setup:uptime-kuma
```

This will update all monitors with the latest configuration from `services.json`.

## Files

- **Setup Script:** `/home/ubuntu/ai/dashboard/scripts/setup-uptime-kuma.js`
- **Full Guide:** `/home/ubuntu/ai/dashboard/UPTIME_KUMA_SETUP.md`
- **Integration Code:** `/home/ubuntu/ai/dashboard/src/lib/uptime-kuma.ts`

## Manual Setup

If you prefer to configure manually, see the full guide:
```bash
cat UPTIME_KUMA_SETUP.md
```

## Environment Variables

### Required
- `UPTIME_KUMA_USERNAME` - Admin username
- `UPTIME_KUMA_PASSWORD` - Admin password

### Optional
- `UPTIME_KUMA_URL` - Uptime Kuma URL (default: http://localhost:3001)
- `UPTIME_KUMA_TOKEN` - JWT token (alternative to username/password)

## Adding New Services

To monitor a new service:

1. Add it to `/home/ubuntu/ai/infrastructure/services.json`
2. Re-run the setup:
   ```bash
   npm run setup:uptime-kuma
   ```

The new service will be automatically added to Uptime Kuma.

## API Reference

### Status Page API
**Endpoint:** `GET /api/status-page/firefetch`

**Response:**
```json
{
  "config": {
    "publicGroupList": [
      {
        "name": "FireFetch Services",
        "monitorList": [...]
      }
    ]
  },
  "heartbeatList": { "1": [...], "2": [...] },
  "uptimeList": { "1": [...], "2": [...] }
}
```

### Dashboard API
**Endpoint:** `GET /api/uptime`

**Response:**
```json
{
  "monitors": [
    {
      "id": 1,
      "name": "research",
      "status": "online",
      "uptime": 99.9,
      "responseTime": 124
    }
  ]
}
```

## Support

For detailed troubleshooting and advanced configuration, see:
- **Full Setup Guide:** `UPTIME_KUMA_SETUP.md`
- **Uptime Kuma Docs:** https://github.com/louislam/uptime-kuma/wiki
- **Dashboard Config:** `CLAUDE.md`

---

**Need help?** Check the full guide in `UPTIME_KUMA_SETUP.md`
