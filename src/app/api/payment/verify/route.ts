
'use server';

import { NextRequest, NextResponse } from 'next/server';

// This webhook is no longer the primary method for upgrading users.
// The upgrade now happens via a direct API call from the client in /api/user/upgrade-to-pro
// This file is kept to avoid breaking any existing Razorpay webhook configurations,
// but its logic for upgrading users is removed.

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    console.log("Payment verification webhook called, but is now deprecated. User upgrade is handled client-side.");
    return NextResponse.json({ status: 'ignored', message: 'This webhook is deprecated.' });
}
