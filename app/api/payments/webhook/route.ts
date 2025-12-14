import { NextRequest, NextResponse } from 'next/server';
import PaymentService, { PaymentError } from '@/lib/services/paymentService';
import { connectDB } from '@/lib/mongodb';
import crypto from 'crypto';

/**
 * POST /api/payments/webhook
 * Receive webhook callbacks from Razorpay, Stripe
 * Supports signature verification and idempotency
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Determine provider from headers or body
    const razorpaySignature = request.headers.get('x-razorpay-signature');
    const stripeSignature = request.headers.get('stripe-signature');

    let provider = 'unknown';
    if (razorpaySignature) {
      provider = 'razorpay';
    } else if (stripeSignature) {
      provider = 'stripe';
    }

    if (provider === 'unknown') {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_PROVIDER',
          message: 'Unable to determine payment provider',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const bodyString = JSON.stringify(body);

    let payment;

    if (provider === 'razorpay') {
      // Verify Razorpay signature
      const isValid = PaymentService.verifyRazorpaySignature(
        body.payload?.payment?.order_id || '',
        body.payload?.payment?.id || '',
        razorpaySignature || ''
      );

      if (!isValid) {
        console.warn('Invalid Razorpay signature:', razorpaySignature);
        return NextResponse.json(
          {
            success: false,
            code: 'SIGNATURE_VERIFICATION_FAILED',
            message: 'Invalid webhook signature',
          },
          { status: 403 }
        );
      }

      // Check for idempotency
      const webhookId = `razorpay_${body.payload?.payment?.id}`;
      const idempotencyKey = `webhook_${webhookId}_${Date.now()}`;

      // Process webhook
      try {
        payment = await PaymentService.handleWebhook(
          body,
          razorpaySignature || '',
          provider
        );
      } catch (error: any) {
        if (error instanceof PaymentError && error.code === 'DUPLICATE_WEBHOOK') {
          // Already processed, return success
          return NextResponse.json(
            {
              success: true,
              message: 'Webhook already processed',
            },
            { status: 200 }
          );
        }
        throw error;
      }
    } else if (provider === 'stripe') {
      // Verify Stripe signature
      const isValid = PaymentService.verifyStripeSignature(
        bodyString,
        stripeSignature || ''
      );

      if (!isValid) {
        console.warn('Invalid Stripe signature:', stripeSignature);
        return NextResponse.json(
          {
            success: false,
            code: 'SIGNATURE_VERIFICATION_FAILED',
            message: 'Invalid webhook signature',
          },
          { status: 403 }
        );
      }

      // Check for idempotency (Stripe event ID)
      const eventId = body.id;
      if (!eventId) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_WEBHOOK_PAYLOAD',
            message: 'Missing event ID',
          },
          { status: 400 }
        );
      }

      // Process webhook
      try {
        payment = await PaymentService.handleWebhook(
          body,
          stripeSignature || '',
          provider
        );
      } catch (error: any) {
        if (error instanceof PaymentError && error.code === 'DUPLICATE_WEBHOOK') {
          // Already processed, return success
          return NextResponse.json(
            {
              success: true,
              message: 'Webhook already processed',
            },
            { status: 200 }
          );
        }
        throw error;
      }
    }

    // Return success response (webhook processors expect 200 OK to stop retries)
    return NextResponse.json(
      {
        success: true,
        message: 'Webhook processed successfully',
        data: payment ? { paymentId: payment._id } : undefined,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Webhook processing error:', error);

    if (error instanceof PaymentError) {
      // Log error but return 200 to prevent gateway retry storms
      console.error(`Payment error: ${error.code} - ${error.message}`);
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          message: error.message,
        },
        { status: 200 } // Return 200 to stop gateway retries
      );
    }

    // Return 200 for generic errors too (to prevent retry storms)
    console.error('Unexpected webhook error:', error);
    return NextResponse.json(
      {
        success: false,
        code: 'WEBHOOK_ERROR',
        message: 'Failed to process webhook',
      },
      { status: 200 } // Return 200 to stop gateway retries
    );
  }
}

/**
 * GET /api/payments/webhook
 * Health check for webhook endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: true,
      message: 'Webhook endpoint is operational',
      providers: ['razorpay', 'stripe'],
    },
    { status: 200 }
  );
}
