
"use client";

import { MockTestForm } from "@/components/quiz/mock-test-form";

export default function MockTestPage() {
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
    )
}
