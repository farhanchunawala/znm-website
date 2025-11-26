import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Shipment from '@/models/ShipmentModel';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const { ids, action, groupId, updates } = await request.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
        }

        if (!action) {
            return NextResponse.json({ error: 'Action is required' }, { status: 400 });
        }

        let result;

        switch (action) {
            case 'delete':
                result = await Shipment.deleteMany({ _id: { $in: ids } });
                break;

            case 'archive':
                result = await Shipment.updateMany(
                    { _id: { $in: ids } },
                    { $set: { archived: true, archivedAt: new Date() } }
                );
                break;

            case 'unarchive':
                result = await Shipment.updateMany(
                    { _id: { $in: ids } },
                    { $set: { archived: false, archivedAt: null } }
                );
                break;

            case 'addToGroup':
                if (!groupId) {
                    return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
                }
                result = await Shipment.updateMany(
                    { _id: { $in: ids } },
                    { $addToSet: { groups: groupId } }
                );
                break;

            case 'removeFromGroup':
                if (!groupId) {
                    return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
                }
                result = await Shipment.updateMany(
                    { _id: { $in: ids } },
                    { $pull: { groups: groupId } }
                );
                break;

            case 'bulkEdit':
                if (!updates) {
                    return NextResponse.json({ error: 'Updates are required for bulk edit' }, { status: 400 });
                }
                result = await Shipment.updateMany(
                    { _id: { $in: ids } },
                    { $set: updates }
                );
                break;

            case 'export':
                const shipments = await Shipment.find({ _id: { $in: ids } })
                    .populate('orderId')
                    .populate('customerId')
                    .lean();
                return NextResponse.json({ shipments });

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
