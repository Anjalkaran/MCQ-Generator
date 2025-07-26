
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/app/dashboard/layout';
import { Loader2, PlayCircle, CheckCircle, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateLiveMockTest } from '@/ai/flows/generate-live-mock-test';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import type { LiveTest } from '@/lib/types';
import { normalizeDate } from '@/lib/utils';
import { ADMIN_EMAILS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

const blueprintMap = {
    MTS: MTS_BLUEPRINT,
    POSTMAN: POSTMAN_BLUEPRINT,
    PA: PA_BLUEPRINT,
};

export const PastLiveTestCard = ({ test }: { test: LiveTest }) => {
    const { user, userData } = useDashboard();
    const { toast } = useToast();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);

    const startTime = normalizeDate(test.startTime);
    const hasTakenTest = userData?.liveTestsTaken?.includes(test.id);
    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;

    const startTest = async () => {
        setIsGenerating(true);
        if (!user) {
            toast({ title: 'Authentication Error', description: 'You must be logged in to start the test.', variant: 'destructive' });
            setIsGenerating(false);
            return;
        }

        try {
            const { mcqs } = await generateLiveMockTest({ liveTestId: test.questionPaperId });
            const blueprint = blueprintMap[test.examCategory];
            const quizId = `live-test-${test.id}`;
            const quizData = {
                mcqs: mcqs,
                timeLimit: blueprint.totalDurationMinutes * 60,
                isMockTest: true,
                liveTestId: test.id,
                topic: {
                    id: quizId,
                    title: `${test.title} (Practice)`,
                    description: `Practice session for the live test conducted on ${startTime?.toLocaleDateString()}.`,
                    icon: 'scroll-text',
                    categoryId: 'live-mock-test',
                },
            };

            localStorage.setItem(`quiz-${quizId}`, JSON.stringify(quizData));
            router.push(`/quiz/${quizId}`);

        } catch (error: any) {
            console.error("Error generating past live test:", error);
            toast({ title: 'Error', description: error.message || 'Could not generate the test. Please try again.', variant: 'destructive' });
            setIsGenerating(false);
        }
    };
    
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">{test.title}</CardTitle>
                <CardDescription>
                    Conducted on: {startTime?.toLocaleDateString()}
                </CardDescription>
                 {hasTakenTest && !isAdmin && (
                    <Badge variant="secondary" className="w-fit mt-2">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Attempted
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="flex-grow">
                {/* You can add more details here if needed */}
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
                <Button onClick={startTest} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    Practice Test
                </Button>
                 <Button variant="outline" asChild>
                    <Link href={`/dashboard/leaderboard?liveTestId=${test.id}`}>
                        <Trophy className="mr-2 h-4 w-4" />
                        View Leaderboard
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
