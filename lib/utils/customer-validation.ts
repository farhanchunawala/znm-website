import crypto from 'crypto';
import type { IAddress } from '@/models/CustomerModel';

/**
 * Normalize phone to E.164 format
 */
export function normalizePhone(phone: string): string {
	if (!phone) return phone;

	// Remove all non-digit characters except leading +
	let normalized = phone.replace(/[^\d+]/g, '');

	// Add + if not present and starts with country code
	if (!normalized.startsWith('+') && normalized.length > 10) {
		normalized = '+' + normalized;
	}

	// Default to India (+91) if no country code
	if (!normalized.startsWith('+')) {
		normalized = '+91' + normalized;
	}

	return normalized;
}

/**
 * Canonicalize tag: lowercase, slug-safe
 */
export function canonicalizeTag(tag: string): string {
	return tag
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9-_]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Validate address fields
 */
export function validateAddress(address: any): Record<string, string> | null {
	const errors: Record<string, string> = {};

	if (!address.name) errors.name = 'Name is required';
	if (!address.phone) errors.phone = 'Phone is required';
	if (!address.pincode) errors.pincode = 'Pincode is required';
	if (!address.state) errors.state = 'State is required';
	if (!address.city) errors.city = 'City is required';
	if (!address.locality) errors.locality = 'Locality is required';
	if (!address.addressLine1)
		errors.addressLine1 = 'Address line 1 is required';

	// Validate pincode format (6 digits for India)
	if (address.pincode && !/^\d{6}$/.test(address.pincode)) {
		errors.pincode = 'Invalid pincode format (6 digits required)';
	}

	// Validate phone
	if (address.phone) {
		try {
			normalizePhone(address.phone);
		} catch (e) {
			errors.phone = 'Invalid phone format';
		}
	}

	return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Hash address for deduplication
 */
export function hashAddress(address: IAddress): string {
	const normalized = [
		address.pincode,
		address.city.toLowerCase(),
		address.locality.toLowerCase(),
		address.addressLine1.toLowerCase().replace(/[^a-z0-9]/g, ''),
	].join('|');

	return crypto.createHash('md5').update(normalized).digest('hex');
}
