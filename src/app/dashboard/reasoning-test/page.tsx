
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function ReasoningTestPage() {
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleStartTest = async () => {
        setIsGenerating(true);
        toast({ title: "Coming Soon!", description: "This feature is under development and will be available shortly." });
        // In the future, this will generate and start the test.
        // For now, it just shows a toast.
        // Example of future logic:
        // try {
        //   const { questions } = await generateReasoningTest({ numberOfQuestions: 10 });
        //   const quizId = `reasoning-${Date.now()}`;
        //   localStorage.setItem(`quiz-${quizId}`, JSON.stringify({ questions, timeLimit: 600 }));
        //   router.push(`/quiz/reasoning/${quizId}`);
        // } catch (error) {
        //   toast({ title: "Error", description: "Could not start the test.", variant: "destructive" });
        // } finally {
        //   setIsGenerating(false);
        // }
        setIsGenerating(false);
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Reasoning Test</h1>
                <p className="text-muted-foreground">
                    Sharpen your skills with image-based reasoning questions.
                </p>
            </div>
            <Card>
                <CardHeader className="items-center text-center">
                    <div className="p-3 bg-primary/10 rounded-full">
                       <BrainCircuit className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>Start Your Practice Session</CardTitle>
                    <CardDescription>
                        Click the button below to start a reasoning test with 10 questions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleStartTest} disabled={isGenerating} className="w-full">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Start Reasoning Test"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
