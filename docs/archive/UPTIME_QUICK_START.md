# Uptime Kuma Integration - Quick Start

## Status: Infrastructure Ready ✅

All code files have been created and integrated. To get real uptime data displayed, follow these 4 simple steps:

## Step 1: Add Monitors (3 minutes)

1. Open https://status.firefetch.org in your browser
2. Click "Add New Monitor"
3. For each service, configure:
   - **Type:** HTTP(s)
   - **Name:** Service name (e.g., "Research Server")
   - **URL:** Full URL (e.g., "https://research.firefetch.org")
   - **Heartbeat Interval:** 60 seconds
   - **Retries:** 3
4. Recommended services to monitor:
   - Research: https://research.firefetch.org
   - Dashboard: https://dashboard.firefetch.org
   - Uptime Kuma: https://status.firefetch.org
   - Backend: https://backend.firefetch.org (if applicable)

## Step 2: Create Status Page (2 minutes)

1. In Uptime Kuma, go to **Status Pages**
2. Click **New Status Page**
3. Configure:
   - **Slug:** `firefetch`
   - **Title:** FireFetch Services
   - **Public:** Yes (checked)
4. Add all your monitors to the page
5. Save

## Step 3: Update Integration Code (2 minutes)

1. Open `/home/ubuntu/ai/dashboard/src/lib/uptime-kuma.ts`

2. Find the `getUptimeMonitors()` function (around line 48)

3. Replace the entire function with:

```typescript
export async function getUptimeMonitors(): Promise<UptimeMonitor[]> {
  try {
    const statusPageSlug = "firefetch"; // Your status page slug
    const response = await fetch(
      `${config.uptimeKuma.baseUrl}/api/status-page/${statusPageSlug}`,
      {
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      console.warn(`Status page not found: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const monitors: UptimeMonitor[] = [];

    if (data.publicGroupList) {
      data.publicGroupList.forEach((group: any) => {
        group.monitorList.forEach((monitor: any) => {
          monitors.push({
            id: monitor.id,
            name: monitor.name,
            url: monitor.url || "",
            type: monitor.type || "http",
            active: monitor.active !== false,
            uptime24h: monitor.uptime || 0,
            uptime30d: monitor["uptime-30"] || 0,
            avgPing: monitor.avgPing || 0,
            lastHeartbeat: monitor.lastHeartbeat,
          });
        });
      });
    }

    return monitors;
  } catch (error) {
    console.error("Failed to fetch status page:", error);
    return [];
  }
}
```

4. Save the file

## Step 4: Rebuild Dashboard (3 minutes)

```bash
cd /home/ubuntu/ai/dashboard
docker compose down
docker compose up -d --build
```

Or if running locally:
```bash
npm run build
npm start
```

## Verify It Works

1. Open https://dashboard.firefetch.org (or http://localhost:3000)
2. The **Uptime Status** widget should now show:
   - Overall uptime percentage
   - Monitor status counts
   - Individual monitor cards with real data
3. Service cards should show real uptime percentages

## Test Endpoints

```bash
# Test Uptime Kuma status page
curl http://localhost:3001/api/status-page/firefetch | jq

# Test dashboard uptime API
curl http://localhost:3000/api/uptime | jq

# Test enhanced services API
curl http://localhost:3000/api/services | jq '.services[0]'
```

## What You Get

After completing these steps:

✅ **Real-time uptime monitoring** of all your services  
✅ **24-hour uptime percentages** for each service  
✅ **30-day uptime trends** (if available)  
✅ **Response time tracking** in milliseconds  
✅ **Last check timestamps** for each monitor  
✅ **Visual status indicators** (green/yellow/red)  
✅ **Auto-refresh** every 60 seconds  
✅ **Graceful fallback** if Uptime Kuma unavailable  

## Troubleshooting

### "No monitors configured" message
- This is expected before Step 2 is complete
- Create the status page and monitors first

### Widget shows error
```bash
# Check if Uptime Kuma is running
docker ps | grep uptime

# Check if accessible
curl http://localhost:3001

# View logs
docker logs uptime-kuma
```

### Services not showing uptime data
- Verify Step 3 code update was done correctly
- Check that service URLs in services.json match monitor URLs exactly
- Rebuild the dashboard (Step 4)

### Status page not accessible
```bash
# Test the endpoint
curl http://localhost:3001/api/status-page/firefetch

# Should return JSON with monitors
# If 404, check the slug name matches
```

## Need More Details?

See comprehensive documentation:
- `/home/ubuntu/ai/dashboard/UPTIME_KUMA_INTEGRATION.md` - Full integration guide
- `/home/ubuntu/ai/dashboard/INTEGRATION_SUMMARY.md` - Complete summary
- `/home/ubuntu/ai/dashboard/CLAUDE.md` - Dashboard instructions

## Total Time Required

⏱️ **~10 minutes** to go from infrastructure-ready to fully functional uptime monitoring!
