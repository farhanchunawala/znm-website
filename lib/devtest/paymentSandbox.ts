import crypto from 'crypto';

/**
 * Payment Sandbox Layer
 * Mocks payment gateways (Razorpay & Stripe) for testing
 */

export interface SandboxPaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  customerId: string;
  email: string;
  phone: string;
  notes?: Record<string, any>;
  scenario?: 'success' | 'failure' | 'timeout' | 'webhook' | 'signature' | 'idempotency' | 'duplicate';
}

export interface SandboxPaymentResponse {
  status: 'created' | 'pending' | 'authorized' | 'captured' | 'failed' | 'timeout';
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  gatewayResponse: Record<string, any>;
  signature?: string;
  webhookPayload?: Record<string, any>;
  error?: {
    code: string;
    message: string;
  };
}

export interface WebhookTestPayload {
  event: 'payment.authorized' | 'payment.failed' | 'payment.captured' | 'refund.created' | 'refund.failed';
  timestamp: number;
  paymentId: string;
  orderId: string;
  amount: number;
  status: string;
  signature: string;
}

/**
 * Razorpay Sandbox
 */
export class RazorpaySandbox {
  private static readonly SECRET = process.env.RAZORPAY_KEY_SECRET || 'sandbox_secret_key';
  private static readonly KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_sandbox';
  
