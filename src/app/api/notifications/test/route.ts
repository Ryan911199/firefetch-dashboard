/**
 * Test Pushover Notifications
 */

import { NextResponse } from 'next/server';
import { sendTestNotification, isPushoverEnabled } from '@/lib/pushover';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    if (!isPushoverEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pushover not configured. Set PUSHOVER_USER_KEY and PUSHOVER_APP_KEY environment variables.',
        },
        { status: 400 }
      );
    }

    const result = await sendTestNotification();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    enabled: isPushoverEnabled(),
    message: isPushoverEnabled()
      ? 'Pushover is configured. POST to this endpoint to send a test notification.'
      : 'Pushover is not configured. Set PUSHOVER_USER_KEY and PUSHOVER_APP_KEY environment variables.',
  });
}
