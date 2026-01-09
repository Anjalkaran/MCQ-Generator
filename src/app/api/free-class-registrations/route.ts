
import { NextResponse } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase-admin'; // Use admin SDK for server-side
import { FreeClassRegistration } from '@/lib/types';
import { normalizeDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const db = getFirebaseDb();
        const snapshot = await db.collection('freeClassRegistrations').orderBy('registeredAt', 'desc').get();
        
        if (snapshot.empty) {
            return NextResponse.json({ registrations: [] });
        }
        
        const registrations: FreeClassRegistration[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                registeredAt: normalizeDate(data.registeredAt) || new Date(0),
            } as FreeClassRegistration;
        });

        return NextResponse.json({ registrations });

    } catch (error: any) {
        console.error('API Error fetching registrations:', error);
        return NextResponse.json({ error: 'Failed to fetch registrations.' }, { status: 500 });
    }
}
