
"use client";

import { PreviousYearMockTestForm } from "@/components/quiz/previous-year-mock-test-form";
import { useDashboard } from "@/app/dashboard/layout";
import { ADMIN_EMAILS } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";


export default function PreviousYearMockTestPage() {
    const { userData } = useDashboard();
    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
    const isPAUser = userData?.examCategory === 'PA';
    const isMTSUser = userData?.examCategory === 'MTS';

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
             <Button variant="ghost" asChild>
                <Link href="/dashboard">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Previous Year Paper Mock Test</h1>
                <p className="text-muted-foreground">
                    Practice with a randomly selected past paper for your exam.
                </p>
            </div>
            
            {isAdmin || isPAUser || isMTSUser ? (
                <PreviousYearMockTestForm />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Feature Not Available</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-muted-foreground p-8">
                            This feature is currently available for PA and MTS Exam users only.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
