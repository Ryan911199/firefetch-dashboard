# Dashboard

FireFetch Dashboard - System monitoring and service health dashboard.

## Directory Structure

```
src/
├── app/                      # Next.js app router pages
│   ├── api/                  # API routes
│   │   ├── containers/       # Docker container endpoints
│   │   ├── database/         # Database stats endpoints
│   │   ├── incidents/        # Incident management endpoints
│   │   ├── metrics/          # System metrics endpoints
│   │   ├── notifications/    # Notification endpoints
│   │   ├── services/         # Service status endpoints
│   │   ├── status/           # Uptime status endpoints
│   │   └── uptime/           # Uptime calculation endpoints
│   ├── docker/               # Docker management page
│   ├── metrics/              # System metrics page
│   ├── services/             # Services overview page
│   ├── settings/             # Settings page
│   └── status/               # Public status page
├── components/
│   ├── docker/               # Docker-specific components (NEW)
│   ├── layout/               # Layout components (sidebar, header, nav)
│   ├── ui/                   # Reusable UI components
│   └── widgets/              # Dashboard widgets
├── contexts/                 # React contexts
└── lib/
    ├── database/             # Database operations (split by domain)
    │   ├── index.ts          # Barrel exports
    │   ├── connection.ts     # DB init, schema, stats
    │   ├── metrics.ts        # Metrics CRUD
    │   ├── containers.ts     # Container stats
    │   ├── services.ts       # Service status
    │   ├── notifications.ts  # Notifications
    │   ├── aggregation.ts    # Hourly/daily aggregation
    │   ├── uptime.ts         # Uptime calculations
    │   └── incidents.ts      # Incident management
    ├── collectors/           # Metrics collection modules
    │   ├── index.ts          # Main collector, exports
    │   ├── system-metrics.ts # CPU, memory, disk, network
    │   ├── docker-stats.ts   # Container collection
    │   ├── service-health.ts # Internal health checks
    │   ├── public-url-checker.ts # External URL checks
    │   └── notification-handler.ts # Alert handling
    └── utils/                # Utility functions
        └── formatters.ts     # Shared formatters (formatBytes, formatUptime, etc.)
```

## Key Modules

| Module | Purpose | Key Files |
|--------|---------|-----------|
| database | DB operations (SQLite) | connection.ts, metrics.ts, services.ts, uptime.ts |
| collectors | Real-time metrics collection | system-metrics.ts, docker-stats.ts, service-health.ts |
| components | React UI components | docker-content.tsx, metrics-content.tsx |

## Common Tasks

### Database Operations
- **Modify metrics storage**: Edit `src/lib/database/metrics.ts`
- **Add new database table**: Edit `src/lib/database/connection.ts` (schema)
- **Change aggregation logic**: Edit `src/lib/database/aggregation.ts`
- **Modify uptime calculations**: Edit `src/lib/database/uptime.ts`

### Metrics Collection
- **Modify system metrics**: Edit `src/lib/collectors/system-metrics.ts`
- **Change Docker stats collection**: Edit `src/lib/collectors/docker-stats.ts`
- **Modify health check logic**: Edit `src/lib/collectors/service-health.ts`
- **Change notification thresholds**: Edit `src/lib/collectors/notification-handler.ts`
- **Modify public URL checking**: Edit `src/lib/collectors/public-url-checker.ts`
- **Change collection intervals**: Edit `src/lib/collectors/index.ts` (UI_INTERVALS, STORAGE_INTERVALS)

### UI Components
- **Add Docker UI features**: Edit `src/components/docker-content.tsx`
- **Modify metrics display**: Edit `src/components/metrics-content.tsx`
- **Change layout**: Edit `src/components/layout/`
- **Add reusable UI component**: Add to `src/components/ui/`

### API Routes
- **Add new API endpoint**: Create route in `src/app/api/`
- **Modify metrics API**: Edit `src/app/api/metrics/route.ts`
- **Modify container API**: Edit `src/app/api/containers/route.ts`

## Architecture Notes

### Decoupled Architecture
- **UI Updates**: Real-time via WebSocket (2-5 second intervals)
- **Database Storage**: Periodic persistence (5-10-30 second intervals)
- **Notifications**: Pushover with 3-strike system (must fail 3x before alerting)

### Health Check System
- **Internal checks**: Fast, via internal URLs (localhost/host.docker.internal)
- **Public URL checks**: Slower, validates external accessibility
- **3-strike system**: Services must fail 3 consecutive checks before notification

### Data Retention
- **Live metrics**: 24 hours (1-minute resolution)
- **Hourly aggregates**: 7 days
- **Daily aggregates**: 30 days
- **Container/service stats**: 7 days
- **Notifications**: 30 days

## Import Patterns

```typescript
// Database operations
import { getDb, insertMetricsSnapshot, getAllServiceUptimes } from '@/lib/database';

// Collectors
import { startCollector, stopCollector, collectSystemMetrics } from '@/lib/collectors';

// Or use the legacy re-exports (backward compatible)
import { ... } from '@/lib/database';
import { ... } from '@/lib/metrics-collector';
```

## Environment Variables
- `DB_PATH` - Database directory (default: `/app/data`)
- `SERVICES_CONFIG_PATH` - Services config file path
- `DOCKER_ENV` - Set to 'true' when running in Docker

## Credentials

Service credentials are stored in `/home/ubuntu/ai/.credentials/credentials.txt`. This includes Uptime Kuma, Beszel, and notification service credentials. Read this file when you need to configure monitoring or alerting.
