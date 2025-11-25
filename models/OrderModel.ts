import mongoose, { Schema } from 'mongoose';

const OrderSchema = new mongoose.Schema(
    {
        orderId: { type: String, unique: true },
        customerId: { type: String, required: true },
        items: [
            {
                id: String,
                title: String,
                price: Number,
                quantity: Number,
                size: String,
                image: String,
            },
        ],
        shippingInfo: {
            email: String,
            firstName: String,
            lastName: String,
            address: String,
            city: String,
            state: String,
            country: String,
            zipCode: String,
            phone: String,
        },
        total: Number,
        paymentStatus: { type: String, enum: ['prepaid', 'unpaid'], default: 'unpaid' },
        archived: { type: Boolean, default: false },
        archivedAt: Date,
    },
    { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema, 'orders');
export default Order;
