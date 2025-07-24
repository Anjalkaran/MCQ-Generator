
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/app/dashboard/layout';
import { Loader2, PlayCircle, Lock, CheckCircle, TimerOff, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MockTestForm } from '@/components/quiz/mock-test-form';
import { PreviousYearMockTestForm } from '@/components/quiz/previous-year-mock-test-form';
import { ADMIN_EMAILS } from '@/lib/constants';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { generateLiveMockTest } from '@/ai/flows/generate-live-mock-test';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import type { LiveTest } from '@/lib/types';
import { getLiveTests } from '@/lib/firestore';
import { normalizeDate } from '@/lib/utils';

const blueprintMap = {
    MTS: MTS_BLUEPRINT,
    POSTMAN: POSTMAN_BLUEPRINT,
    PA: PA_BLUEPRINT,
};

const LiveTestCard = ({ test }: { test: LiveTest }) => {
    const { user } = useDashboard();
    const { toast } = useToast();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [testState, setTestState] = useState<'upcoming' | 'live' | 'ended' | 'completed' | 'loading'>('loading');

    const startTime = useMemo(() => normalizeDate(test.startTime), [test.startTime]);
    const endTime = useMemo(() => normalizeDate(test.endTime), [test.endTime]);

    useEffect(() => {
        if (!startTime || !endTime) return;

        const checkUserStatus = async () => {
            if (!user) {
                // If user isn't loaded yet, keep loading state
                if(testState !== 'loading') setTestState('upcoming');
                return;
            }
            const db = getFirebaseDb();
            if (!db) return;

            const testAttemptRef = doc(db, 'users', user.uid, 'liveTests', test.id);
            const docSnap = await getDoc(testAttemptRef);
            if (docSnap.exists()) {
                setTestState('completed');
            }
        };

        checkUserStatus();

        const interval = setInterval(() => {
            if (testState === 'completed' || testState === 'ended') {
                clearInterval(interval);
                return;
            }
            
            const now = new Date();

            if (now >= startTime && now <= endTime) {
                setTestState('live');
                const totalSeconds = Math.floor((endTime.getTime() - now.getTime()) / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                setTimeRemaining(`${hours}h ${minutes}m ${seconds}s remaining`);

            } else if (now > endTime) {
                setTestState('ended');
                setTimeRemaining('This live test has ended.');
                clearInterval(interval);
            } else {
                setTestState('upcoming');
                const totalSeconds = Math.floor((startTime.getTime() - now.getTime()) / 1000);
                const days = Math.floor(totalSeconds / (3600 * 24));
                const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime, endTime, user, test.id, testState]);

    const handleStartTest = async () => {
        setIsGenerating(true);
        if (!user) {
            toast({ title: 'Authentication Error', description: 'You must be logged in to start the test.', variant: 'destructive' });
            setIsGenerating(false);
            return;
        }

        try {
            const { mcqs } = await generateLiveMockTest({ liveTestId: test.questionPaperId });
            
            const blueprint = blueprintMap[test.examCategory];
            const quizId = `live-mock-test-${test.examCategory}-${user.uid}`;
            const quizData = {
                mcqs: mcqs,
                timeLimit: blueprint.totalDurationMinutes * 60,
                isMockTest: true,
                topic: {
                    id: quizId,
                    title: test.title,
                    description: `Live mock test conducted on ${startTime?.toLocaleDateString()}.`,
                    icon: 'scroll-text',
                    categoryId: 'live-mock-test',
                },
            };

            localStorage.setItem(`quiz-${quizId}`, JSON.stringify(quizData));

            const db = getFirebaseDb();
            if (db) {
                const testAttemptRef = doc(db, 'users', user.uid, 'liveTests', test.id);
                await setDoc(testAttemptRef, { completedAt: new Date(), title: test.title });
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
                return <Button disabled className="w-full"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Status...</Button>;
            case 'upcoming':
                return <Button disabled className="w-full"><Lock className="mr-2 h-4 w-4" />Starts In: {timeRemaining}</Button>;
            case 'live':
                return <Button onClick={handleStartTest} disabled={isGenerating} className="w-full bg-green-600 hover:bg-green-700">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    Start Live Test Now
                </Button>;
            case 'completed':
                return <Button disabled className="w-full"><CheckCircle className="mr-2 h-4 w-4" />Test Already Attempted</Button>;
            case 'ended':
                return <Button disabled className="w-full"><TimerOff className="mr-2 h-4 w-4" />Test Has Ended</Button>;
            default:
                return null;
        }
    };
    
    if (!startTime || !endTime) {
        return <Card><CardContent><Loader2 className="animate-spin" /></CardContent></Card>
    }

    return (
        <Card className="border-primary border-2 shadow-lg">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl text-primary">{test.title}</CardTitle>
                <CardDescription>
                    Starts: {startTime.toLocaleString()} | Ends: {endTime.toLocaleString()}
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <div className="p-4 bg-muted rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground">
                        {testState === 'upcoming' ? 'Time Remaining to Start' : 'Test is Live!'}
                    </p>
                    <p className="text-3xl font-bold tracking-tighter">
                        {timeRemaining}
                    </p>
                </div>
                <p className="text-xs text-muted-foreground px-4">You can start the {blueprintMap[test.examCategory].totalDurationMinutes}-minute test anytime within the 2-hour window. You only have one attempt.</p>
            </CardContent>
            <CardFooter>
                {getButton()}
            </CardFooter>
        </Card>
    );
}

const NoLiveTests = () => (
    <Card>
        <CardContent className="pt-6 text-center text-muted-foreground space-y-2">
            <Trophy className="mx-auto h-10 w-10" />
            <p className="font-semibold">No Live Tests Scheduled</p>
            <p className="text-sm">Check back later for upcoming live mock tests.</p>
        </CardContent>
    </Card>
)

export default function MockTestPage() {
    const { userData, isLoading: isDashboardLoading } = useDashboard();
    const [liveTests, setLiveTests] = useState<LiveTest[]>([]);
    const [isLoadingTests, setIsLoadingTests] = useState(true);
    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;

    useEffect(() => {
        const fetchTests = async () => {
            setIsLoadingTests(true);
            try {
                const tests = await getLiveTests();
                setLiveTests(tests);
            } catch (error) {
                console.error("Failed to fetch live tests:", error);
            } finally {
                setIsLoadingTests(false);
            }
        };
        fetchTests();
    }, []);

    const renderLiveTests = () => {
        if (isLoadingTests || isDashboardLoading) {
            return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
        }
        if (liveTests.length === 0) {
            return <NoLiveTests />;
        }
        return (
            <div className="space-y-4">
                {liveTests.map(test => <LiveTestCard key={test.id} test={test} />)}
            </div>
        );
    }

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
                    {renderLiveTests()}
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
