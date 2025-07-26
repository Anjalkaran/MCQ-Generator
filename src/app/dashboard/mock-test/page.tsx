
"use client";

import { MockTestForm } from "@/components/quiz/mock-test-form";
import { PreviousYearMockTestForm } from "@/components/quiz/previous-year-mock-test-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboard } from "@/app/dashboard/layout";
import { ADMIN_EMAILS } from "@/lib/constants";

export default function MockTestPage() {
    const { userData } = useDashboard();
    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Practice Mock Test</h1>
                <p className="text-muted-foreground">
                    Generate a full mock test based on the official blueprint or from previous year's questions.
                </p>
            </div>
            <Tabs defaultValue="blueprint" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="blueprint">From Blueprint</TabsTrigger>
                    <TabsTrigger value="previous-year">From Previous Year</TabsTrigger>
                </TabsList>
                <TabsContent value="blueprint">
                    <MockTestForm />
                </TabsContent>
                <TabsContent value="previous-year">
                   {isAdmin ? (
                        <PreviousYearMockTestForm />
                   ) : (
                        <p className="text-center text-muted-foreground p-8">This feature is available for admins only.</p>
                   )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
