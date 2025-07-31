
"use client";

import { CreateQuizForm } from "@/components/quiz/create-quiz-form";
import { PartwiseQuizForm } from "@/components/quiz/partwise-quiz-form";
import { ReasoningTestForm } from "@/components/quiz/reasoning-test-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TopicWiseMCQPage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Practice MCQ</h1>
                <p className="text-muted-foreground">
                    Create a custom exam by topic, syllabus part, or reasoning ability.
                </p>
            </div>
            <Tabs defaultValue="by-topic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="by-topic">Topic Wise</TabsTrigger>
                    <TabsTrigger value="by-part">Part Wise</TabsTrigger>
                    <TabsTrigger value="by-reasoning">Reasoning</TabsTrigger>
                </TabsList>
                <TabsContent value="by-topic">
                    <CreateQuizForm />
                </TabsContent>
                <TabsContent value="by-part">
                    <PartwiseQuizForm />
                </TabsContent>
                <TabsContent value="by-reasoning">
                    <ReasoningTestForm />
                </TabsContent>
            </Tabs>
        </div>
    )
}
