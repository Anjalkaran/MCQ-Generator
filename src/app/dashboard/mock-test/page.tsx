
"use client";

import { MockTestForm } from "@/components/quiz/mock-test-form";

export default function MockTestPage() {

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Practice Mock Test</h1>
                <p className="text-muted-foreground">
                    Generate a full mock test based on the official syllabus in your preferred language.
                </p>
            </div>
            <MockTestForm />
        </div>
    );
}
