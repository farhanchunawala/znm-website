import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/UserModel';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const user = await User.findById(currentUser.userId);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Generate referral code if not exists
        if (!user.referralCode) {
            user.referralCode = `REF${user.userId}${Date.now().toString(36).toUpperCase()}`;
            await user.save();
        }

        return NextResponse.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                birthdate: user.birthdate,
                birthdateLastChanged: user.birthdateLastChanged,
                referralCode: user.referralCode,
                customerId: user.customerId,
                offers: user.offers || [],
            },
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { username, phone, birthdate } = body;

        await dbConnect();
        const user = await User.findById(currentUser.userId);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Update username
        if (username !== undefined) {
            user.name.firstName = username;
        }

        // Update phone
        if (phone !== undefined) {
            // Check if phone is already taken by another user
            if (phone) {
                const existingUser = await User.findOne({ phone, _id: { $ne: user._id } });
                if (existingUser) {
                    return NextResponse.json({ error: 'Phone number already in use' }, { status: 409 });
                }
            }
            user.phone = phone;
        }

        // Update birthdate (with once-per-year restriction)
        if (birthdate !== undefined) {
            const canChange = !user.birthdateLastChanged ||
                new Date(user.birthdateLastChanged).getTime() < Date.now() - 365 * 24 * 60 * 60 * 1000;

            if (!canChange) {
                return NextResponse.json(
                    { error: 'Birthdate can only be changed once per year' },
                    { status: 400 }
                );
            }

            user.birthdate = new Date(birthdate);
            user.birthdateLastChanged = new Date();

            // Generate birthday offer if birthdate is set
            const birthdayOffer = {
                code: `BDAY${user.userId}${new Date().getFullYear()}`,
                type: 'birthday',
                description: 'Special birthday discount - 15% off your next purchase',
                expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                claimed: false,
            };

            if (!user.offers) {
                user.offers = [];
            }

            // Remove old birthday offers
            user.offers = user.offers.filter((offer: any) => offer.type !== 'birthday');
            user.offers.push(birthdayOffer);
        }

        await user.save();

        return NextResponse.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                birthdate: user.birthdate,
                birthdateLastChanged: user.birthdateLastChanged,
                referralCode: user.referralCode,
                offers: user.offers,
            },
        });
    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
