import mongoose, { Schema } from 'mongoose';
import AutoIncrement from 'mongoose-sequence';

const InquirySchema = new mongoose.Schema(
	{
		inquiryId: { type: Number, unique: true },
		name: String,
		mobileNo: Number,
		email: String,
		message: String,
	},
	{ timestamps: true }
);

InquirySchema.plugin(AutoIncrement(mongoose), { inc_field: 'inquiryId' });

// const Inquiry = mongoose.models.Inquiry || mongoose.model('Inquiry', InquirySchema);
const Inquiry = mongoose.models.Inquiry || mongoose.model('Inquiry', InquirySchema, 'inquiries');
// const Inquiry = mongoose.model('Inquiry', InquirySchema, 'inquiries');

export default Inquiry;
