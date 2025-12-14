import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import DeliveryReminderService from '@/lib/services/deliveryReminderService';

/**
 * GET /api/admin/delivery-reminders
 * Get upcoming delivery reminders (admin view)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const reminders = await DeliveryReminderService.getUpcomingReminders();

    return NextResponse.json({
      success: true,
      data: reminders,
      count: reminders.length,
    });
  } catch (error) {
    console.error('Error fetching delivery reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery reminders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/delivery-reminders/:orderId/send
 * Manually send delivery reminder for an order
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { orderId, reminderType } = body;

    if (!orderId || !reminderType) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, reminderType' },
        { status: 400 }
      );
    }

    const sent = await DeliveryReminderService.sendManualReminder(
      orderId,
      reminderType
    );

    return NextResponse.json({
      success: sent,
      message: sent ? 'Delivery reminder sent' : 'Failed to send reminder',
    });
  } catch (error: any) {
    console.error('Error sending delivery reminder:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send delivery reminder' },
      { status: 500 }
    );
  }
}
