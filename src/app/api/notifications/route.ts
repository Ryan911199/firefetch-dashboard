import { NextResponse } from "next/server";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  addNotification,
  getDb,
} from "@/lib/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    getDb();

    const notifications = getNotifications(50);
    const unreadCount = getUnreadCount();

    // Transform to match frontend format
    const transformed = notifications.map((n) => ({
      id: String(n.id),
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      read: Boolean(n.read),
      serviceId: n.service_id,
    }));

    return NextResponse.json({
      notifications: transformed,
      unreadCount,
      total: transformed.length,
    });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    getDb();
    const body = await request.json();
    const { action, id } = body;

    switch (action) {
      case "markRead":
        if (id) {
          markNotificationRead(parseInt(id, 10));
        }
        break;
      case "markAllRead":
        markAllNotificationsRead();
        break;
      case "create":
        if (body.notification) {
          const newId = addNotification({
            timestamp: Date.now(),
            type: body.notification.type || "info",
            title: body.notification.title,
            message: body.notification.message,
            service_id: body.notification.serviceId,
          });
          return NextResponse.json({ success: true, id: newId });
        }
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update notifications:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
