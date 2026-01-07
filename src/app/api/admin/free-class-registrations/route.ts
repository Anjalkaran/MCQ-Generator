
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { FreeClassRegistration } from '@/lib/types';
import { normalizeDate } from '@/lib/utils';
import { format } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    try {
        const registrationsRef = adminDb.collection('freeClassRegistrations');
        // Fetch all documents without sorting at the DB level to avoid errors on missing fields
        const snapshot = await registrationsRef.get();
        
        let registrations = snapshot.docs.map(doc => {
            const data = doc.data();
            // Safely normalize the date, providing a default for sorting if it's missing.
            const registeredAt = normalizeDate(data.registeredAt) || new Date(0); 
            return {
                id: doc.id,
                ...data,
                registeredAt, // Keep it as a Date object for sorting
            } as FreeClassRegistration;
        });

        // Perform the sort in code, which is safer and more robust.
        registrations.sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());
        
        // Now format the date for the client
        const formattedRegistrations = registrations.map(reg => ({
            ...reg,
            registeredAt: format(reg.registeredAt, "dd/MM/yyyy p")
        }));
        
        return NextResponse.json({ registrations: formattedRegistrations });

    } catch (error: any) {
        console.error("Error fetching free class registrations:", error);
        return NextResponse.json({ error: 'Failed to fetch registration data.' }, { status: 500 });
    }
}
