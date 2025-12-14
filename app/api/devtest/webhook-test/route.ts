import { NextRequest, NextResponse } from 'next/server';
import { isDevtestEnabled, devtestResponse, devtestError } from '@/lib/devtest/core';
import PaymentSandbox from '@/lib/devtest/paymentSandbox';

/**
 * POST /api/devtest/webhook-test
 * Test webhook delivery and handling
 * 
 * Body:
 * {
 *   webhookUrl: string,     // Endpoint to test
 *   gateway: 'razorpay' | 'stripe',
 *   event: string,
 *   paymentId: string,
 *   orderId: string,
 *   amount: number,
 *   options?: {
 *     retryCount?: number,
 *     retryDelay?: number,
 *     timeout?: number,
 *     includeBadSignature?: boolean,
 *     includeDuplicate?: boolean,
 *     simulateDelay?: number
 *   }
 * }
 * 
 * Response:
 * - Test results for each attempt
 * - HTTP status codes
 * - Response bodies
 * - Timing information
 */
export async function POST(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  try {
    const body = await request.json();
    const {
      webhookUrl,
      gateway,
      event,
      paymentId,
      orderId,
      amount,
      options = {},
    } = body;
    
    if (!webhookUrl || !gateway || !event || !paymentId || !orderId || !amount) {
      return devtestError(
        'INVALID_REQUEST',
        'webhookUrl, gateway, event, paymentId, orderId, and amount are required'
      );
    }
    
    const {
      retryCount = 3,
      retryDelay = 1000,
      timeout = 10000,
      includeBadSignature = false,
      includeDuplicate = false,
      simulateDelay = 0,
    } = options;
    
    const results = [];
    
    try {
      // Generate webhook payload and signature
      const webhook = await PaymentSandbox.simulateWebhook(
        gateway,
        event,
        paymentId,
        orderId,
        amount
      );
      
      let webhookId = `whk_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Test 1: Normal delivery
      const normalTest = await testWebhookDelivery(
        webhookUrl,
        webhook,
        gateway,
        webhookId,
        timeout,
        simulateDelay
      );
      results.push({
        scenario: 'normal_delivery',
        passed: normalTest.statusCode === 200,
        ...normalTest,
      });
      
      // Test 2: Bad signature (if requested)
      if (includeBadSignature) {
        const badSigTest = await testWebhookDelivery(
          webhookUrl,
          webhook,
          gateway,
          webhookId + '_bad',
          timeout,
          simulateDelay,
          'bad_signature'
        );
        results.push({
          scenario: 'bad_signature',
          passed: badSigTest.statusCode !== 200, // Should reject bad signature
          ...badSigTest,
        });
      }
      
      // Test 3: Duplicate delivery (same webhook ID)
      if (includeDuplicate) {
        // Simulate network delay between attempts
        await delay(retryDelay);
        
        const dupTest = await testWebhookDelivery(
          webhookUrl,
          webhook,
          gateway,
          webhookId, // Same ID as first attempt
          timeout,
          simulateDelay
        );
        
        results.push({
          scenario: 'duplicate_webhook',
          passed: dupTest.statusCode === 200, // Should accept and deduplicate
          isDuplicate: true,
          ...dupTest,
        });
      }
      
      // Test 4: Retry on failure
      if (retryCount > 1) {
        let retryWebhookId = `whk_retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const retryResults = [];
        
        for (let attempt = 1; attempt <= retryCount; attempt++) {
          if (attempt > 1) {
            await delay(retryDelay);
          }
          
          const retryTest = await testWebhookDelivery(
            webhookUrl,
            webhook,
            gateway,
            retryWebhookId + `_attempt_${attempt}`,
            timeout,
            simulateDelay
          );
          
          retryResults.push({
            attempt,
            ...retryTest,
          });
          
          if (retryTest.statusCode === 200) {
            break;
          }
        }
        
        results.push({
          scenario: 'retry_handling',
          passed: retryResults.some(r => r.statusCode === 200),
          attempts: retryResults,
        });
      }
      
      return devtestResponse({
        success: results.every(r => r.passed),
        webhookUrl,
        gateway,
        event,
        testsRun: results.length,
        results,
        summary: {
          passed: results.filter(r => r.passed).length,
          failed: results.filter(r => !r.passed).length,
        },
      });
    } catch (error: any) {
      return devtestError('WEBHOOK_TEST_FAILED', error.message);
    }
  } catch (error: any) {
    console.error('Webhook test error:', error);
    return devtestError('WEBHOOK_TEST_ERROR', error.message);
  }
}

