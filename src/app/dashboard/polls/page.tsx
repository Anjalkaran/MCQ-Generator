
"use client";

import { PollClient } from '@/components/polls/poll-client';

export default function PollsPage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Polls</h1>
                <p className="text-muted-foreground">
                    Participate in polls and see what others think.
                </p>
            </div>
            <PollClient />
        </div>
    );
}
