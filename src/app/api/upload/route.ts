
import { NextRequest, NextResponse } from 'next/server';

// This entire route is deprecated and replaced by /api/study-material/upload and /api/topic-mcq-bank/upload
// It is kept to avoid breaking older client versions but can be removed in the future.

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    console.warn("DEPRECATED: /api/upload endpoint was called. This has been replaced by more specific upload endpoints.");
    return NextResponse.json({ 
        error: "This API endpoint is deprecated. Please use the new version of the application." 
    }, { status: 410 }); // 410 Gone
}

    