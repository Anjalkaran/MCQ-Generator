
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { FreeClassRegistration } from '@/lib/types';
import { normalizeDate } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    try {
        const registrationsRef = adminDb.collection('freeClassRegistrations');
        const snapshot = await registrationsRef.orderBy('registeredAt', 'desc').get();
        
        const registrations = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                registeredAt: normalizeDate(data.registeredAt) || new Date(),
            } as FreeClassRegistration;
        });
        
        return NextResponse.json({ registrations });

    } catch (error: any) {
        console.error("Error fetching free class registrations:", error);
        return NextResponse.json({ error: 'Failed to fetch registration data.' }, { status: 500 });
    }
}
