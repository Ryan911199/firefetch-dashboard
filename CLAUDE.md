# FireFetch Dashboard

| Property | Value |
|----------|-------|
| **Path** | `/home/ubuntu/ai/dashboard/` |
| **URL** | https://dashboard.firefetch.org |
| **Port** | 3002 |
| **Status** | Active |
| **Tech** | Next.js 14, React, Tailwind CSS, SQLite, Socket.IO |

## Quick Commands

| Action | Command |
|--------|---------|
| Dev | `cd /home/ubuntu/ai/dashboard && npm run dev` |
| Build | `cd /home/ubuntu/ai/dashboard && npm run build` |
| Deploy | `docker compose up -d --build` |
| Logs | `docker logs firefetch-dashboard --tail 50` |
| Status | `docker ps \| grep dashboard` |

## Overview

Server monitoring and service management dashboard with real-time updates. Features:
- **Real-time metrics** via WebSocket with decoupled intervals:
  - UI updates: 2s (metrics), 5s (containers), 15s (services)
  - Database storage: 5s (metrics), 10s (containers), 30s (services)
- System metrics (CPU, RAM, disk, network, load average)
- **Enhanced uptime tracking** with multi-timeframe views (24h/7d/30d/90d)
  - Timeframe selector to switch between different periods
  - Visual uptime history bars showing last 90 checks
  - Color-coded status indicators (green/yellow/red)
  - Public status page at `/status` with incident tracking
