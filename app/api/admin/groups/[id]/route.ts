import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/GroupModel';

// PUT - Update group
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();

        const { name, color, description } = await request.json();
        const { id } = params;

        const updatedGroup = await Group.findByIdAndUpdate(
            id,
            { name, color, description },
            { new: true, runValidators: true }
        );

        if (!updatedGroup) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, group: updatedGroup });
    } catch (error) {
        console.error('Failed to update group:', error);
        return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }
}

// DELETE - Delete group
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();

        const { id } = params;

        const deletedGroup = await Group.findByIdAndDelete(id);

        if (!deletedGroup) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete group:', error);
        return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
    }
}
