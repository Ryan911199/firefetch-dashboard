# Uptime Kuma Integration Guide

## Current Status

The FireFetch Dashboard has been set up with the infrastructure for Uptime Kuma integration, but **full integration requires additional configuration** in Uptime Kuma itself.

## Files Created

### 1. Configuration
- `/home/ubuntu/ai/dashboard/src/lib/config.ts` - Configuration for Uptime Kuma API
- `/home/ubuntu/ai/dashboard/src/lib/uptime-kuma.ts` - Helper functions for Uptime Kuma API

### 2. API Routes
- `/home/ubuntu/ai/dashboard/src/app/api/uptime/route.ts` - API endpoint to fetch uptime data

### 3. Components
- `/home/ubuntu/ai/dashboard/src/components/widgets/uptime-status.tsx` - Widget displaying uptime statistics

### 4. Integration
- `/home/ubuntu/ai/dashboard/src/app/api/services/route.ts` - Updated to merge Uptime Kuma data with service status

## The Challenge: Uptime Kuma's API Architecture

Uptime Kuma primarily uses **Socket.IO** for real-time communication, not a traditional REST API. The API key you have (`uk1_-uKYI9ZavqZ0eg82NLTBogjk-qy1uvwwlkEZPFH8`) is designed for push monitoring, not pulling monitor data.

## Solution Options

### Option 1: Status Page API (Recommended)

This is the easiest approach and doesn't require Socket.IO.

#### Step 1: Create a Status Page in Uptime Kuma

1. Access Uptime Kuma at https://status.firefetch.org
2. Go to "Status Pages"
3. Click "New Status Page"
4. Configure:
   - **Slug**: `firefetch` (or any name you want)
   - **Title**: FireFetch Services
   - Add all monitors you want to track
   - Make it **Public** (or Private if you prefer)
5. Save

#### Step 2: Update the Integration Code

Once you have a status page slug (e.g., `firefetch`), update `/home/ubuntu/ai/dashboard/src/lib/uptime-kuma.ts`:

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
      throw new Error(`Status page not found: ${response.status}`);
    }

    const data = await response.json();

    // Transform status page data to our monitor format
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

### Option 2: Socket.IO Client (Advanced)

For real-time data and full API access, use Socket.IO:

#### Step 1: Install Socket.IO Client

```bash
cd /home/ubuntu/ai/dashboard
npm install socket.io-client
```

#### Step 2: Create Socket.IO Service

Create `/home/ubuntu/ai/dashboard/src/lib/uptime-kuma-socket.ts`:

```typescript
import { io, Socket } from "socket.io-client";
import { config } from "./config";

let socket: Socket | null = null;

export function connectToUptimeKuma() {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(config.uptimeKuma.baseUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("Connected to Uptime Kuma");

    // Login with credentials
    socket?.emit("login", {
      username: "admin", // Your Uptime Kuma username
      password: "your-password", // Your Uptime Kuma password
      token: "", // Or use token if you have one
    });
  });

  socket.on("monitorList", (data) => {
    console.log("Received monitor list:", data);
    // Store monitors in state or cache
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from Uptime Kuma");
  });

  return socket;
}

export async function getMonitorsViaSocket(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const socket = connectToUptimeKuma();

    socket.once("monitorList", (data) => {
      resolve(Object.values(data));
    });

    socket.emit("getMonitorList");

    // Timeout after 5 seconds
    setTimeout(() => {
      reject(new Error("Timeout waiting for monitor list"));
    }, 5000);
  });
}
```

### Option 3: Direct Database Access (Not Recommended)

Uptime Kuma stores data in an SQLite database at `/home/ubuntu/ai/uptime-kuma/data/kuma.db`. You could query it directly, but this is fragile and not recommended.

## Recommended Setup Steps

### 1. Configure Monitors in Uptime Kuma

First, ensure you have monitors set up in Uptime Kuma:

1. Access https://status.firefetch.org
2. Add monitors for all your services:
   - Research: https://research.firefetch.org
   - Dashboard: https://dashboard.firefetch.org (this dashboard)
   - Uptime Kuma: https://status.firefetch.org (monitoring itself)
   - Backend: https://backend.firefetch.org (if applicable)

3. For each monitor, configure:
   - **Monitor Type**: HTTP(s)
   - **URL**: The service URL
   - **Heartbeat Interval**: 60 seconds (recommended)
   - **Retries**: 3
   - **Retry Interval**: 60 seconds

### 2. Create a Status Page

1. In Uptime Kuma, go to "Status Pages"
2. Create a new status page with slug: `firefetch`
3. Add all your monitors to it
4. Make it **Public**
5. Note the slug for the next step

### 3. Update Configuration

Edit `/home/ubuntu/ai/dashboard/src/lib/config.ts`:

