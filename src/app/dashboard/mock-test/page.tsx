
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/app/dashboard/layout';
import { Loader2, PlayCircle, Lock, CheckCircle, TimerOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MockTestForm } from '@/components/quiz/mock-test-form';
import { PreviousYearMockTestForm } from '@/components/quiz/previous-year-mock-test-form';
import { ADMIN_EMAILS } from '@/lib/constants';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { generateLiveMockTest } from '@/ai/flows/generate-live-mock-test';
import { MTS_BLUEPRINT } from '@/lib/exam-blueprints';


const LiveTestCard = () => {
    const { user } = useDashboard();
    const { toast } = useToast();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [testState, setTestState] = useState<'upcoming' | 'live' | 'ended' | 'completed' | 'loading'>('loading');

    const liveTestId = 'mts-live-test-2024-07-28'; // Unique ID for this specific test

    const targetTime = useMemo(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(20, 0, 0, 0); // 8:00 PM
        return tomorrow;
    }, []);

    const endTime = useMemo(() => {
        const end = new Date(targetTime);
        end.setHours(end.getHours() + 2); // Ends at 10:00 PM
        return end;
    }, [targetTime]);

    useEffect(() => {
        const checkUserStatus = async () => {
            if (!user) {
                setTestState('upcoming');
                return;
            }
            const db = getFirebaseDb();
            if (!db) return;

            const testAttemptRef = doc(db, 'users', user.uid, 'liveTests', liveTestId);
            const docSnap = await getDoc(testAttemptRef);
            if (docSnap.exists()) {
                setTestState('completed');
            }
        };

        checkUserStatus();

        const interval = setInterval(() => {
            const now = new Date();
            if (testState === 'completed') {
                clearInterval(interval);
                return;
            }

            if (now >= targetTime && now <= endTime) {
                setTestState('live');
                setTimeRemaining('');
            } else if (now > endTime) {
                setTestState('ended');
                setTimeRemaining('The live test has ended.');
                clearInterval(interval);
            } else {
                setTestState('upcoming');
                const totalSeconds = Math.floor((targetTime.getTime() - now.getTime()) / 1000);
                const days = Math.floor(totalSeconds / (3600 * 24));
                const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [targetTime, endTime, user, testState]);

    const handleStartTest = async () => {
        setIsGenerating(true);
        if (!user) {
            toast({ title: 'Authentication Error', description: 'You must be logged in to start the test.', variant: 'destructive' });
            setIsGenerating(false);
            return;
        }

        try {
            // Use the dedicated live test flow
            const { mcqs } = await generateLiveMockTest({ liveTestId: 'mts-live-test-paper-1' });
            
            const quizId = `live-mock-test-MTS-${user.uid}`;
            const quizData = {
                mcqs: mcqs,
                timeLimit: MTS_BLUEPRINT.totalDurationMinutes * 60,
                isMockTest: true,
                topic: {
                    id: quizId,
                    title: `MTS Live Mock Test`,
                    description: `Live mock test conducted on ${targetTime.toLocaleDateString()}.`,
                    icon: 'scroll-text',
                    categoryId: 'live-mock-test',
                },
            };

            localStorage.setItem(`quiz-${quizId}`, JSON.stringify(quizData));

            const db = getFirebaseDb();
            if (db) {
                const testAttemptRef = doc(db, 'users', user.uid, 'liveTests', liveTestId);
                await setDoc(testAttemptRef, { completedAt: new Date() });
            }

            router.push(`/quiz/${quizId}`);

        } catch (error: any) {
            console.error("Error generating live test:", error);
            toast({ title: 'Error', description: error.message || 'Could not generate the test. Please try again.', variant: 'destructive' });
            setIsGenerating(false);
        }
    };

    const getButton = () => {
        switch (testState) {
            case 'loading':
                return <Button disabled className="w-full"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</Button>;
            case 'upcoming':
                return <Button disabled className="w-full"><Lock className="mr-2 h-4 w-4" />Starts In: {timeRemaining}</Button>;
            case 'live':
                return <Button onClick={handleStartTest} disabled={isGenerating} className="w-full bg-green-600 hover:bg-green-700">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    Start Live Test Now
                </Button>;
            case 'completed':
                return <Button disabled className="w-full"><CheckCircle className="mr-2 h-4 w-4" />Test Completed</Button>;
            case 'ended':
                return <Button disabled className="w-full"><TimerOff className="mr-2 h-4 w-4" />Test Has Ended</Button>;
            default:
                return null;
        }
    }

    return (
        <Card className="border-primary border-2 shadow-lg">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl text-primary">MTS Live Mock Test</CardTitle>
                <CardDescription>
                    Starts: Tomorrow at 8:00 PM | Ends: Tomorrow at 10:00 PM
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <div className="p-4 bg-muted rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground">Time Remaining to Start</p>
                    <p className="text-3xl font-bold tracking-tighter">
                        {testState === 'upcoming' ? timeRemaining : 'The test is now live!'}
                    </p>
                </div>
                <p className="text-xs text-muted-foreground px-4">You can start the 60-minute test anytime within the 2-hour window. You only have one attempt.</p>
            </CardContent>
            <CardFooter>
                {getButton()}
            </CardFooter>
        </Card>
    );
}

export default function MockTestPage() {
    const { userData } = useDashboard();
    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Mock Test</h1>
                <p className="text-muted-foreground">
                    Prepare for your exam with live tests or generate practice tests.
                </p>
            </div>
            <Tabs defaultValue="live-test" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="live-test">Live Mock Test</TabsTrigger>
                    <TabsTrigger value="practice-test">Practice Mock Test</TabsTrigger>
                </TabsList>
                <TabsContent value="live-test">
                    <LiveTestCard />
                </TabsContent>
                <TabsContent value="practice-test">
                    <div className="space-y-6">
                        <MockTestForm />
                        {isAdmin && <PreviousYearMockTestForm />}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
