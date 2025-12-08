#!/bin/bash
# Dashboard Cache Update Script
# This script fetches fresh data from the dashboard APIs to keep the cache updated
# Run via systemd timer or cron every 2-5 minutes

DASHBOARD_URL="http://localhost:3002"

# Update metrics cache (also updates history every 5 min)
curl -s "${DASHBOARD_URL}/api/metrics?refresh=true" > /dev/null 2>&1

# Update services cache
curl -s "${DASHBOARD_URL}/api/services" > /dev/null 2>&1

# Update containers cache
curl -s "${DASHBOARD_URL}/api/containers" > /dev/null 2>&1

echo "$(date '+%Y-%m-%d %H:%M:%S') - Cache updated" >> /tmp/dashboard-cache/update.log
