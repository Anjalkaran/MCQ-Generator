
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/app/dashboard/layout';
import { Loader2, PlayCircle, Lock, CheckCircle, TimerOff, Gem, Rss, Ban, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateLiveMockTest } from '@/ai/flows/generate-live-mock-test';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import type { LiveTest } from '@/lib/types';
import { markLiveTestAsTaken } from '@/lib/firestore';
import { normalizeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ADMIN_EMAILS, RAZORPAY_KEY_ID } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

declare global {
    interface Window {
        Razorpay: any;
    }
}

const blueprintMap = {
    MTS: MTS_BLUEPRINT,
    POSTMAN: POSTMAN_BLUEPRINT,
    PA: PA_BLUEPRINT,
};

export const LiveTestDashboardCard = ({ initialLiveTests }: { initialLiveTests: LiveTest[] }) => {
    const { user, userData, setUserData } = useDashboard();
    const { toast } = useToast();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [testState, setTestState] = useState<'upcoming' | 'live' | 'ended' | 'completed' | 'loading' | 'none' | 'entryClosed'>('loading');

    // Find the next upcoming or currently live test
    const nextTest = useMemo(() => {
        const now = new Date();
        const sortedTests = [...initialLiveTests].sort((a, b) => 
            normalizeDate(a.startTime)!.getTime() - normalizeDate(b.startTime)!.getTime()
        );
        
        // Find the first test that hasn't ended yet
        return sortedTests.find(test => normalizeDate(test.endTime)! > now) || null;
    }, [initialLiveTests]);

    const startTime = useMemo(() => nextTest ? normalizeDate(nextTest.startTime) : null, [nextTest]);
    const endTime = useMemo(() => nextTest ? normalizeDate(nextTest.endTime) : null, [nextTest]);
    const entryCutoffTime = useMemo(() => {
        if (!startTime) return null;
        const cutoff = new Date(startTime);
        cutoff.setMinutes(cutoff.getMinutes() + 10);
        return cutoff;
    }, [startTime]);
    
    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
    const proValidUntilDate = normalizeDate(userData?.proValidUntil);
    const isPro = !!(userData?.isPro && proValidUntilDate && proValidUntilDate > new Date()) || isAdmin;
    const liveTestsTakenCount = userData?.liveTestsTaken?.length || 0;
    const isFirstTestFree = !isPro && liveTestsTakenCount === 0;

    useEffect(() => {
        if (!nextTest || !startTime || !endTime || !entryCutoffTime) {
            setTestState('none');
            return;
        }
        
        if (isAdmin) {
            setTestState('live');
            setTimeRemaining("Admin Access");
            return;
        }

        const interval = setInterval(() => {
            if (userData?.liveTestsTaken?.includes(nextTest.id)) {
                if(testState !== 'completed') setTestState('completed');
                clearInterval(interval);
                return;
            }
            
            if (testState === 'ended') {
                clearInterval(interval);
                return;
            }
            
            const now = new Date();
            let totalSeconds;

            if (now >= startTime && now <= entryCutoffTime) {
                if (testState !== 'live') setTestState('live');
                totalSeconds = Math.floor((entryCutoffTime.getTime() - now.getTime()) / 1000);
            } else if (now > entryCutoffTime && now <= endTime) {
                 if (testState !== 'entryClosed') setTestState('entryClosed');
                 setTimeRemaining('Entry window has closed.');
                 clearInterval(interval);
                 return;
            } else if (now > endTime) {
                if (testState !== 'ended') setTestState('ended');
                setTimeRemaining('This live test has ended.');
                clearInterval(interval);
                return;
            } else {
                if (testState !== 'upcoming') setTestState('upcoming');
                totalSeconds = Math.floor((startTime.getTime() - now.getTime()) / 1000);
            }

            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            setTimeRemaining(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);

        }, 1000);

        return () => clearInterval(interval);
    }, [startTime, endTime, entryCutoffTime, testState, userData, nextTest, isAdmin]);

    const startTest = async () => {
        if (!nextTest || !user) return;
        setIsGenerating(true);

        try {
            const { mcqs } = await generateLiveMockTest({ liveTestId: nextTest.questionPaperId });
            const blueprint = blueprintMap[nextTest.examCategory];
            const quizId = `live-test-${nextTest.id}`;
            const quizData = {
                mcqs: mcqs,
                timeLimit: blueprint.totalDurationMinutes * 60,
                isMockTest: true,
                liveTestId: nextTest.id,
                topic: {
                    id: quizId,
                    title: nextTest.title,
                    description: `Live mock test conducted on ${startTime?.toLocaleDateString()}.`,
                    icon: 'scroll-text',
                    categoryId: 'live-mock-test',
                },
            };

            localStorage.setItem(`quiz-${quizId}`, JSON.stringify(quizData));
            
            // Only mark test as taken for non-admins to allow for repeated testing
            if (!isAdmin) {
                await markLiveTestAsTaken(user.uid, nextTest.id);
                setUserData(prev => prev ? ({ ...prev, liveTestsTaken: [...(prev.liveTestsTaken || []), nextTest.id] }) : null);
            }
            
            router.push(`/quiz/${quizId}`);

        } catch (error: any) {
            console.error("Error generating live test:", error);
            toast({ title: 'Error', description: error.message || 'Could not generate the test. Please try again.', variant: 'destructive' });
            setIsGenerating(false);
        }
    };
    
    const handlePaymentAndStart = async () => {
        if (!nextTest || !user || !userData) return;
        setIsPaying(true);
        if (!window.Razorpay) {
            toast({ title: "Payment Not Ready", description: "Please try again in a moment.", variant: "destructive" });
            setIsPaying(false);
            return;
        }

        try {
            const response = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, amount: nextTest.price }),
            });
            if (!response.ok) throw new Error('Failed to create payment order.');
            const order = await response.json();

            const options = {
                key: RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: nextTest.title,
                description: "Single Live Mock Test Attempt",
                order_id: order.id,
                handler: async () => { await startTest(); },
                prefill: { name: userData.name, email: userData.email },
                theme: { color: "#D62927" },
                modal: { ondismiss: () => setIsPaying(false) }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.on('payment.failed', (response: any) => {
                toast({ title: "Payment Failed", description: response.error.description, variant: "destructive" });
                setIsPaying(false);
            });
            paymentObject.open();

        } catch (error) {
            toast({ title: "Error", description: 'Could not initiate payment.', variant: "destructive" });
            setIsPaying(false);
        }
    };


    const getButton = () => {
        if (!nextTest) return null;
        if (testState === 'loading') return <Button disabled className="w-full"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Status...</Button>;
        if (testState === 'upcoming' && !isAdmin) return <Button disabled className="w-full"><Lock className="mr-2 h-4 w-4" />Starts In: {timeRemaining}</Button>;
        if (testState === 'completed' && !isAdmin) return <Button disabled className="w-full"><CheckCircle className="mr-2 h-4 w-4" />Test Already Attempted</Button>;
        if (testState === 'entryClosed' && !isAdmin) return <Button disabled className="w-full"><Ban className="mr-2 h-4 w-4" />Entry Window Closed</Button>;
        if (testState === 'ended' && !isAdmin) return <Button disabled className="w-full"><TimerOff className="mr-2 h-4 w-4" />Test Has Ended</Button>;

        // Always show start button for admins
        if (isPro || isAdmin) {
            return <Button onClick={startTest} disabled={isGenerating} className="w-full bg-green-600 hover:bg-green-700">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Start Live Test {isAdmin && "(Admin)"}
            </Button>;
        }
        
        if (isFirstTestFree) {
            return <Button onClick={startTest} disabled={isGenerating} className="w-full bg-green-600 hover:bg-green-700">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Start First Free Test
            </Button>;
        }

        return (
            <div className="w-full space-y-2">
                <Button onClick={handlePaymentAndStart} disabled={isPaying || isGenerating} className="w-full">
                    {isPaying || isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    Pay ₹{nextTest.price} and Start Test
                </Button>
                <Button variant="outline" asChild className="w-full">
                    <Link href="/dashboard/upgrade">
                        <Gem className="mr-2 h-4 w-4" /> Upgrade to Pro
                    </Link>
                </Button>
            </div>
        );
    };
    
    if (testState === 'none') {
         return (
             <Card className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Rss className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>Live Mock Test</CardTitle>
                    </div>
                    <CardDescription className="pt-4">
                        Participate in scheduled live tests that simulate real exam conditions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                    <p className="text-sm text-muted-foreground text-center">No upcoming live tests scheduled. Check back soon!</p>
                </CardContent>
            </Card>
         )
    }

    return (
        <Card className="flex flex-col border-primary border-2 shadow-lg relative overflow-hidden">
             {isFirstTestFree && testState === 'live' && !isAdmin && (
                <Badge className="absolute -top-2 -right-2 transform rotate-12 text-base px-3 py-1 z-10">
                    First Test Free!
                </Badge>
            )}
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <Rss className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <CardTitle>{nextTest?.title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="text-center flex-grow flex flex-col justify-center space-y-4">
                 <Alert className="text-left bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                    <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertTitle className="text-yellow-800 dark:text-yellow-300">Win a Prize!</AlertTitle>
                    <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                        The top-ranked free user wins a **FREE** 1-year Pro subscription!
                    </AlertDescription>
                </Alert>
            </CardContent>
            <CardFooter>
                {getButton()}
            </CardFooter>
        </Card>
    );
}
