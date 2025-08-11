
"use client";

import { MockTestForm } from "@/components/quiz/mock-test-form";
import { PreviousYearMockTestForm } from "@/components/quiz/previous-year-mock-test-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/app/dashboard/layout";
import { ADMIN_EMAILS } from "@/lib/constants";
import { FileText, History } from "lucide-react";

export default function MockTestPage() {
    const { userData } = useDashboard();
    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
    const isPAUser = userData?.examCategory === 'PA';

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Practice Mock Test</h1>
                <p className="text-muted-foreground">
                    Generate a full mock test based on the official syllabus or a previous year's question paper.
                </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-full">
                                <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Syllabus Wise</CardTitle>
                                <CardDescription>Generate a test based on the official exam blueprint.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <MockTestForm />
                    </CardContent>
                </Card>

                <Card>
                     <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-full">
                                <History className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Previous Year Paper</CardTitle>
                                <CardDescription>Practice with a randomly selected past paper.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isAdmin || isPAUser ? (
                            <PreviousYearMockTestForm />
                        ) : (
                            <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg mt-4 h-[280px] flex items-center justify-center">
                                <p>This feature is currently available for PA Exam users only.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
