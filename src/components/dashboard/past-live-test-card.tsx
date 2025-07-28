
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/app/dashboard/layout';
import { Loader2, PlayCircle, CheckCircle, Trophy, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateLiveMockTest } from '@/ai/flows/generate-live-mock-test';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import type { LiveTest } from '@/lib/types';
import { normalizeDate } from '@/lib/utils';
import { ADMIN_EMAILS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { getExamHistoryForUser } from '@/lib/firestore';
import { format } from 'date-fns';

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
    const [hasTakenPractice, setHasTakenPractice] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const startTime = normalizeDate(test.startTime);
    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
    const hasTakenLiveTest = userData?.liveTestsTaken?.includes(test.id);

    useEffect(() => {
        const checkPracticeHistory = async () => {
            if (!user) {
                setIsLoadingHistory(false);
                return;
            }
            try {
                const history = await getExamHistoryForUser(user.uid);
                const practiceQuizId = `live-test-${test.id}`;
                const hasTaken = history.some(item => item.topicId === practiceQuizId);
                setHasTakenPractice(hasTaken);
            } catch (error) {
                console.error("Failed to check practice test history:", error);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        checkPracticeHistory();
    }, [user, test.id]);
    
    const hasAttempted = hasTakenLiveTest || hasTakenPractice;

    const startTest = async () => {
        // Safeguard: Prevent non-admins from retaking the test
        if (hasAttempted && !isAdmin) {
            toast({
                title: "Already Attempted",
                description: "You have already completed this test and cannot retake it.",
                variant: "destructive",
            });
            return;
        }

        setIsGenerating(true);
        if (!user) {
            toast({ title: 'Authentication Error', description: 'You must be logged in to start the test.', variant: 'destructive' });
            setIsGenerating(false);
            return;
        }

        try {
            const { mcqs } = await generateLiveMockTest({ 
                liveTestId: test.questionPaperId,
                examCategory: test.examCategory,
             });
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
                    description: `Practice session for the live test conducted on ${startTime ? format(startTime, 'dd/MM/yyyy') : 'a past date'}.`,
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
                    Conducted on: {startTime ? format(startTime, 'dd/MM/yyyy') : 'N/A'}
                </CardDescription>
                 {hasAttempted && (
                    <Badge variant="secondary" className="w-fit mt-2">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Attempted
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
                {isLoadingHistory ? (
                    <Button disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking History...
                    </Button>
                ) : hasAttempted && !isAdmin ? (
                     <Button disabled>
                        <Ban className="mr-2 h-4 w-4" />
                        Already Attempted
                    </Button>
                ) : (
                    <Button onClick={startTest} disabled={isGenerating}>
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading... Please wait
                            </>
                        ) : (
                            <>
                                <PlayCircle className="mr-2 h-4 w-4" />
                                {isAdmin && hasAttempted ? 'Re-take Test (Admin)' : 'Practice Test'}
                            </>
                        )}
                    </Button>
                )}
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