- Docker container monitoring
- **Push notifications** via Pushover for critical alerts
- **Public status page** at `/status`
- **Incident management** with severity tracking
- **Historical data** stored in SQLite with automatic aggregation
- Data retention: 24h live → 7d hourly → 30d daily
- Dark mode UI

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Custom Server (server.ts)                 │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│  │ Metrics Collector│  │ SQLite Database │  │  WebSocket   ││
│  │ (5s/10s/30s)     │──│ (dashboard.db)  │──│  Server      ││
│  └─────────────────┘  └─────────────────┘  └──────────────┘│
│           │                    │                    │        │
│           │        ┌───────────┴───────────┐       │        │
│           │        │   Aggregation         │       │        │
│           │        │   Scheduler           │       │        │
│           │        │   (hourly/daily)      │       │        │
│           │        └───────────────────────┘       │        │
│           │                                         │        │
│           ▼                                         ▼        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Next.js Application                         ││
│  │  REST API + React Frontend + Socket.IO Client           ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
/home/ubuntu/ai/dashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main dashboard page
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global styles
│   │   └── api/                  # API routes
│   │       ├── services/         # Service status API
│   │       ├── metrics/          # System metrics API
│   │       └── containers/       # Docker containers API
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── card.tsx
│   │   │   ├── progress.tsx
│   │   │   └── status-dot.tsx
│   │   ├── widgets/              # Dashboard widgets
│   │   │   ├── system-metrics.tsx
│   │   │   ├── service-card.tsx
│   │   │   └── container-card.tsx
│   │   └── layout/               # Layout components
│   │       ├── sidebar.tsx
│   │       └── header.tsx
│   └── lib/
│       ├── database.ts           # SQLite database + uptime calculations
│       ├── metrics-collector.ts  # Decoupled metrics collection
│       ├── websocket-server.ts   # Socket.IO server
│       ├── aggregation-scheduler.ts # Data rollup jobs
│       ├── socket-client.ts      # Frontend WebSocket client
│       ├── pushover.ts           # Pushover notification service
│       ├── utils.ts              # Utility functions
│       └── types.ts              # TypeScript types
├── server.ts                     # Custom server with WebSocket
├── docker-compose.yml            # Docker deployment config
├── Dockerfile                    # Docker build config
├── tailwind.config.ts            # Tailwind configuration
├── package.json
└── CLAUDE.md                     # This file
```

## Development

### Run Locally
```bash
cd /home/ubuntu/ai/dashboard
npm install
npm run dev
```

Access at http://localhost:3000

### Build
```bash
npm run build
```

### Deploy with Docker
```bash
docker compose up -d --build
```

## API Routes

### GET /api/status
Returns comprehensive service uptime data for the public status page.

**Response:**
```json
{
  "status": "operational",
  "services": [
    {
      "service_id": "backend",
      "service_name": "appwrite",
      "current_status": "online",
      "uptime_24h": 99.00,
      "uptime_7d": 99.00,
      "uptime_30d": 99.00,
      "uptime_90d": 99.00,
      "avg_response_time": 165.57,
      "total_checks": 200,
      "last_checked": 1765359061393
    }
  ],
  "activeIncidents": [],
  "recentIncidents": [],
  "summary": {
    "total": 7,
    "online": 7,
    "degraded": 0,
    "offline": 0,
    "avgUptime24h": 98.5
  },
  "lastUpdated": 1765359061400
}
```

**Query Parameters:**
- `service`: Service ID (optional) - Returns history for specific service
- `hours`: Number of hours of history (default: 24)

### GET /api/services
Returns all services with their current status.

**Response:**
```json
{
  "services": [
    {
      "id": "research",
      "name": "research",
      "url": "https://research.firefetch.org",
      "status": "online",
      "responseTime": 124,
      "uptime": 99.9
    }
  ]
}
```

### GET /api/metrics
Returns current system metrics.

**Response:**
```json
{
  "cpu": 34,
  "memory": { "used": 8500000000, "total": 16000000000, "percent": 53 },
  "disk": { "used": 45000000000, "total": 200000000000, "percent": 22 },
  "network": { "up": 2100000, "down": 540000 },
  "uptime": 86400
}
```

### GET /api/containers
Returns Docker container information.

**Response:**
```json
{
  "containers": [
    {
      "id": "abc123",
      "name": "appwrite",
      "image": "appwrite/appwrite:1.8.0",
      "status": "running",
      "cpu": 2.1,
      "memory": { "used": 458000000, "limit": 1073741824 }
    }
  ]
}
```

## Adding New Features

### Adding a New Widget
1. Create component in `src/components/widgets/`
2. Import in the page that needs it
3. Add to the grid layout

### Adding a New Page
1. Create directory in `src/app/` (e.g., `src/app/settings/`)
2. Add `page.tsx` file
3. Update sidebar navigation in `src/components/layout/sidebar.tsx`

### Adding a New Service
Services are automatically pulled from `/home/ubuntu/ai/infrastructure/services.json`. When a new service is added there, it will appear in the dashboard on the next refresh.

## Design System

### Colors
```
Background:     #0a0a0b
Surface:        #18181b
Border:         #27272a
Primary:        #3b82f6 (blue)
Success:        #22c55e (green)
Warning:        #f59e0b (amber)
Error:          #ef4444 (red)
Text Primary:   #fafafa
Text Secondary: #a1a1aa
```

### Typography
- **Font:** Inter (sans-serif)
- **Mono:** JetBrains Mono

## Integration Points

### Services.json
The dashboard reads from `/home/ubuntu/ai/infrastructure/services.json` to get the list of services and their configurations.

### Docker Socket
The dashboard connects to the Docker socket at `/var/run/docker.sock` to get container statistics.

### Appwrite Backend
**Status:** Integrated with graceful degradation

The dashboard integrates with Appwrite for persistent storage:
- **Settings:** User preferences, quick links, notification settings
- **Metrics History:** Historical system metrics for graphs
- **Incidents:** Service downtime and incident tracking
- **Alerts:** Alert configurations and history

**Configuration:**
- Endpoint: http://localhost:8090/v1 (or https://backend.firefetch.org/v1)
- Project: FireFetch Dashboard
- Database: dashboard
- Collections: settings, metrics_history, incidents, alerts

**Files:**
- `/src/lib/appwrite.ts` - Appwrite client configuration
- `/src/lib/appwrite-service.ts` - Service layer with CRUD operations
- `/src/contexts/settings-context.tsx` - Settings management with Appwrite sync
- `/.env.local` - Environment configuration (not committed)
- `/APPWRITE_SETUP.md` - Complete setup guide

**How it works:**
1. Settings load from Appwrite first, fallback to localStorage
2. Settings save to both Appwrite and localStorage
3. If Appwrite unavailable, continues with localStorage only
4. No user-facing errors on Appwrite failure

**Setup:** See `/home/ubuntu/ai/dashboard/APPWRITE_SETUP.md` for detailed setup instructions.

### Pushover Notifications
**Status:** Active

Push notifications via Pushover for critical alerts:
- Service status changes (offline/online/degraded)
- Resource alerts (high CPU, memory, disk >90%)
- Incident notifications

**Configuration:**
- User Key: Set via `PUSHOVER_USER_KEY` environment variable
- App Key: Set via `PUSHOVER_APP_KEY` environment variable

**Files:**
- `/src/lib/pushover.ts` - Pushover notification service
- `/src/app/api/notifications/test/route.ts` - Test endpoint

**API Endpoints:**
- `GET /api/notifications/test` - Check if Pushover is configured
- `POST /api/notifications/test` - Send test notification

**Notification Types:**
- Service offline: High priority with siren sound
- Service recovered: Normal priority
- Service degraded: Normal priority
- High CPU/Memory (>90%): High priority
- Low Disk Space (>90%): Emergency priority (requires acknowledgement)

### Public Status Page
**Status:** Active
**URL:** https://dashboard.firefetch.org/status

Public-facing status page showing service health:
- Overall system status (operational/degraded/partial_outage/major_outage)
- Per-service uptime (24h/7d/30d percentages)
- Active incidents
- Recent incident history
- Auto-refresh every 30 seconds

**Files:**
- `/src/app/status/page.tsx` - Status page component
- `/src/app/api/status/route.ts` - Status API endpoint

**API Endpoints:**
- `GET /api/status` - Overall status with all services
- `GET /api/status?service=<id>&hours=24` - Service history

### Incidents API
**Status:** Active

Incident management for service outages:
- Create, update, and resolve incidents
- Severity levels: minor, major, critical
- Status tracking: investigating, identified, monitoring, resolved
- Automatic Pushover notifications

**Files:**
- `/src/app/api/incidents/route.ts` - Incidents API

**API Endpoints:**
- `GET /api/incidents` - List all incidents
- `GET /api/incidents?active=true` - List active incidents only
- `POST /api/incidents` - Create new incident
- `PATCH /api/incidents` - Update/resolve incident

### SQLite Database
**Status:** Active (replaced Beszel)

The dashboard uses SQLite for persistent metrics storage:
- **Location:** `/app/data/dashboard.db` (Docker volume: `dashboard-data`)
- **Tables:**
  - `metrics_live` - Raw metrics (5-second intervals, 24h retention)
  - `metrics_hourly` - Hourly aggregates (7-day retention)
  - `metrics_daily` - Daily aggregates (30-day retention)
  - `container_stats` - Docker container metrics
  - `service_status` - Service health history
  - `notifications` - Alert history

**API Endpoints:**
- `GET /api/database` - Database statistics
- `POST /api/database` - Trigger manual aggregation

**Data Flow:**
1. Metrics collector gathers data every 5/10/30 seconds
2. Data stored in `metrics_live` table
3. Hourly job aggregates to `metrics_hourly`, deletes old live data
4. Daily job aggregates to `metrics_daily`, cleans up hourly data

## Troubleshooting

### Dashboard not loading
1. Check if the container is running: `docker ps | grep dashboard`
2. Check container logs: `docker logs firefetch-dashboard`
3. Verify Traefik route: `curl -H "Host: dashboard.firefetch.org" http://localhost:80`

### Services showing as offline
1. Check if services.json is accessible
2. Verify service URLs are correct
3. Check network connectivity

### Container stats not showing
1. Verify Docker socket is mounted
2. Check Docker permissions
3. Ensure containers are running

## Maintenance

### Update the Dashboard
```bash
cd /home/ubuntu/ai/dashboard
git pull  # if using git
docker compose down
docker compose up -d --build
```

### View Logs
```bash
docker logs firefetch-dashboard -f
```

### Rebuild
```bash
docker compose up -d --build --force-recreate
```

## For Agents

When making changes to the dashboard:

1. **UI Changes:** Edit components in `src/components/`
2. **New Features:** Follow the patterns in existing widgets
3. **Styling:** Use Tailwind classes and follow the color scheme
4. **After Changes:** Rebuild with `docker compose up -d --build`

Always maintain the dark mode aesthetic and clean design.
