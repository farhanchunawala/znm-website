import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/GroupModel';

// GET - List all groups
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'customer' or 'order'

        const query = type ? { type } : {};
        const groups = await Group.find(query).sort({ createdAt: -1 }).lean();

        return NextResponse.json({ groups });
    } catch (error) {
        console.error('Failed to fetch groups:', error);
        return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }
}

// POST - Create new group
export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const { name, type, color, description } = await request.json();

        if (!name || !type) {
            return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
        }

        if (!['customer', 'order'].includes(type)) {
            return NextResponse.json({ error: 'Type must be customer or order' }, { status: 400 });
        }

        const newGroup = new Group({
            name,
            type,
            color: color || '#000000',
            description,
        });

        await newGroup.save();

        return NextResponse.json({ success: true, group: newGroup });
    } catch (error) {
        console.error('Failed to create group:', error);
        return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }
}
