import mongoose from 'mongoose';

const NewsletterSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true },
        subscribedAt: { type: Date, default: Date.now },
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Newsletter = mongoose.models.Newsletter || mongoose.model('Newsletter', NewsletterSchema, 'newsletters');

export default Newsletter;
