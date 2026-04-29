
"use client";

import { PreviousYearMockTestForm } from "@/components/quiz/previous-year-mock-test-form";
import { useDashboard } from "@/context/dashboard-context";
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
    const isPostmanUser = userData?.examCategory === 'POSTMAN';

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
             <Button variant="ghost" asChild>
                <Link href="/dashboard">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <div className="space-y-2 text-center pb-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-800 uppercase tracking-widest">Question Bank</h1>
                <p className="text-muted-foreground font-medium">
                    Select your exam category to practice with authentic past papers.
                </p>
            </div>
            
            {isAdmin || isPAUser || isMTSUser || isPostmanUser ? (
                <PreviousYearMockTestForm />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Feature Not Available</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-muted-foreground p-8">
                            This feature is not currently available for your exam category.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
