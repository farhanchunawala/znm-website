import { NextRequest, NextResponse } from 'next/server';
import PaymentSandbox, { RazorpaySandbox, StripeSandbox } from '@/lib/devtest/paymentSandbox';
import { isDevtestEnabled, devtestResponse, devtestError } from '@/lib/devtest/core';

/**
 * POST /api/devtest/payment
 * Simulate payment operations
 * 
 * Body:
 * {
 *   action: 'create' | 'simulate' | 'verify' | 'webhook',
 *   gateway: 'razorpay' | 'stripe',
 *   orderId: string,
 *   amount: number,
 *   scenario?: 'success' | 'failure' | 'timeout' | 'webhook' | 'signature' | 'idempotency',
 *   customerId?: string,
 *   email?: string,
 *   phone?: string,
 *   paymentId?: string,      // For verify/webhook operations
 *   signature?: string,       // For signature verification
 *   webhookEvent?: string     // For webhook simulation
 * }
 */
export async function POST(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  try {
    const body = await request.json();
    const {
      action,
      gateway,
      orderId,
      amount,
      scenario = 'success',
      customerId = 'cust_test',
      email = 'test@example.com',
      phone = '+919999999999',
      paymentId,
      signature,
      webhookEvent,
    } = body;
    
    if (!action || !gateway) {
      return devtestError('INVALID_REQUEST', 'action and gateway are required');
    }
    
    // Create/Initiate payment
    if (action === 'create') {
      if (!orderId || !amount) {
        return devtestError('INVALID_REQUEST', 'orderId and amount are required');
      }
      
      const response = await PaymentSandbox.simulatePayment(gateway, {
        orderId,
        amount,
        currency: 'INR',
        customerId,
        email,
        phone,
        scenario,
      });
      
      return devtestResponse({
        success: response.status !== 'failed',
        payment: response,
      });
    }
    
    // Simulate complete payment flow
    else if (action === 'simulate') {
      if (!orderId || !amount) {
        return devtestError('INVALID_REQUEST', 'orderId and amount are required');
      }
      
      const flow = await PaymentSandbox.simulateCompletePaymentFlow(gateway, orderId, amount);
      
      return devtestResponse({
        success: true,
        flow,
      });
    }
    
    // Verify payment signature
    else if (action === 'verify') {
      if (!paymentId || !orderId || !signature) {
        return devtestError('INVALID_REQUEST', 'paymentId, orderId, and signature are required');
      }
      
      let isValid = false;
      if (gateway === 'razorpay') {
        isValid = RazorpaySandbox.verifySignature(paymentId, orderId, signature);
      } else if (gateway === 'stripe') {
        // For Stripe, signature verification requires body and timestamp
        isValid = false; // Need to implement with proper request context
      }
      
      return devtestResponse({
        success: isValid,
        verified: isValid,
        gateway,
        paymentId,
        orderId,
      });
    }
    
    // Generate webhook payload for testing
    else if (action === 'webhook') {
      if (!paymentId || !orderId || !amount || !webhookEvent) {
        return devtestError(
          'INVALID_REQUEST',
          'paymentId, orderId, amount, and webhookEvent are required'
        );
      }
      
      const webhook = await PaymentSandbox.simulateWebhook(
        gateway,
        webhookEvent,
        paymentId,
        orderId,
        amount
      );
      
      return devtestResponse({
        success: true,
        webhook: {
          event: webhookEvent,
          payload: webhook.payload,
          signature: webhook.signature,
          // Include headers that would be sent
          headers: gateway === 'razorpay'
            ? {
                'X-Razorpay-Signature': webhook.signature,
              }
            : {
                'Stripe-Signature': webhook.signature,
              },
        },
      });
    }
    
    // Generate signature for testing
    else if (action === 'generateSignature') {
      if (!paymentId || !orderId) {
        return devtestError('INVALID_REQUEST', 'paymentId and orderId are required');
      }
      
      let sig = '';
      if (gateway === 'razorpay') {
        sig = RazorpaySandbox.generateSignature(paymentId, orderId);
      } else if (gateway === 'stripe') {
        // Stripe signature generation requires timestamp and body
        sig = StripeSandbox.generateWebhookSignature(JSON.stringify({}), Math.floor(Date.now() / 1000));
      }
      
      return devtestResponse({
        success: true,
        signature: sig,
        gateway,
      });
    }
    
    // Generate idempotency key
    else if (action === 'idempotencyKey') {
      const key = PaymentSandbox.generateIdempotencyKey(`test_${orderId}`);
      return devtestResponse({
        success: true,
        idempotencyKey: key,
      });
    }
    
    // Test duplicate webhook handling
    else if (action === 'duplicateWebhook') {
      if (!paymentId) {
        return devtestError('INVALID_REQUEST', 'paymentId is required');
      }
      
      const originalId = paymentId;
      const duplicateId = PaymentSandbox.generateDuplicateWebhookId(originalId);
      
      return devtestResponse({
        success: true,
        originalWebhookId: originalId,
        duplicateWebhookId: duplicateId,
        testScenario: 'Try sending the same webhook twice with different IDs to test idempotency',
      });
    }
    
    else {
      return devtestError('INVALID_REQUEST', 'Invalid action: ' + action);
    }
  } catch (error: any) {
    console.error('Payment simulation error:', error);
    return devtestError('PAYMENT_SIMULATION_ERROR', error.message);
  }
}

