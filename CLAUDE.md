# FireFetch Dashboard

A custom server monitoring and service management dashboard for the AI Homebase.

## Quick Reference

| Property | Value |
|----------|-------|
| **URL** | https://dashboard.firefetch.org |
| **Local** | http://localhost:3002 |
| **Tech Stack** | Next.js 14, React, Tailwind CSS |
| **Port** | 3002 |

## Project Overview

This dashboard provides:
- **Real-time system metrics** (CPU, RAM, disk, network)
- **Service status monitoring** (from services.json)
- **Docker container monitoring** (via Docker API)
- **Modern dark mode UI** with sleek design

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
│       ├── utils.ts              # Utility functions
│       └── types.ts              # TypeScript types
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

### Uptime Kuma
**Status:** Fully integrated with automated setup

The dashboard is fully integrated with Uptime Kuma to provide comprehensive uptime monitoring:
- **Uptime Widget:** Displays overall uptime statistics and individual monitor status
- **Service Integration:** Merges Uptime Kuma data with service status checks
- **Real-time Data:** Auto-refreshes every 60 seconds
- **Automated Setup:** Script to create monitors and status page automatically

**Configuration:**
- Endpoint: http://localhost:3001 (or https://status.firefetch.org)
- API Key: uk1_-uKYI9ZavqZ0eg82NLTBogjk-qy1uvwwlkEZPFH8
- Status Page Slug: `firefetch`
- Public Status Page: http://localhost:3001/status/firefetch
- API Endpoint: http://localhost:3001/api/status-page/firefetch

**Files:**
- `/src/lib/config.ts` - Uptime Kuma configuration
- `/src/lib/uptime-kuma.ts` - API helper functions (updated to use status page API)
- `/src/app/api/uptime/route.ts` - Uptime data API endpoint
- `/src/components/widgets/uptime-status.tsx` - Uptime status widget
- `/scripts/setup-uptime-kuma.js` - Automated setup script
- `/UPTIME_KUMA_SETUP.md` - Complete setup and integration guide

**How it works:**
1. Services API fetches data from Uptime Kuma status page API
2. Falls back to direct HTTP checks if Uptime Kuma unavailable
3. Uptime widget displays all monitors with status and metrics
4. Auto-refreshes to show real-time status
5. Uses public status page API (no authentication required for reads)

**Quick Setup (Automated):**
```bash
# 1. Install dependencies
npm install

# 2. Set credentials
export UPTIME_KUMA_USERNAME=admin
export UPTIME_KUMA_PASSWORD=your_password

# 3. Run setup
npm run setup:uptime-kuma
```

This will:
- Create HTTP monitors for all services in `/home/ubuntu/ai/infrastructure/services.json`
- Configure 60-second check intervals
- Create a public status page with slug "firefetch"
- Add all monitors to the status page

**Manual Setup:**
See `/home/ubuntu/ai/dashboard/UPTIME_KUMA_SETUP.md` for detailed manual setup instructions.

**API Integration:**
- Uses the public status page API: `/api/status-page/firefetch`
- No authentication required for reading data
- Returns monitor status, heartbeats, and uptime statistics
- Fully compatible with the dashboard's uptime widget

**Note:** The setup script uses Socket.IO for configuration but the dashboard reads data via the public status page API for simplicity and reliability.

### Future: Beszel Agent
Can be integrated for more detailed system metrics and historical data.

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
