
"use client";

import { TopicQuizForm } from "@/components/quiz/topic-quiz-form";
import { useDashboard } from "@/context/dashboard-context";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { use } from 'react';
import type { SyllabusTopic } from "@/lib/types";
import { 
    MTS_BLUEPRINT, 
    POSTMAN_BLUEPRINT, 
    PA_BLUEPRINT, 
    GROUPB_BLUEPRINT 
} from "@/lib/exam-blueprints";
import { IP_BLUEPRINT } from "@/lib/exam-blueprints-ip";

interface TopicParams {
    topicId: string;
}

export default function GenerateTopicQuizPage({ params }: { params: Promise<TopicParams> }) {
    const resolvedParams = use(params);
    const { topics, syllabi, isLoading, userData } = useDashboard();

    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    let topic = topics.find(t => t.id === resolvedParams.topicId);
    
    // If NOT found in legacy topics, check in syllabus blueprints
    if (!topic) {
        // Build a list of all blueprints to search (hardcoded + Firestore dynamic)
        const allBlueprints: any[] = [
            { id: 'MTS', ...MTS_BLUEPRINT },
            { id: 'POSTMAN', ...POSTMAN_BLUEPRINT },
            { id: 'PA', ...PA_BLUEPRINT },
            { id: 'IP', ...IP_BLUEPRINT },
            { id: 'GROUP B', ...GROUPB_BLUEPRINT }
        ];
        
        // Add dynamic Firestore syllabi (these override hardcoded if IDs match)
        if (syllabi && syllabi.length > 0) {
            syllabi.forEach(s => {
                const existingIdx = allBlueprints.findIndex(bp => bp.id === s.id);
                if (existingIdx !== -1) {
                    allBlueprints[existingIdx] = s;
                } else {
                    allBlueprints.push(s);
                }
            });
        }

        // Flatten all blueprint topics to find the match
        for (const blueprint of allBlueprints) {
            const parts = blueprint.parts || [];
            for (const part of parts) {
                const sections = part.sections || [];
                for (const section of sections) {
                    if (!section.topics) continue;
                    
                    const foundTopic = section.topics.find((t: any) => 
                        typeof t !== 'string' && t && t.id === resolvedParams.topicId
                    ) as SyllabusTopic | undefined;

                    if (foundTopic) {
                        topic = {
                            id: foundTopic.id,
                            title: foundTopic.name,
                            categoryId: blueprint.id || blueprint.examName,
                            categoryName: blueprint.examName,
                            examCategories: [blueprint.id || blueprint.examName],
                            material: "", 
                            part: part.partName,
                            icon: "book-open"
                        } as any;
                        break;
                    }
                }
                if (topic) break;
            }
            if (topic) break;
        }
    }

    if (!topic) {
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
