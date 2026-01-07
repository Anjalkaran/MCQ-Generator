
"use client";

import { TopicQuizForm } from "@/components/quiz/topic-quiz-form";
import { useDashboard } from "@/app/dashboard/layout";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";


export default function GenerateTopicQuizPage({ params: { topicId } }: { params: { topicId: string } }) {
    const { topics, isLoading } = useDashboard();
    
    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    const topic = topics.find(t => t.id === topicId);

    if (!topic) {
        // This will show a Next.js 404 page if the topic isn't found
        // which is good practice.
        notFound();
    }
    
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
             <Button variant="ghost" asChild>
                <Link href="/dashboard/topic-wise-mcq">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Topics
                </Link>
            </Button>
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">{topic.title}</h1>
                <p className="text-muted-foreground">
                    Generate a custom practice exam for this topic from the available question bank.
                </p>
            </div>
            <TopicQuizForm topic={topic} />
        </div>
    );
}
