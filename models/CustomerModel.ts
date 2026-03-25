import mongoose, { Schema, Document } from 'mongoose';

export interface IAddress {
	id: string;
	label: 'home' | 'work' | 'other';
	name: string;
	phone: string;
	pincode: string;
	state: string;
	city: string;
	locality: string;
	addressLine1: string;
	addressLine2?: string;
	coords?: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
	isDefault: boolean;
	createdAt: Date;
}

export interface IMeasurements {
	shirt?: Record<string, string | number>;
	pant?: Record<string, string | number>;
	kurta?: Record<string, string | number>;
	suit?: Record<string, string | number>;
	notes?: string;
}

export interface ICustomer extends Document {
	customerId?: string; // Legacy field - keep for backward compatibility
	userId?: mongoose.Types.ObjectId; // Link to User account
	email?: string;
	emails?: string[];
	phone?: string;
	phoneCode?: string;
	name: string;
	firstName?: string;
	lastName?: string;
	dob?: Date;
	gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
	status: 'active' | 'inactive' | 'merged';
	archived?: boolean;
	archivedAt?: Date;
	tags: string[];
	addresses: IAddress[];
	measurements?: IMeasurements;
	primaryAddressId?: string;
	address?: string;
	city?: string;
	state?: string;
	country?: string;
	zipCode?: string;
	meta?: Record<string, any>;
	lastOrderAt?: Date;
	mergedInto?: mongoose.Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
	{
		id: { type: String, required: true },
		label: {
			type: String,
			enum: ['home', 'work', 'other'],
			default: 'home',
		},
		name: { type: String, required: true },
		phone: { type: String, required: true },
		pincode: { type: String, required: true, index: true },
		state: { type: String, required: true },
		city: { type: String, required: true },
		locality: { type: String, required: true },
		addressLine1: { type: String, required: true },
		addressLine2: String,
		coords: {
			type: { type: String, enum: ['Point'] },
			coordinates: { type: [Number], index: '2dsphere' },
		},
		isDefault: { type: Boolean, default: false },
		createdAt: { type: Date, default: Date.now },
	},
	{ _id: false }
);

const MeasurementsSchema = new Schema<IMeasurements>(
	{
		shirt: { type: Schema.Types.Mixed, default: {} },
		pant: { type: Schema.Types.Mixed, default: {} },
		kurta: { type: Schema.Types.Mixed, default: {} },
		suit: { type: Schema.Types.Mixed, default: {} },
		notes: { type: String, default: '' },
	},
	{ _id: false }
);

const CustomerSchema = new Schema<ICustomer>(
	{
		customerId: { type: String, unique: true, sparse: true }, // Legacy field
		userId: { type: Schema.Types.ObjectId, ref: 'User' }, // Link to User account
		email: {
			type: String,
			lowercase: true,
			trim: true,
			sparse: true,
			unique: true,
			validate: {
				validator: (v: string) =>
					!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
				message: 'Invalid email format',
			},
		},
		emails: { type: [String], default: [] },
		phone: {
			type: String,
			sparse: true,
			unique: true,
			index: true,
		},
		phoneCode: { type: String, default: '+91' },
		name: { type: String, required: true, index: 'text' },
		firstName: { type: String, index: 'text' },
		lastName: { type: String, index: 'text' },
		dob: Date,
		gender: {
			type: String,
			enum: ['male', 'female', 'other', 'prefer_not_to_say'],
		},
		status: {
			type: String,
			enum: ['active', 'inactive', 'merged'],
			default: 'active',
			index: true,
		},
		archived: { type: Boolean, default: false, index: true },
		archivedAt: Date,
		tags: { type: [String], default: [], index: true },
		addresses: { type: [AddressSchema], default: [] },
		measurements: { type: MeasurementsSchema, default: () => ({ shirt: {}, pant: {}, kurta: {}, suit: {}, notes: '' }) },
		primaryAddressId: String,
		address: String,
		city: String,
		state: String,
		country: String,
		zipCode: String,
		meta: Schema.Types.Mixed,
		lastOrderAt: { type: Date, index: true },
		mergedInto: { type: Schema.Types.ObjectId, ref: 'Customer' },
		createdAt: { type: Date, default: Date.now },
		updatedAt: { type: Date, default: Date.now },
	},
	{ timestamps: true }
);

// Compound indexes for analytics and filtering
CustomerSchema.index({ status: 1, lastOrderAt: -1 });
CustomerSchema.index({ tags: 1, status: 1 });
CustomerSchema.index({ createdAt: -1 });

// Text index for search
CustomerSchema.index({
	name: 'text',
	email: 'text',
	phone: 'text',
	tags: 'text',
	'addresses.locality': 'text',
});

// Pre-save hook to update timestamps and normalize
CustomerSchema.pre('save', async function (next) {
	this.updatedAt = new Date();
	if (this.email) this.email = this.email.toLowerCase().trim();
	if (this.phone) {
		const { normalizePhone } = await import(
			'@/lib/utils/customer-validation'
		);
		this.phone = normalizePhone(this.phone);
	}
	if (this.tags && this.tags.length > 0) {
		const { canonicalizeTag } = await import(
			'@/lib/utils/customer-validation'
		);
		this.tags = [...new Set(this.tags.map(canonicalizeTag))];
	}
	next();
});

const Customer =
	mongoose.models.Customer ||
	mongoose.model<ICustomer>('Customer', CustomerSchema, 'customers');

export default Customer;
