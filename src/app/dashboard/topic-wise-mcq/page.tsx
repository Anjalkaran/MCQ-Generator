
"use client";

import { CreateQuizForm } from "@/components/quiz/create-quiz-form";

export default function TopicWiseMCQPage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Topic-wise MCQ</h1>
                <p className="text-muted-foreground">
                    Create a custom quiz for a specific topic to focus your practice.
                </p>
            </div>
            <CreateQuizForm />
        </div>
    )
}
