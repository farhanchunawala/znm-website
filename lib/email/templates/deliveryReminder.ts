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

  const heading =
    reminderType === 'preDelivery'
      ? '📦 Your Order Arrives Tomorrow!'
      : '🎉 Your Order is Arriving Today!';

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
            <div style="font-weight: 600; color: #333; margin-bottom: 10px;">📍 Tracking Information</div>
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
            <div class="items-title">📦 Items in Your Order</div>
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
            <strong>💡 Delivery Tips:</strong>
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

${heading}

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
