# Appwrite Integration - Quick Reference

## Setup (One-Time)

```bash
cd /home/ubuntu/ai/dashboard
./setup-appwrite.sh
```

## Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=http://localhost:8090/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=firefetch-dashboard
NEXT_PUBLIC_APPWRITE_DATABASE_ID=dashboard
NEXT_PUBLIC_APPWRITE_COLLECTION_SETTINGS=settings
NEXT_PUBLIC_APPWRITE_COLLECTION_METRICS=metrics_history
NEXT_PUBLIC_APPWRITE_COLLECTION_INCIDENTS=incidents
NEXT_PUBLIC_APPWRITE_COLLECTION_ALERTS=alerts
```

## Console Access

- Local: http://localhost:8090
- External: https://backend.firefetch.org/console

## Common Operations

### Settings
```typescript
import { getSettings, saveSettings } from '@/lib/appwrite-service';

// Load
const settings = await getSettings();

// Save
await saveSettings(settings);
```

### Metrics
```typescript
import { saveMetricsSnapshot, getMetricsHistory } from '@/lib/appwrite-service';

// Save snapshot
await saveMetricsSnapshot({
  cpu: 45,
  memoryUsed: 8500000000,
  memoryTotal: 16000000000,
  diskUsed: 45000000000,
  diskTotal: 200000000000,
  networkUp: 2100000,
  networkDown: 540000,
});

// Get history
const metrics = await getMetricsHistory('day'); // 'hour'|'day'|'week'|'month'
```

### Incidents
```typescript
import { createIncident, resolveIncident, getIncidents } from '@/lib/appwrite-service';

// Create
await createIncident({
  serviceId: 'service-id',
  serviceName: 'Service Name',
  startTime: new Date().toISOString(),
  status: 'ongoing',
  severity: 'critical',
});

// Resolve
await resolveIncident(incidentId);

// List
const ongoing = await getIncidents('ongoing');
```

### Alerts
```typescript
import { saveAlert, getAlerts, updateAlert } from '@/lib/appwrite-service';

// Create
await saveAlert({
  type: 'cpu',
  threshold: 80,
  enabled: true,
});

// List
const alerts = await getAlerts(true); // enabled only

// Update
await updateAlert(alertId, { enabled: false });
```

## Database Schema

### Collections Required

1. **settings**
   - userId (string, 255)
   - settings (string, 10000)
   - updatedAt (datetime)

2. **metrics_history**
   - timestamp (datetime)
   - cpu, memoryUsed, memoryTotal (integer)
   - diskUsed, diskTotal (integer)
   - networkUp, networkDown (integer)

3. **incidents**
   - serviceId, serviceName (string, 255)
   - startTime, endTime (datetime)
   - status, severity (string, 50)
   - description (string, 1000)

4. **alerts**
   - userId, type (string)
   - threshold (integer)
   - enabled (boolean)
   - createdAt, triggeredAt (datetime)
   - metadata (string, 1000)

## Troubleshooting

### Check Appwrite Health
```bash
curl http://localhost:8090/v1/health
```

### Enable Anonymous Auth
1. Appwrite Console > Settings > Authentication
2. Enable "Anonymous" provider
3. Save

### Add Platform for CORS
1. Appwrite Console > Settings > Platforms
2. Add web platform: `http://localhost:3002`
3. Save

### View Logs
```bash
# Dashboard
docker logs firefetch-dashboard -f

# Appwrite
docker logs appwrite -f
```

## File Locations

- Configuration: `/src/lib/appwrite.ts`
- Service Layer: `/src/lib/appwrite-service.ts`
- Examples: `/src/lib/appwrite-examples.ts`
- Settings Context: `/src/contexts/settings-context.tsx`
- Setup Guide: `/APPWRITE_SETUP.md`
- Summary: `/INTEGRATION_SUMMARY.md`

## Graceful Degradation

The dashboard automatically falls back to localStorage if Appwrite is unavailable. No user-facing errors occur - check browser console for status messages.

## Next Steps After Setup

1. Create Appwrite project and database
2. Create 4 collections (see schema above)
3. Set collection permissions to "Any"
4. Enable anonymous authentication
5. Restart dashboard: `npm run dev`
6. Check browser console for "Loaded settings from Appwrite"

For detailed instructions, see `/home/ubuntu/ai/dashboard/APPWRITE_SETUP.md`
