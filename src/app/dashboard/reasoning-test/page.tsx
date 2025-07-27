
"use client";

import { ReasoningTestForm } from "@/components/quiz/reasoning-test-form";

export default function ReasoningTestPage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Reasoning Test</h1>
                <p className="text-muted-foreground">
                    Practice image-based questions to sharpen your analytical skills.
                </p>
            </div>
            <ReasoningTestForm />
        </div>
    );
}
