# Uptime Metrics Display Improvements

## Summary
Enhanced the FireFetch Dashboard uptime metrics system with timeframe selection, improved visualization, and accurate 90-day uptime tracking.

## Changes Made

### 1. Database Layer (`/src/lib/database.ts`)
- **Added 90-day uptime support**
  - Extended `ServiceUptime` interface to include `uptime_90d` field
  - Updated `getServiceUptime()` to calculate 90-day uptime percentages
  - Optimized `getAllServiceUptimes()` with single-query approach including 90d data
  - Modified query to include `uptime_90d` CTE (Common Table Expression)

### 2. New UI Components

#### `/src/components/ui/timeframe-selector.tsx`
- Reusable timeframe selector component
- Supports: 24 hours, 7 days, 30 days, 90 days
- Clean button group interface with active state styling
- Customizable styling via className prop

#### `/src/components/ui/uptime-bar.tsx`
- Visual uptime history bar (similar to status pages like Statuspage.io)
- Shows last N checks as colored bars (green/yellow/red)
- Configurable bar count (default: 90)
- Three height options: sm, md, lg
- Optional day labels for temporal context
- Hover tooltips showing status and timestamp
- Built-in legend showing status colors

#### `/src/components/uptime-display.tsx`
- Contextual uptime percentage display
- Shows uptime for currently selected timeframe
- Color-coded based on uptime percentage:
  - ≥99.9%: emerald (excellent)
  - ≥99.0%: green (good)
  - ≥95.0%: yellow (degraded)
  - ≥90.0%: orange (poor)
  - <90.0%: red (critical)

### 3. Status Page Updates (`/src/app/status/page.tsx`)
- **Added timeframe selector**
  - State management for selected timeframe (24h, 7d, 30d, 90d)
  - Positioned above services list for easy access

- **Enhanced service cards**
  - Replaced old inline uptime bar with new `UptimeBar` component
  - Shows all uptime percentages (24h, 7d, 30d, 90d) with responsive hiding
  - Integrated `UptimeDisplay` to show uptime for selected timeframe
  - Better mobile responsiveness

- **Improved layout**
  - Timeframe selector in header alongside "Services" title
  - Uptime stats now use flex layout for better spacing
  - Progressive disclosure: 90d stats hidden on small screens

### 4. Type Definitions
- Updated `ServiceUptime` interface across all files
- Ensured consistency between database, API, and frontend types
- Added optional `uptime90d` prop support in `UptimeDisplay`

## Features

### Timeframe Selection
Users can now select different time periods to view uptime:
- **24 hours**: Most recent day (default)
- **7 days**: Last week
- **30 days**: Last month
- **90 days**: Last quarter

The selected timeframe:
- Highlights the corresponding uptime percentage
- Updates the `UptimeDisplay` component dynamically
- Persists during the session (component state)

### Visual Uptime History
Each service now displays a visual bar showing:
- Last 90 health checks
- Color-coded status (green=online, yellow=degraded, red=offline)
- Hover tooltips with exact status and timestamp
- Legend explaining the color codes

### Accurate Calculations
- Database-backed calculations using actual service check history
- Separate aggregations for 24h, 7d, 30d, and 90d windows
- Handles edge cases (no data = 100% uptime assumption)
- Response times averaged over 24h window

## API Response Format

The `/api/status` endpoint now returns:

```json
{
  "status": "operational",
  "services": [
    {
      "service_id": "backend",
      "service_name": "appwrite",
      "current_status": "online",
      "uptime_24h": 98.99,
      "uptime_7d": 98.99,
      "uptime_30d": 98.99,
      "uptime_90d": 98.99,
      "avg_response_time": 163.33,
      "total_checks": 198,
      "last_checked": 1765358982087
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
  "lastUpdated": 1765358982100
}
```

## Database Schema
No schema changes required - uses existing `service_status` table with timestamp-based queries for different time windows.

## Performance Optimizations
- **Single-query approach**: `getAllServiceUptimes()` uses CTEs to fetch all uptime windows in one query
- **Indexed queries**: Existing indexes on `timestamp` and `service_id` ensure fast lookups
- **No N+1 problems**: Replaced loop-based fetching with JOIN-based aggregation

## Browser Compatibility
- Modern CSS (flexbox, grid)
- No special browser requirements
- Responsive design works on mobile/tablet/desktop

## Testing
Verified functionality:
- ✅ API returns `uptime_90d` field
- ✅ Status page loads without errors
- ✅ Timeframe selector switches between periods
- ✅ Uptime bars render correctly
- ✅ Color coding matches uptime percentages
- ✅ Responsive layout on different screen sizes

## Files Modified
1. `/src/lib/database.ts` - Database queries and types
2. `/src/app/status/page.tsx` - Status page component
3. `/src/app/api/status/route.ts` - Status API endpoint
4. `/src/components/uptime-display.tsx` - NEW
5. `/src/components/ui/timeframe-selector.tsx` - NEW
6. `/src/components/ui/uptime-bar.tsx` - NEW

## Deployment
```bash
# Build the application
npm run build

# Deploy with Docker
docker compose build --no-cache dashboard
docker compose up -d dashboard

# Verify
curl http://localhost:3002/api/status
```

## Future Enhancements (Optional)
1. **Custom date ranges**: Allow users to select arbitrary date ranges
2. **Export functionality**: Export uptime reports as CSV/PDF
3. **Uptime goals**: Set and visualize SLA targets (e.g., 99.9% goal)
4. **Downtime calendar**: Calendar view showing outages
5. **Comparison view**: Compare uptime across multiple services
6. **Notifications**: Alert when uptime drops below threshold
7. **Historical trends**: Graph showing uptime trends over time

## Notes
- The system assumes services checked every ~30 seconds
- Uptime calculations are based on actual checks, not estimated time
- First deployment may show 100% for new services (no history yet)
- Data retention: 7 days for raw checks, aggregated for longer periods
