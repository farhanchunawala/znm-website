export const COUNTRY_CODES = [
    { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+974', country: 'Qatar', flag: '🇶🇦' },
    { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
    { code: '+968', country: 'Oman', flag: '🇴🇲' },
    { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+82', country: 'South Korea', flag: '🇰🇷' },
];

export function formatPhoneNumber(phoneCode: string, phoneNumber: string): string {
    // Remove any existing country code from phone number
    let cleanNumber = phoneNumber.replace(/^\+?\d{1,4}/, '').trim();

    // Remove any non-digit characters except +
    cleanNumber = cleanNumber.replace(/[^\d]/g, '');

    return `${phoneCode}${cleanNumber}`;
}

export function parsePhoneNumber(fullPhone: string): { phoneCode: string; phoneNumber: string } {
    // Try to extract country code
    const match = fullPhone.match(/^(\+\d{1,4})(.+)$/);

    if (match) {
        return {
            phoneCode: match[1],
            phoneNumber: match[2].replace(/[^\d]/g, ''),
        };
    }

    // Default to +91 if no country code found
    return {
        phoneCode: '+91',
        phoneNumber: fullPhone.replace(/[^\d]/g, ''),
    };
}

export function displayPhoneNumber(phoneCode: string, phoneNumber: string): string {
    return `${phoneCode} ${phoneNumber}`;
}
