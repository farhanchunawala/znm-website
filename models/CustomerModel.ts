import mongoose, { Schema } from 'mongoose';

const CustomerSchema = new mongoose.Schema(
    {
        customerId: { type: String, unique: true },
        email: { type: String, unique: true, sparse: true },
        phone: { type: String, unique: true, sparse: true },
        firstName: String,
        lastName: String,
        address: String,
        city: String,
        state: String,
        zipCode: String,
    },
    { timestamps: true }
);

const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema, 'customers');
export default Customer;
