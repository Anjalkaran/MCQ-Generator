
import { NextRequest, NextResponse } from 'next/server';
import { getFreeClassRegistrations } from '@/lib/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const registrations = await getFreeClassRegistrations();
        return NextResponse.json({ registrations });
    } catch (error: any) {
        console.error("Error fetching free class registrations:", error);
        return NextResponse.json({ error: 'Failed to fetch registration data.' }, { status: 500 });
    }
}