/**
 * Test webhook delivery to an endpoint
 */
async function testWebhookDelivery(
  webhookUrl: string,
  webhook: { payload: Record<string, any>; signature: string },
  gateway: string,
  webhookId: string,
  timeout: number,
  simulateDelay: number,
  signatureMode?: string
): Promise<{
  statusCode: number;
  responseTime: number;
  responseBody?: string;
  error?: string;
  headers?: Record<string, string>;
}> {
  const startTime = Date.now();
  
  try {
    // Simulate network delay if requested
    if (simulateDelay > 0) {
      await delay(simulateDelay);
    }
    
    // Prepare headers based on gateway
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Id': webhookId,
      'X-Webhook-Timestamp': Math.floor(Date.now() / 1000).toString(),
    };
    
    let signature = webhook.signature;
    
    if (signatureMode === 'bad_signature') {
      signature = 'invalid_signature_for_testing';
    }
    
    if (gateway === 'razorpay') {
      headers['X-Razorpay-Signature'] = signature;
    } else if (gateway === 'stripe') {
      headers['Stripe-Signature'] = signature;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(webhook.payload),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - startTime;
    const responseBody = await response.text();
    
    return {
      statusCode: response.status,
      responseTime,
      responseBody: responseBody.length > 500 ? responseBody.substring(0, 500) + '...' : responseBody,
      headers: Object.fromEntries(response.headers),
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    let errorMessage = error.message;
    if (error.name === 'AbortError') {
      errorMessage = `Timeout after ${timeout}ms`;
    }
    
    return {
      statusCode: 0,
      responseTime,
      error: errorMessage,
    };
  }
}

/**
 * Utility to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * GET /api/devtest/webhook-test
 * Get webhook testing information and guidelines
 */
export async function GET(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  return devtestResponse({
    success: true,
    webhookTestingGuide: {
      overview: 'Test webhook delivery, signature verification, and retry handling',
      scenarios: [
        {
          name: 'Normal Delivery',
          description: 'Test successful webhook delivery',
          expectations: ['Status 200', 'Webhook processed'],
        },
        {
          name: 'Bad Signature',
          description: 'Test rejection of invalid signature',
          expectations: ['Status 401 or 403', 'Webhook rejected'],
        },
        {
          name: 'Duplicate Webhook',
          description: 'Test idempotency (same webhook ID)',
          expectations: ['Status 200', 'Webhook deduplicated'],
        },
        {
          name: 'Retry Handling',
          description: 'Test retry mechanism on failure',
          expectations: ['Retries up to N times', 'Success on retry'],
        },
      ],
      testScenarios: [
        {
          scenario: 'Razorpay Success Flow',
          gateway: 'razorpay',
          events: ['payment.authorized', 'payment.captured'],
          signature: 'X-Razorpay-Signature header',
        },
        {
          scenario: 'Stripe Success Flow',
          gateway: 'stripe',
          events: ['payment_intent.succeeded'],
          signature: 'Stripe-Signature header (t=timestamp, v1=hash)',
        },
      ],
      bestPractices: [
        'Always verify webhook signatures',
        'Use webhook IDs for idempotency',
        'Return 200 status immediately',
        'Process webhook asynchronously',
        'Implement retry logic (exponential backoff)',
        'Log all webhook events',
        'Test with real payment gateway sandboxes',
      ],
    },
  });
}
