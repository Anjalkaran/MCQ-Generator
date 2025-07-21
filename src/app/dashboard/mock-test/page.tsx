
"use client";

import { MockTestForm } from "@/components/quiz/mock-test-form";
import { PreviousYearMockTestForm } from "@/components/quiz/previous-year-mock-test-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function MockTestPage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
             <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Mock Test</h1>
                <p className="text-muted-foreground">
                    Generate a full-length mock test based on the official exam blueprint, either with new questions or from the question bank.
                </p>
            </div>
             <Tabs defaultValue="ai-generated" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ai-generated">AI Generated</TabsTrigger>
                    <TabsTrigger value="previous-years">From Previous Years</TabsTrigger>
                </TabsList>
                <TabsContent value="ai-generated">
                    <MockTestForm />
                </TabsContent>
                <TabsContent value="previous-years">
                    <PreviousYearMockTestForm />
                </TabsContent>
            </Tabs>
        </div>
    )
}
