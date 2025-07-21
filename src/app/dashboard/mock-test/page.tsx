
"use client";

import { MockTestForm } from "@/components/quiz/mock-test-form";
import { PreviousYearMockTestForm } from "@/components/quiz/previous-year-mock-test-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboard } from "@/app/dashboard/layout";
import { ADMIN_EMAILS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";

export default function MockTestPage() {
    const { userData } = useDashboard();
    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;

    if (isAdmin) {
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Mock Test</h1>
                    <p className="text-muted-foreground">
                        Generate a full-length mock test based on the official exam blueprint, either with new questions or from the question bank.
                    </p>
                </div>
                <Tabs defaultValue="standard-test" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="standard-test">Standard Mock Test</TabsTrigger>
                        <TabsTrigger value="previous-year-test">From Previous Year Questions</TabsTrigger>
                    </TabsList>
                    <TabsContent value="standard-test">
                        <MockTestForm />
                    </TabsContent>
                    <TabsContent value="previous-year-test">
                        <PreviousYearMockTestForm />
                    </TabsContent>
                </Tabs>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Mock Test</h1>
                <p className="text-muted-foreground">
                    Generate a full-length mock test based on the official exam blueprint.
                </p>
            </div>
            <MockTestForm />
        </div>
    );
}
