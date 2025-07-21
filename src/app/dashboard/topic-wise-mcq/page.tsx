
"use client";

import { CreateQuizForm } from "@/components/quiz/create-quiz-form";
import { PartwiseQuizForm } from "@/components/quiz/partwise-quiz-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TopicWiseMCQPage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Practice Quiz</h1>
                <p className="text-muted-foreground">
                    Create a custom quiz by topic or by an entire syllabus part.
                </p>
            </div>
            <Tabs defaultValue="by-topic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="by-topic">By Topic</TabsTrigger>
                    <TabsTrigger value="by-part">By Part</TabsTrigger>
                </TabsList>
                <TabsContent value="by-topic">
                    <CreateQuizForm />
                </TabsContent>
                <TabsContent value="by-part">
                    <PartwiseQuizForm />
                </TabsContent>
            </Tabs>
        </div>
    )
}