  /**
   * Create order (initiates payment)
   */
  static async createOrder(request: SandboxPaymentRequest): Promise<SandboxPaymentResponse> {
    const paymentId = `rzp_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate different scenarios
    if (request.scenario === 'failure') {
      return {
        status: 'failed',
        paymentId,
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency,
        gatewayResponse: {
          id: paymentId,
          entity: 'payment',
          status: 'failed',
          reason_code: 'payment_failed',
        },
        error: {
          code: 'PAYMENT_FAILED',
          message: 'Payment declined by gateway',
        },
      };
    }
    
    if (request.scenario === 'timeout') {
      // Simulate timeout by returning pending
      return {
        status: 'pending',
        paymentId,
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency,
        gatewayResponse: {
          id: paymentId,
          entity: 'payment',
          status: 'pending',
        },
      };
    }
    
    // Default: success scenario
    return {
      status: 'authorized',
      paymentId,
      orderId: request.orderId,
      amount: request.amount,
      currency: request.currency,
      gatewayResponse: {
        id: paymentId,
        entity: 'payment',
        amount: request.amount,
        currency: request.currency,
        status: 'authorized',
        method: 'netbanking',
        description: 'Test payment',
        amount_refunded: 0,
        refund_status: null,
        captured: true,
        description: 'Test payment from sandbox',
        card_id: null,
        bank: null,
        wallet: null,
        vpa: null,
        email: request.email,
        contact: request.phone,
        notes: request.notes || {},
        acquirer_data: {
          auth_code: 'sandbox_auth_code',
        },
        created_at: Math.floor(Date.now() / 1000),
      },
    };
  }
  
  /**
   * Verify payment signature (HMAC SHA256)
   */
  static verifySignature(
    paymentId: string,
    orderId: string,
    signature: string
  ): boolean {
    // Construct the message to verify
    const message = `${orderId}|${paymentId}`;
    
    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', this.SECRET)
      .update(message)
      .digest('hex');
    
    return signature === expectedSignature;
  }
  
  /**
   * Generate signature (for testing webhook)
   */
  static generateSignature(paymentId: string, orderId: string): string {
    const message = `${orderId}|${paymentId}`;
    return crypto
      .createHmac('sha256', this.SECRET)
      .update(message)
      .digest('hex');
  }
  
  /**
   * Capture payment
   */
  static async capturePayment(paymentId: string, amount: number): Promise<SandboxPaymentResponse> {
    return {
      status: 'captured',
      paymentId,
      orderId: paymentId.split('_')[2], // Extract from paymentId for testing
      amount,
      currency: 'INR',
      gatewayResponse: {
        id: paymentId,
        entity: 'payment',
        status: 'captured',
        amount_refunded: 0,
        refund_status: null,
      },
    };
  }
  
  /**
   * Create webhook test payload
   */
  static createWebhookPayload(
    event: 'payment.authorized' | 'payment.captured' | 'payment.failed',
    paymentId: string,
    orderId: string,
    amount: number
  ): WebhookTestPayload {
    const payload: WebhookTestPayload = {
      event,
      timestamp: Math.floor(Date.now() / 1000),
      paymentId,
      orderId,
      amount,
      status: event === 'payment.failed' ? 'failed' : 'captured',
      signature: '',
    };
    
    // Generate signature for webhook
    const message = JSON.stringify(payload);
    payload.signature = crypto
      .createHmac('sha256', this.SECRET)
      .update(message)
      .digest('hex');
    
    return payload;
  }
}

/**
 * Stripe Sandbox
 */
export class StripeSandbox {
  private static readonly SECRET = process.env.STRIPE_SECRET_KEY || 'sk_test_sandbox_secret';
  private static readonly PUBLISHABLE = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_sandbox';
  
  /**
   * Create payment intent
   */
  static async createPaymentIntent(request: SandboxPaymentRequest): Promise<SandboxPaymentResponse> {
    const paymentId = `pi_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate different scenarios
    if (request.scenario === 'failure') {
      return {
        status: 'failed',
        paymentId,
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency,
        gatewayResponse: {
          id: paymentId,
          object: 'payment_intent',
          status: 'requires_payment_method',
          last_payment_error: {
            code: 'card_declined',
            message: 'Your card was declined',
          },
        },
        error: {
          code: 'CARD_DECLINED',
          message: 'Your card was declined',
        },
      };
    }
    
    if (request.scenario === 'timeout') {
      return {
        status: 'pending',
        paymentId,
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency,
        gatewayResponse: {
          id: paymentId,
          object: 'payment_intent',
          status: 'processing',
        },
      };
    }
    
    // Default: success scenario
    return {
      status: 'authorized',
      paymentId,
      orderId: request.orderId,
      amount: request.amount,
      currency: request.currency,
      gatewayResponse: {
        id: paymentId,
        object: 'payment_intent',
        amount: request.amount,
        amount_capturable: request.amount,
        amount_received: 0,
        capture_method: 'automatic',
        charges: {
          object: 'list',
          data: [],
          has_more: false,
          total_count: 0,
          url: `/v1/charges?payment_intent=${paymentId}`,
        },
        client_secret: `${paymentId}_secret_${Math.random().toString(36).substr(2, 9)}`,
        confirmation_method: 'automatic',
        created: Math.floor(Date.now() / 1000),
        currency: request.currency.toLowerCase(),
        customer: null,
        description: 'Test payment',
        last_payment_error: null,
        livemode: false,
        metadata: {
          order_id: request.orderId,
        },
        next_action: null,
        on_behalf_of: null,
        payment_method: null,
        payment_method_types: ['card'],
        receipt_email: request.email,
        setup_future_usage: null,
        shipping: null,
        statement_descriptor: null,
        status: 'succeeded',
        transfer_data: null,
        transfer_group: null,
      },
    };
  }
  
  /**
   * Verify webhook signature (Stripe's method)
   */
  static verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    const timestamp = signature.split(',')[0].split('=')[1];
    const hash = signature.split(',')[1].split('=')[1];
    
