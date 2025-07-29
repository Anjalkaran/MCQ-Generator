
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/app/dashboard/layout';
import { Loader2, PlayCircle, CheckCircle, Trophy, Ban, Repeat } from 'lucide-react';
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

const MAX_ATTEMPTS = 2;

export const PastLiveTestCard = ({ test }: { test: LiveTest }) => {
    const { user, userData } = useDashboard();
    const { toast } = useToast();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [practiceAttempts, setPracticeAttempts] = useState(0);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const startTime = normalizeDate(test.startTime);
    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;

    useEffect(() => {
        const checkPracticeHistory = async () => {
            if (!user) {
                setIsLoadingHistory(false);
                return;
            }
            try {
                const history = await getExamHistoryForUser(user.uid);
                const practiceQuizId = `live-test-${test.id}`;
                const attempts = history.filter(item => item.topicId === practiceQuizId).length;
                setPracticeAttempts(attempts);
            } catch (error) {
                console.error("Failed to check practice test history:", error);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        checkPracticeHistory();
    }, [user, test.id]);
    
    const hasReachedLimit = practiceAttempts >= MAX_ATTEMPTS;

    const startTest = async () => {
        if (hasReachedLimit && !isAdmin) {
            toast({
                title: "Attempt Limit Reached",
                description: `You have already taken this practice test ${MAX_ATTEMPTS} times.`,
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
    
    const getButton = () => {
        if (isLoadingHistory) {
            return (
                <Button disabled className="w-full">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking History...
                </Button>
            );
        }

        if (isAdmin) {
            return (
                 <Button onClick={startTest} disabled={isGenerating} className="w-full">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Repeat className="mr-2 h-4 w-4" />}
                    Re-take Test (Admin)
                </Button>
            );
        }

        if (hasReachedLimit) {
            return (
                <Button disabled className="w-full">
                    <Ban className="mr-2 h-4 w-4" />
                    Attempt Limit Reached
                </Button>
            );
        }
        
        return (
            <Button onClick={startTest} disabled={isGenerating} className="w-full">
                {isGenerating ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading... Please wait
                    </>
                ) : (
                    <>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Practice Test ({practiceAttempts}/{MAX_ATTEMPTS})
                    </>
                )}
            </Button>
        );
    }

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">{test.title}</CardTitle>
                <CardDescription>
                    Conducted on: {startTime ? format(startTime, 'dd/MM/yyyy') : 'N/A'}
                </CardDescription>
                 {practiceAttempts > 0 && (
                    <Badge variant="secondary" className="w-fit mt-2">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Attempted {practiceAttempts} time(s)
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
                {getButton()}
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
