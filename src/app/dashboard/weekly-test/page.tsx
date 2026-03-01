
"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle, CalendarCheck, Clock, Share2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { generateLiveMockTest } from "@/ai/flows/generate-live-mock-test";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from "@/components/ui/label";
import type { WeeklyTest } from "@/lib/types";

const allLanguages = ["English", "Tamil", "Hindi", "Telugu", "Kannada"] as const;
const ipLanguages = ["English", "Hindi"] as const;

function WeeklyTestCard({ test }: { test: WeeklyTest }) {
    const { user, userData } = useDashboard();
    const { toast } = useToast();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

    const isIPUser = userData?.examCategory === 'IP';
    const availableLanguages = isIPUser ? ipLanguages : allLanguages;

    const startTest = async () => {
        setIsGenerating(true);
        if (!user || !userData) {
            toast({ title: 'Auth Required', description: 'Please login again.', variant: 'destructive' });
            setIsGenerating(false);
            return;
        }

        try {
            const { quizId } = await generateLiveMockTest({ 
                liveTestId: undefined, 
                weeklyTestId: test.id, 
                questionPaperId: test.questionPaperId,
                examCategory: userData.examCategory,
                language: selectedLanguage,
                testTitle: test.title,
            });

            if (!quizId) throw new Error("Generation failed.");
            router.push(`/quiz/${quizId}`);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Could not start test.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = () => {
        const message = `Check out "${test.title}" on Anjalkaran! Permanent Weekly Test for your preparation. Practice now: https://anjalkaran.in`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <Card className="flex flex-col h-full border-primary/20 hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <CalendarCheck className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{test.title}</CardTitle>
                </div>
                <CardDescription>Always available for practice</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs">Language Preference</Label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {availableLanguages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter className="gap-2">
                <Button onClick={startTest} disabled={isGenerating} className="flex-1 bg-green-600 hover:bg-green-700">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    Start Test
                </Button>
                <Button variant="outline" size="icon" onClick={handleShare}><Share2 className="h-4 w-4" /></Button>
            </CardFooter>
        </Card>
    );
}

export default function WeeklyTestPage() {
    const { weeklyTests, isLoading, userData } = useDashboard();

    if (isLoading) {
        return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const filteredTests = weeklyTests.filter(t => 
        t.examCategories?.includes(userData?.examCategory as any) || t.examCategories?.includes('All')
    );

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Weekly Tests</h1>
                <p className="text-muted-foreground">Permanent full-length mock tests released every week for your preparation.</p>
            </div>

            {filteredTests.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTests.map(test => <WeeklyTestCard key={test.id} test={test} />)}
                </div>
            ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-lg">
                    <CalendarCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                    <p className="text-muted-foreground font-medium">No weekly tests have been added for the {userData?.examCategory} category yet.</p>
                </div>
            )}
        </div>
    );
}
