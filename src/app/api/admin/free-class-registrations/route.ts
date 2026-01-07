
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
        // Removed the orderBy clause to prevent crashes on documents without the field.
        const snapshot = await registrationsRef.get();
        
        let registrations = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Safely normalize the date, providing a default if it's missing.
                registeredAt: normalizeDate(data.registeredAt) || new Date(0), 
            } as FreeClassRegistration;
        });

        // Sort the results in code to ensure stability.
        registrations.sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());
        
        return NextResponse.json({ registrations });

    } catch (error: any) {
        console.error("Error fetching free class registrations:", error);
        return NextResponse.json({ error: 'Failed to fetch registration data.' }, { status: 500 });
    }
}
