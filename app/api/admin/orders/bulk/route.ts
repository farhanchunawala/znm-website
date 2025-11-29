import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/OrderModel';

// POST - Bulk operations for orders
export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const { ids, action, groupId } = await request.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
        }

        if (!action) {
            return NextResponse.json({ error: 'Action is required' }, { status: 400 });
        }

        let result;

        switch (action) {
            case 'delete':
                result = await Order.deleteMany({ _id: { $in: ids } });
                break;

            case 'archive':
                result = await Order.updateMany(
                    { _id: { $in: ids } },
                    { $set: { archived: true, archivedAt: new Date() } }
                );
                break;

            case 'unarchive':
                result = await Order.updateMany(
                    { _id: { $in: ids } },
                    { $set: { archived: false, archivedAt: null } }
                );
                break;

            case 'addToGroup':
                if (!groupId) {
                    return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
                }
                result = await Order.updateMany(
                    { _id: { $in: ids } },
                    { $addToSet: { groups: groupId } }
                );
                break;

            case 'removeFromGroup':
                if (!groupId) {
                    return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
                }
                result = await Order.updateMany(
                    { _id: { $in: ids } },
                    { $pull: { groups: groupId } }
                );
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            modified: result.modifiedCount || result.deletedCount || 0,
        });
    } catch (error) {
        console.error('Bulk operation failed:', error);
        return NextResponse.json({ error: 'Bulk operation failed' }, { status: 500 });
    }
}
