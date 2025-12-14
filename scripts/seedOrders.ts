/**
 * SEED ORDERS
 * Generates test order data for development and testing
 * 
 * Usage:
 * node -r ts-node/register scripts/seedOrders.ts --count 50
 */

import mongoose from 'mongoose';
import Order from '@/models/OrderModel';
import { connectDB } from '@/lib/mongodb';

const addresses = [
  {
    recipientName: 'Rajesh Kumar',
    phoneNumber: '9876543210',
    streetAddress: '123 MG Road, Brigade Gateway',
    city: 'Bangalore',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'India',
  },
  {
    recipientName: 'Priya Singh',
    phoneNumber: '9123456789',
    streetAddress: '456 Park Avenue',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
  },
  {
    recipientName: 'Ahmed Hassan',
    phoneNumber: '9988776655',
    streetAddress: '789 Connaught Place',
    city: 'Delhi',
    state: 'Delhi',
    postalCode: '110001',
    country: 'India',
  },
  {
    recipientName: 'Ananya Patel',
    phoneNumber: '9111223344',
    streetAddress: '321 Cyber Towers',
    city: 'Hyderabad',
    state: 'Telangana',
    postalCode: '500001',
    country: 'India',
  },
  {
    recipientName: 'Vikram Reddy',
    phoneNumber: '9999888877',
    streetAddress: '654 Marina Drive',
    city: 'Chennai',
    state: 'Tamil Nadu',
    postalCode: '600001',
    country: 'India',
  },
];

const products = [
  { title: 'Kurta', price: 1500, sku: 'KURTA-001' },
  { title: 'Sherwani', price: 5000, sku: 'SHERWANI-001' },
  { title: 'Thobe', price: 2500, sku: 'THOBE-001' },
  { title: 'Suit', price: 8000, sku: 'SUIT-001' },
  { title: 'Lehenga', price: 3500, sku: 'LEHENGA-001' },
];

const paymentMethods = ['cod', 'card', 'upi', 'wallet'];
const orderStatuses = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];

async function seedOrders() {
  try {
    await connectDB();

    // Parse count from command line
    const args = process.argv.slice(2);
    const count = args.includes('--count')
      ? parseInt(args[args.indexOf('--count') + 1])
      : 10;

    console.log(`📦 Generating ${count} sample orders...`);

    const orders = [];

    for (let i = 0; i < count; i++) {
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const items = [];
      let subtotal = 0;

      for (let j = 0; j < itemCount; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        const itemSubtotal = product.price * qty;
        subtotal += itemSubtotal;

        items.push({
          productId: new mongoose.Types.ObjectId(),
          variantSku: `${product.sku}-${qty}`,
          qty,
          price: product.price,
          subtotal: itemSubtotal,
        });
      }

      const tax = Math.round(subtotal * 0.18);
      const discount = Math.floor(Math.random() * 500);
      const shipping = subtotal > 5000 ? 0 : Math.floor(Math.random() * 200) + 50;
      const grandTotal = subtotal + tax - discount + shipping;

      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const orderStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];

      const address = addresses[Math.floor(Math.random() * addresses.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - daysAgo);

      const order = new Order({
        orderNumber: `ORD-${new Date().getFullYear()}-${String(i + 1).padStart(5, '0')}`,
        customerId: new mongoose.Types.ObjectId(),
        items,
        totals: {
          subtotal,
          tax,
          discount,
          shipping,
          grandTotal,
        },
        paymentStatus: orderStatus === 'delivered' || orderStatus === 'shipped' ? 'paid' : 'pending',
        orderStatus,
        paymentMethod: paymentMethod as any,
        address,
        timeline: [
          {
            actor: 'system',
            action: 'order.created',
            timestamp: createdDate,
            meta: { paymentMethod, totalItems: items.length },
          },
        ],
        createdAt: createdDate,
        updatedAt: createdDate,
      });

      // Add timeline events based on status
      if (orderStatus !== 'pending') {
        order.timeline.push({
          actor: 'system',
          action: 'order.confirmed',
          timestamp: new Date(createdDate.getTime() + 3600000),
          meta: { autoConfirmed: paymentMethod === 'cod' },
        });
      }

      if (orderStatus === 'packed' || orderStatus === 'shipped' || orderStatus === 'delivered') {
        order.timeline.push({
          actor: 'admin',
          action: 'order.packed',
          timestamp: new Date(createdDate.getTime() + 7200000),
        });
      }

      if (orderStatus === 'shipped' || orderStatus === 'delivered') {
        order.timeline.push({
          actor: 'system',
          action: 'shipment.created',
          timestamp: new Date(createdDate.getTime() + 10800000),
          meta: {
            shipmentId: new mongoose.Types.ObjectId(),
            trackingNumber: `TRK${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          },
        });
      }

      if (orderStatus === 'delivered') {
        order.timeline.push({
          actor: 'system',
          action: 'order.delivered',
          timestamp: new Date(createdDate.getTime() + 86400000),
        });
      }

      orders.push(order);
    }

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      await Order.insertMany(batch);
      console.log(`✅ Inserted ${Math.min(i + batchSize, orders.length)} orders`);
    }

    console.log(`\n📊 Seed Summary:`);
    console.log(`   Total orders: ${count}`);
    console.log(`   Payment methods: ${paymentMethods.join(', ')}`);
    console.log(`   Status distribution: ${orderStatuses.join(', ')}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding orders:', error);
    process.exit(1);
  }
}

seedOrders();
