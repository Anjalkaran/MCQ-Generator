
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { MCQHistory } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

export async function GET(
  req: NextRequest,
  { params }: { params: { testId: string } }
) {
  if (!adminDb) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const { testId } = params;
    if (!testId) {
      return NextResponse.json({ error: 'Test ID is required.' }, { status: 400 });
    }

    const historyRef = adminDb.collection('mcqHistory');
    const q = historyRef.where('liveTestId', '==', testId);
    
    const snapshot = await q.get();

    if (snapshot.empty) {
        return NextResponse.json({ testId, participantCount: 0 });
    }
    
    // Get unique user IDs to get an accurate participant count
    const uniqueUserIds = new Set(snapshot.docs.map(doc => (doc.data() as MCQHistory).userId));
    const participantCount = uniqueUserIds.size;

    return NextResponse.json({ testId, participantCount });

  } catch (error: any) {
    console.error("Error fetching live test participant count:", error);
    return NextResponse.json({ error: 'Failed to fetch participant count.' }, { status: 500 });
  }
}
