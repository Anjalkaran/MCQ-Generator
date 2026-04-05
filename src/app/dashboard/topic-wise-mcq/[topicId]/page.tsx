
"use client";

import { TopicQuizForm } from "@/components/quiz/topic-quiz-form";
import { useDashboard } from "@/app/dashboard/layout";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { use } from 'react';


interface TopicParams {
    topicId: string;
}

export default function GenerateTopicQuizPage({ params }: { params: Promise<TopicParams> }) {
    const resolvedParams = use(params);
    const { topics, isLoading, userData } = useDashboard();
    
    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    const topic = topics.find(t => t.id === resolvedParams.topicId);

    if (!topic) {
        // This will show a Next.js 404 page if the topic isn't found
        // which is good practice.
        notFound();
    }

    const backUrl = (topic?.examCategories && topic.examCategories.length > 0)
        ? `/dashboard/syllabus?category=${encodeURIComponent(topic.examCategories[0])}`
        : userData?.examCategory 
            ? `/dashboard/syllabus?category=${encodeURIComponent(userData.examCategory)}`
            : "/dashboard/topic-wise-mcq";
    
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
             <Button variant="ghost" asChild>
                <Link href={backUrl}>
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
