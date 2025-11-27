import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();

        const deletedCustomer = await Customer.findByIdAndDelete(params.id);

        if (!deletedCustomer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error: any) {
        console.error('Failed to delete customer:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
