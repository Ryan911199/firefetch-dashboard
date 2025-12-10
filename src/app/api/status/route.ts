/**
 * Public Status API
 * Returns service uptime data for the public status page
 */

import { NextResponse } from 'next/server';
import {
  getAllServiceUptimes,
  getActiveIncidents,
  getRecentIncidents,
  getServiceUptimeHistory,
} from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('service');
    const historyHours = parseInt(searchParams.get('hours') || '24', 10);

    // If requesting specific service history
    if (serviceId) {
      const history = getServiceUptimeHistory(serviceId, historyHours);
      return NextResponse.json({ history });
    }

    // Get all service uptimes
    const services = getAllServiceUptimes();

    // Get active and recent incidents
    const activeIncidents = getActiveIncidents();
    const recentIncidents = getRecentIncidents(5);

    // Calculate overall status
    const allOnline = services.every((s) => s.current_status === 'online');
    const anyOffline = services.some((s) => s.current_status === 'offline');
    const anyDegraded = services.some((s) => s.current_status === 'degraded');

    let overallStatus: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' = 'operational';
    if (anyOffline && services.filter((s) => s.current_status === 'offline').length > services.length / 2) {
      overallStatus = 'major_outage';
    } else if (anyOffline) {
      overallStatus = 'partial_outage';
    } else if (anyDegraded) {
      overallStatus = 'degraded';
    }

    // Calculate average uptime
    const avgUptime24h = services.length > 0
      ? services.reduce((sum, s) => sum + s.uptime_24h, 0) / services.length
      : 100;

    return NextResponse.json({
      status: overallStatus,
      services,
      activeIncidents,
      recentIncidents,
      summary: {
        total: services.length,
        online: services.filter((s) => s.current_status === 'online').length,
        degraded: services.filter((s) => s.current_status === 'degraded').length,
        offline: services.filter((s) => s.current_status === 'offline').length,
        avgUptime24h,
      },
      lastUpdated: Date.now(),
    });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
