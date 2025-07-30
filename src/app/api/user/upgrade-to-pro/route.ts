// This file is deprecated. The upgrade logic has been moved to /api/payment/verify for security.
// The file is kept to avoid breaking any old client versions but should be removed in the future.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    console.warn("DEPRECATED: /api/user/upgrade-to-pro endpoint was called. User upgrades should go through /api/payment/verify.");
    return NextResponse.json(
        { error: "This endpoint is deprecated. Please use the new payment verification flow." },
        { status: 410 } // 410 Gone
    );
}
