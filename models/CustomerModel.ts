import mongoose, { Schema } from 'mongoose';

const CustomerSchema = new mongoose.Schema(
    {
        customerId: { type: String, unique: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User' }, // Links to User account
        email: { type: String, required: true }, // Primary email address
        emails: { type: [String], default: [] }, // Array to support multiple emails
        phoneCode: String, // Country code like +91, +1, etc.
        phone: { type: String, unique: true, required: true }, // Primary identifier (full number with code)
        firstName: String,
        lastName: String,
        address: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
        groups: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
        archived: { type: Boolean, default: false },
        archivedAt: Date,
    },
    { timestamps: true }
);

const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema, 'customers');
export default Customer;
