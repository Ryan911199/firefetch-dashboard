/**
 * Incidents API
 * Manage service incidents
 */

import { NextResponse } from 'next/server';
import {
  createIncident,
  updateIncident,
  resolveIncident,
  getActiveIncidents,
  getRecentIncidents,
} from '@/lib/database';
import { notifyIncident } from '@/lib/pushover';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (activeOnly) {
      const incidents = getActiveIncidents();
      return NextResponse.json({ incidents });
    }

    const incidents = getRecentIncidents(limit);
    return NextResponse.json({ incidents });
  } catch (error) {
    console.error('Incidents GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incidents' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { service_id, service_name, title, description, severity } = body;

    if (!service_id || !service_name || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: service_id, service_name, title' },
        { status: 400 }
      );
    }

    const incidentId = createIncident({
      timestamp: Date.now(),
      resolved_at: null,
      service_id,
      service_name,
      title,
      description: description || '',
      severity: severity || 'minor',
      status: 'investigating',
    });

    // Send Pushover notification
    await notifyIncident(
      title,
      `${service_name}: ${description || 'Investigating issue'}`,
      severity || 'warning'
    );

    return NextResponse.json({ id: incidentId, success: true });
  } catch (error) {
    console.error('Incidents POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create incident' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, description, severity, resolve } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing incident id' },
        { status: 400 }
      );
    }

    if (resolve) {
      resolveIncident(id);
    } else {
      updateIncident(id, {
        status,
        description,
        severity,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Incidents PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update incident' },
      { status: 500 }
    );
  }
}
