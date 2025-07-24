
"use client";

import { MockTestForm } from '@/components/quiz/mock-test-form';
import { PreviousYearMockTestForm } from '@/components/quiz/previous-year-mock-test-form';
import { useDashboard } from '@/app/dashboard/layout';
import { ADMIN_EMAILS } from '@/lib/constants';


export default function MockTestPage() {
    const { userData } = useDashboard();
    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Practice Mock Test</h1>
                <p className="text-muted-foreground">
                    Prepare for your exam by generating practice tests based on the official syllabus or from previous year papers.
                </p>
            </div>
            <div className="space-y-6">
                <MockTestForm />
                {isAdmin && <PreviousYearMockTestForm />}
            </div>
        </div>
    );
}