/**
 * GET /api/devtest/payment
 * Get payment testing utilities and information
 * 
 * Query params:
 * - info?: string  // Get specific information (scenarios, gateways, etc)
 */
export async function GET(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const info = searchParams.get('info');
    
    if (info === 'scenarios') {
      return devtestResponse({
        success: true,
        scenarios: [
          {
            name: 'success',
            description: 'Payment authorized and captured successfully',
            expectedStatus: 'captured',
          },
          {
            name: 'failure',
            description: 'Payment declined by gateway',
            expectedStatus: 'failed',
          },
          {
            name: 'timeout',
            description: 'Payment processing timeout',
            expectedStatus: 'pending',
          },
          {
            name: 'webhook',
            description: 'Webhook delivery and processing',
            expectedStatus: 'webhook_received',
          },
          {
            name: 'signature',
            description: 'Test signature verification',
            expectedStatus: 'signature_valid',
          },
          {
            name: 'idempotency',
            description: 'Test idempotency key handling',
            expectedStatus: 'duplicate_detected',
          },
          {
            name: 'duplicate',
            description: 'Test duplicate webhook handling',
            expectedStatus: 'duplicate_ignored',
          },
        ],
      });
    }
    
    if (info === 'gateways') {
      return devtestResponse({
        success: true,
        gateways: [
          {
            name: 'razorpay',
            signatureMethod: 'HMAC SHA256',
            signatureFormat: '{orderId}|{paymentId}',
            webhookEvents: [
              'payment.authorized',
              'payment.captured',
              'payment.failed',
              'refund.created',
              'refund.failed',
            ],
          },
          {
            name: 'stripe',
            signatureMethod: 'HMAC SHA256 (timestamp.body)',
            signatureFormat: 't={timestamp},v1={hash}',
            webhookEvents: [
              'payment_intent.succeeded',
              'payment_intent.payment_failed',
              'charge.refunded',
              'charge.dispute.created',
            ],
          },
        ],
      });
    }
    
    if (info === 'testcases') {
      return devtestResponse({
        success: true,
        testCases: [
          {
            name: 'Basic Payment Creation',
            steps: [
              'POST /api/devtest/payment with action=create',
              'Verify paymentId is generated',
              'Verify amount matches request',
            ],
          },
          {
            name: 'Payment Signature Verification',
            steps: [
              'Generate payment with action=create',
              'Generate signature with action=generateSignature',
              'Verify signature with action=verify',
              'Expect verified=true',
            ],
          },
          {
            name: 'Complete Payment Flow',
            steps: [
              'POST /api/devtest/payment with action=simulate',
              'Verify create response returned',
              'Verify webhooks array contains all lifecycle events',
              'Verify signatures present in webhooks',
            ],
          },
          {
            name: 'Webhook Idempotency',
            steps: [
              'Generate webhook with action=webhook',
              'Post webhook to endpoint',
              'Post same webhook again with different X-Webhook-Id',
              'Expect second webhook to be ignored (idempotency)',
            ],
          },
          {
            name: 'Payment Failure Scenario',
            steps: [
              'POST /api/devtest/payment with scenario=failure',
              'Verify status=failed',
              'Verify error code present',
              'Verify error message descriptive',
            ],
          },
        ],
      });
    }
    
    // Default: return usage information
    return devtestResponse({
      success: true,
      usage: {
        actions: [
          'create',
          'simulate',
          'verify',
          'webhook',
          'generateSignature',
          'idempotencyKey',
          'duplicateWebhook',
        ],
        gateways: ['razorpay', 'stripe'],
        scenarios: ['success', 'failure', 'timeout', 'webhook', 'signature', 'idempotency', 'duplicate'],
        queryParams: {
          info: 'scenarios | gateways | testcases',
        },
      },
    });
  } catch (error: any) {
    console.error('Payment info error:', error);
    return devtestError('PAYMENT_INFO_ERROR', error.message);
  }
}
