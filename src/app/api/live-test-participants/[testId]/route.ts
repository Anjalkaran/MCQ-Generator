
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

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
    
    // Using .count() for efficiency. This doesn't retrieve all documents.
    const snapshot = await q.count().get();
    const participantCount = snapshot.data().count;

    return NextResponse.json({ testId, participantCount });

  } catch (error: any) {
    console.error("Error fetching live test participant count:", error);
    return NextResponse.json({ error: 'Failed to fetch participant count.' }, { status: 500 });
  }
}
