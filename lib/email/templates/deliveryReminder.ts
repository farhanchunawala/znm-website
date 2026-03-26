interface DeliveryReminderData {
  customerName: string;
  orderNumber: string;
  trackingId: string;
  carrier: string;
  estimatedDeliveryDate: string;
  reminderType: 'preDelivery' | 'dayOfDelivery';
  orderTotal: number;
  items: Array<{ name: string; quantity: number }>;
}

const Icons = {
	Sparkles: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-left:5px;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`,
	Package: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:8px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
	MapPin: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:8px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
	Lightbulb: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:8px;"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/></svg>`
};

export default function deliveryReminderTemplate(data: DeliveryReminderData) {
  const {
    customerName,
    orderNumber,
    trackingId,
    carrier,
    estimatedDeliveryDate,
    reminderType,
    orderTotal,
    items,
  } = data;

  const subject =
    reminderType === 'preDelivery'
      ? `Your order ${orderNumber} arrives tomorrow!`
      : `Your order ${orderNumber} is arriving today!`;

  const headingText =
    reminderType === 'preDelivery'
      ? 'Your Order Arrives Tomorrow!'
      : 'Your Order is Arriving Today!';

  const heading =
    reminderType === 'preDelivery'
      ? `${Icons.Package} ${headingText}`
      : `${Icons.Sparkles} ${headingText}`;

  const message =
    reminderType === 'preDelivery'
      ? `Get ready! Your order <strong>${orderNumber}</strong> will arrive tomorrow.`
      : `Your order <strong>${orderNumber}</strong> is arriving today. Please make sure someone is available to receive it.`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f9f9f9;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 30px 20px;
        }
        .greeting {
          font-size: 16px;
          margin-bottom: 20px;
          color: #333;
        }
        .message {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin: 20px 0;
          padding: 15px;
          background-color: #f0f4ff;
          border-left: 4px solid #667eea;
          border-radius: 4px;
        }
        .tracking-section {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .tracking-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 10px 0;
        }
        .tracking-item {
          padding: 10px;
          background-color: white;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
        }
        .tracking-label {
          font-size: 12px;
          color: #999;
          text-transform: uppercase;
          font-weight: 600;
        }
        .tracking-value {
          font-size: 16px;
          color: #333;
          font-weight: 600;
          margin-top: 5px;
          word-break: break-all;
        }
        .items-section {
          margin: 20px 0;
        }
        .items-title {
          font-size: 14px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }
        .item:last-child {
          border-bottom: none;
        }
        .item-name {
          flex: 1;
          color: #333;
        }
        .item-qty {
          color: #999;
          text-align: right;
          margin-left: 10px;
        }
        .order-total {
          display: flex;
          justify-content: space-between;
          padding: 15px 0;
          margin-top: 15px;
          border-top: 2px solid #eee;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        .cta-section {
          text-align: center;
          margin: 30px 0;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 600;
          font-size: 16px;
          transition: transform 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
        .tips {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #856404;
        }
        .tips strong {
          display: block;
          margin-bottom: 8px;
          font-size: 15px;
        }
        .footer {
          background-color: #f9f9f9;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #eee;
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${heading}</h1>
        </div>

        <div class="content">
          <div class="greeting">
            Hi ${customerName},
          </div>

          <div class="message">
            ${message}
          </div>

          <div class="tracking-section">
            <div style="font-weight: 600; color: #333; margin-bottom: 10px;">${Icons.MapPin} Tracking Information</div>
            <div class="tracking-info">
              <div class="tracking-item">
                <div class="tracking-label">Tracking ID</div>
                <div class="tracking-value">${trackingId}</div>
              </div>
              <div class="tracking-item">
                <div class="tracking-label">Carrier</div>
                <div class="tracking-value">${carrier || 'Standard'}</div>
              </div>
              <div class="tracking-item">
                <div class="tracking-label">Estimated Delivery</div>
                <div class="tracking-value">${estimatedDeliveryDate}</div>
              </div>
              <div class="tracking-item">
                <div class="tracking-label">Order Number</div>
                <div class="tracking-value">${orderNumber}</div>
              </div>
            </div>
          </div>

          <div class="items-section">
            <div class="items-title">${Icons.Package} Items in Your Order</div>
            ${items
              .map(
                (item) => `
              <div class="item">
                <div class="item-name">${item.name}</div>
                <div class="item-qty">Qty: ${item.quantity}</div>
              </div>
            `
              )
              .join('')}
            <div class="order-total">
              <span>Order Total</span>
              <span>₹${orderTotal.toFixed(2)}</span>
            </div>
          </div>

          <div class="tips">
            <strong>${Icons.Lightbulb} Delivery Tips:</strong>
            <div>• Make sure your address is accessible</div>
            <div>• Keep your contact number available</div>
            <div>• Have ID proof ready for verification</div>
            <div>• Be present at the delivery address during the estimated time</div>
          </div>

          <div class="cta-section">
            <a href="#" class="cta-button">Track Your Order</a>
          </div>

          <div style="background-color: #f0f4ff; padding: 15px; border-radius: 4px; font-size: 14px; color: #333;">
            <strong>Need Help?</strong><br>
            If you have any questions about your delivery, please don't hesitate to contact our support team.
          </div>
        </div>

        <div class="footer">
          <p>This is an automated reminder from ZNM Store. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} ZNM Store. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${customerName},

${headingText}

${message}

TRACKING INFORMATION:
Tracking ID: ${trackingId}
Carrier: ${carrier || 'Standard'}
Estimated Delivery: ${estimatedDeliveryDate}
Order Number: ${orderNumber}

ITEMS IN YOUR ORDER:
${items.map((item) => `• ${item.name} (Qty: ${item.quantity})`).join('\n')}

Order Total: ₹${orderTotal.toFixed(2)}

DELIVERY TIPS:
• Make sure your address is accessible
• Keep your contact number available
• Have ID proof ready for verification
• Be present at the delivery address during the estimated time

Need Help?
If you have any questions about your delivery, please contact our support team.

---
This is an automated reminder from ZNM Store. Please do not reply to this email.
© ${new Date().getFullYear()} ZNM Store. All rights reserved.
  `;

  return { html, text };
}