```typescript
export const config = {
  uptimeKuma: {
    apiKey: "uk1_-uKYI9ZavqZ0eg82NLTBogjk-qy1uvwwlkEZPFH8",
    baseUrl: "http://localhost:3001",
    publicUrl: "https://status.firefetch.org",
    statusPageSlug: "firefetch", // Add this line with your slug
  },
  // ... rest of config
} as const;
```

### 4. Implement Status Page Fetch

Update the `getUptimeMonitors()` function in `/home/ubuntu/ai/dashboard/src/lib/uptime-kuma.ts` with the status page API code from Option 1 above.

### 5. Test the Integration

```bash
cd /home/ubuntu/ai/dashboard
npm run dev
```

Visit http://localhost:3000 and check if the Uptime Status widget shows your monitors.

## API Endpoints Available

Uptime Kuma provides these public endpoints (no auth required for status pages):

| Endpoint | Description |
|----------|-------------|
| `/api/status-page/{slug}` | Get status page data including all monitors |
| `/api/badge/{monitorId}/status` | Get status badge for a monitor |
| `/api/badge/{monitorId}/uptime/{duration}` | Get uptime badge (24, 720, etc.) |
| `/api/badge/{monitorId}/ping/{duration}` | Get average ping badge |
| `/api/badge/{monitorId}/avg-response/{duration}` | Get average response time |

## Current Widget Features

The Uptime Status widget (`/src/components/widgets/uptime-status.tsx`) displays:

- Overall average uptime percentage across all monitors
- Total monitors count with status breakdown (online, degraded, offline)
- Individual monitor cards showing:
  - Monitor name and URL
  - Status indicator
  - 24-hour uptime percentage
  - Average response time
  - Last check time
  - 30-day uptime (if available)
  - Visual progress bar

## Fallback Behavior

The current implementation includes fallback behavior:

1. **Services API** (`/api/services`):
   - First tries to fetch data from Uptime Kuma
   - Falls back to direct HTTP HEAD requests if Uptime Kuma data unavailable
   - This ensures services always show status even without Uptime Kuma

2. **Uptime Widget**:
   - Shows "No monitors configured" if Uptime Kuma returns no data
   - Displays error message if API fails
   - Auto-refreshes every 60 seconds

## Environment Variables (Optional)

For production, you can use environment variables instead of hardcoding:

Create `/home/ubuntu/ai/dashboard/.env.local`:

```env
UPTIME_KUMA_URL=http://localhost:3001
UPTIME_KUMA_API_KEY=uk1_-uKYI9ZavqZ0eg82NLTBogjk-qy1uvwwlkEZPFH8
UPTIME_KUMA_STATUS_PAGE_SLUG=firefetch
```

Then update `/home/ubuntu/ai/dashboard/src/lib/config.ts`:

```typescript
export const config = {
  uptimeKuma: {
    apiKey: process.env.UPTIME_KUMA_API_KEY || "uk1_-uKYI9ZavqZ0eg82NLTBogjk-qy1uvwwlkEZPFH8",
    baseUrl: process.env.UPTIME_KUMA_URL || "http://localhost:3001",
    publicUrl: process.env.UPTIME_KUMA_PUBLIC_URL || "https://status.firefetch.org",
    statusPageSlug: process.env.UPTIME_KUMA_STATUS_PAGE_SLUG || "firefetch",
  },
  // ...
} as const;
```

## Testing

Once you've implemented Option 1 (Status Page API):

```bash
# Test the status page endpoint directly
curl http://localhost:3001/api/status-page/firefetch | jq

# Test through the dashboard API
curl http://localhost:3000/api/uptime | jq

# Test services API (should include Uptime Kuma data)
curl http://localhost:3000/api/services | jq
```

## Next Steps

1. **Immediate**: Set up monitors in Uptime Kuma for all your services
2. **Immediate**: Create a public status page with slug `firefetch`
3. **Quick**: Implement Option 1 (Status Page API) - simplest approach
4. **Later**: Consider Option 2 (Socket.IO) for real-time updates if needed
5. **Optional**: Set up notifications in Uptime Kuma for downtime alerts

## Troubleshooting

### Widget shows "No monitors configured"

- Check if Uptime Kuma is running: `docker ps | grep uptime`
- Verify you created a status page and it's public
- Check the status page URL: http://localhost:3001/api/status-page/YOUR_SLUG
- Review browser console for errors

### Services not showing Uptime Kuma data

- The services API will fall back to direct checks
- This is expected if Uptime Kuma integration isn't complete
- Check `/api/uptime` endpoint to see if data is available

### Connection errors

- Ensure Uptime Kuma container is running
- Check if port 3001 is accessible
- Verify network connectivity between containers
- Check Docker network settings

## Resources

- [Uptime Kuma Documentation](https://github.com/louislam/uptime-kuma)
- [Uptime Kuma Wiki](https://github.com/louislam/uptime-kuma/wiki)
- [Status Page API](https://github.com/louislam/uptime-kuma/wiki/Status-Page)
