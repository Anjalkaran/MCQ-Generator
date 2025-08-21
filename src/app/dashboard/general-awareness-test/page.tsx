
"use client";

import { GeneralAwarenessForm } from "@/components/quiz/general-awareness-form";

export default function GeneralAwarenessTestPage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">General Awareness & Knowledge Test</h1>
                <p className="text-muted-foreground">
                    Generate a custom quiz for topics like current affairs, geography, civics, and more.
                </p>
            </div>
            <GeneralAwarenessForm />
        </div>
    );
}