    const signedContent = `${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret || this.SECRET)
      .update(signedContent)
      .digest('hex');
    
    return hash === expectedSignature;
  }
  
  /**
   * Generate webhook signature
   */
  static generateWebhookSignature(body: string, timestamp: number, secret?: string): string {
    const signedContent = `${timestamp}.${body}`;
    const hash = crypto
      .createHmac('sha256', secret || this.SECRET)
      .update(signedContent)
      .digest('hex');
    
    return `t=${timestamp},v1=${hash}`;
  }
  
  /**
   * Create webhook test payload
   */
  static createWebhookPayload(
    event: 'payment_intent.succeeded' | 'payment_intent.payment_failed' | 'charge.refunded',
    paymentId: string,
    orderId: string,
    amount: number
  ): Record<string, any> {
    const timestamp = Math.floor(Date.now() / 1000);
    
    return {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      api_version: '2023-10-16',
      created: timestamp,
      data: {
        object: {
          id: paymentId,
          object: event.includes('payment_intent') ? 'payment_intent' : 'charge',
          amount: amount,
          amount_capturable: 0,
          amount_received: amount,
          status: event === 'payment_intent.payment_failed' ? 'requires_payment_method' : 'succeeded',
          currency: 'inr',
          customer: null,
          description: 'Test payment',
          receipt_email: null,
          metadata: {
            order_id: orderId,
          },
          created: timestamp,
        },
      },
      livemode: false,
      pending_webhooks: 0,
      request: {
        id: null,
        idempotency_key: null,
      },
      type: event,
    };
  }
}

/**
 * Generic Sandbox Utilities
 */
export class PaymentSandbox {
  /**
   * Simulate payment with scenario
   */
  static async simulatePayment(
    gateway: 'razorpay' | 'stripe',
    request: SandboxPaymentRequest
  ): Promise<SandboxPaymentResponse> {
    if (gateway === 'razorpay') {
      return RazorpaySandbox.createOrder(request);
    } else if (gateway === 'stripe') {
      return StripeSandbox.createPaymentIntent(request);
    }
    
    throw new Error(`Unknown gateway: ${gateway}`);
  }
  
  /**
   * Test webhook simulation
   */
  static async simulateWebhook(
    gateway: 'razorpay' | 'stripe',
    event: string,
    paymentId: string,
    orderId: string,
    amount: number
  ): Promise<{
    payload: Record<string, any>;
    signature: string;
  }> {
    if (gateway === 'razorpay') {
      const payload = RazorpaySandbox.createWebhookPayload(
        event as any,
        paymentId,
        orderId,
        amount
      );
      
      return {
        payload,
        signature: payload.signature,
      };
    } else if (gateway === 'stripe') {
      const payload = StripeSandbox.createWebhookPayload(
        event as any,
        paymentId,
        orderId,
        amount
      );
      
      const body = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = StripeSandbox.generateWebhookSignature(body, timestamp);
      
      return {
        payload,
        signature,
      };
    }
    
    throw new Error(`Unknown gateway: ${gateway}`);
  }
  
  /**
   * Test idempotency key uniqueness
   */
  static generateIdempotencyKey(prefix: string = 'test'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Test duplicate webhook handling
   */
  static generateDuplicateWebhookId(originalId: string): string {
    return `${originalId}_duplicate_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Simulate payment flow with all lifecycle events
   */
  static async simulateCompletePaymentFlow(
    gateway: 'razorpay' | 'stripe',
    orderId: string,
    amount: number
  ): Promise<{
    createResponse: SandboxPaymentResponse;
    webhooks: Array<{
      event: string;
      payload: Record<string, any>;
      signature: string;
    }>;
  }> {
    // Step 1: Create payment
    const createResponse = await this.simulatePayment(gateway, {
      orderId,
      amount,
      currency: 'INR',
      customerId: `cust_test_${Date.now()}`,
      email: 'test@example.com',
      phone: '+919999999999',
      scenario: 'success',
    });
    
    if (createResponse.status === 'failed') {
      return {
        createResponse,
        webhooks: [],
      };
    }
    
    // Step 2: Generate webhooks
    const webhooks = [];
    
    if (gateway === 'razorpay') {
      // Razorpay: authorized -> captured
      const authorizedWebhook = await this.simulateWebhook(
        'razorpay',
        'payment.authorized',
        createResponse.paymentId,
        orderId,
        amount
      );
      webhooks.push({
        event: 'payment.authorized',
        ...authorizedWebhook,
      });
      
      const capturedWebhook = await this.simulateWebhook(
        'razorpay',
        'payment.captured',
        createResponse.paymentId,
        orderId,
        amount
      );
      webhooks.push({
        event: 'payment.captured',
        ...capturedWebhook,
      });
    } else {
      // Stripe: payment_intent.succeeded
      const succeededWebhook = await this.simulateWebhook(
        'stripe',
        'payment_intent.succeeded',
        createResponse.paymentId,
        orderId,
        amount
      );
      webhooks.push({
        event: 'payment_intent.succeeded',
        ...succeededWebhook,
      });
    }
    
    return {
      createResponse,
      webhooks,
    };
  }
}

export default PaymentSandbox;
