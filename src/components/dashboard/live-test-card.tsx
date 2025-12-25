
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/app/dashboard/layout';
import { Loader2, PlayCircle, Lock, CheckCircle, TimerOff, Trophy, Gem, Ban, Users, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateLiveMockTest } from '@/ai/flows/generate-live-mock-test';
import type { LiveTest, UserData } from '@/lib/types';
import { markLiveTestAsTaken } from '@/lib/firestore';
import { normalizeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ADMIN_EMAILS } from '@/lib/constants';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';

const allLanguages = ["English", "Tamil", "Hindi", "Telugu", "Kannada"] as const;
const ipLanguages = ["English", "Hindi"] as const;

export const LiveTestCard = ({ test }: { test: LiveTest }) => {
    const { user, userData, setUserData } = useDashboard();
    const { toast } = useToast();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [testState, setTestState] = useState<'upcoming' | 'live' | 'ended' | 'completed' | 'loading'>('loading');
    const [participantCount, setParticipantCount] = useState<number | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

    const startTime = useMemo(() => normalizeDate(test.startTime), [test.startTime]);
    const endTime = useMemo(() => normalizeDate(test.endTime), [test.endTime]);
    
    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
    const hasTakenTest = userData?.liveTestsTaken?.includes(test.id);

    const isIPTest = test.examCategory === 'IP';
    const availableLanguages = isIPTest ? ipLanguages : allLanguages;
    
    useEffect(() => {
        const fetchParticipantCount = async () => {
            try {
                const response = await fetch(`/api/live-test-participants/${test.id}`);
                if (response.ok) {
                    const data = await response.json();
                    setParticipantCount(data.participantCount);
                }
            } catch (error) {
                console.error("Failed to fetch participant count:", error);
            }
        };

        fetchParticipantCount();
    }, [test.id]);


    useEffect(() => {
        if (!startTime || !endTime) return;

        if (isAdmin) {
            setTestState('live');
            return;
        }

        const interval = setInterval(() => {
            if (hasTakenTest) {
                if(testState !== 'completed') setTestState('completed');
                clearInterval(interval);
                return;
            }
            
            const now = new Date();

            if (now < startTime) {
                if (testState !== 'upcoming') setTestState('upcoming');
                setTimeRemaining(formatDistanceToNowStrict(startTime));
            } else if (now >= startTime && now <= endTime) {
                if (testState !== 'live') setTestState('live');
                setTimeRemaining(formatDistanceToNowStrict(endTime));
            } else {
                if (testState !== 'ended') setTestState('ended');
                setTimeRemaining('This live test has ended.');
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime, endTime, testState, hasTakenTest, isAdmin]);

    const startTest = async () => {
        setIsGenerating(true);
        if (!user) {
            toast({ title: 'Authentication Error', description: 'You must be logged in to start the test.', variant: 'destructive' });
            setIsGenerating(false);
            return;
        }

        try {
            const { quizId } = await generateLiveMockTest({ 
                liveTestId: test.id,
                questionPaperId: test.questionPaperId,
                examCategory: test.examCategory,
                language: selectedLanguage,
                testTitle: test.title,
            });

            if (!quizId) {
                 throw new Error("The AI failed to generate the test questions. Please try again later.");
            }
            
            if (!isAdmin && !hasTakenTest) {
                await markLiveTestAsTaken(user.uid, test.id);
                setUserData(prev => prev ? ({ ...prev, liveTestsTaken: [...(prev.liveTestsTaken || []), test.id] }) : null);
            }

            router.push(`/quiz/${quizId}`);

        } catch (error: any) {
            console.error("Error generating live test:", error);
            toast({ title: 'Error Generating Test', description: error.message || 'Could not generate the test. Please try again.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleShare = () => {
        const message = `📢 *Anjalkaran Live Mock Test Challenge!* 📢

Get ready to test your knowledge and compete with fellow aspirants! We're hosting live mock tests for:

🔹 *MTS*
🔹 *POSTMAN*
🔹 *PA*

Simulate real exam conditions, find out where you stand, and boost your preparation. 

Join now and aim for the top of the leaderboard! 🏆

*Download the App:*
https://anjalkaran.in`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };


    const getButton = () => {
        if (isAdmin) {
             return <Button onClick={startTest} disabled={isGenerating} className="w-full bg-green-600 hover:bg-green-700">
                {isGenerating ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating... Please wait
                    </>
                ) : (
                    <>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Start Live Test (Admin)
                    </>
                )}
            </Button>;
        }
        
        if (testState === 'loading') return <Button disabled className="w-full"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Status...</Button>;
        if (testState === 'upcoming') return <Button disabled className="w-full"><Lock className="mr-2 h-4 w-4" />Starts In: {timeRemaining}</Button>;
        if (testState === 'completed') return <Button disabled className="w-full"><CheckCircle className="mr-2 h-4 w-4" />Test Already Attempted</Button>;
        if (testState === 'ended') return <Button disabled className="w-full"><TimerOff className="mr-2 h-4 w-4" />Test Has Ended</Button>;

        return <Button onClick={startTest} disabled={isGenerating} className="w-full bg-green-600 hover:bg-green-700">
            {isGenerating ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating... Please wait
                </>
            ) : (
                <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    {hasTakenTest ? "Start Again (Practice)" : "Start Live Test"}
                </>
            )}
        </Button>;
    };
    
    if (!startTime || !endTime) {
        return <Card><CardContent><Loader2 className="animate-spin" /></CardContent></Card>
    }

    return (
        <Card className="border-primary border-2 shadow-lg relative overflow-hidden flex flex-col">
             {participantCount !== null && (
                <Badge variant="secondary" className="absolute top-4 right-4 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {participantCount}
                </Badge>
            )}
            <CardHeader className="text-center">
                <CardTitle className="text-xl text-primary">{test.title}</CardTitle>
                <CardDescription>
                    {format(startTime, 'dd/MM/yyyy p')}
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4 flex-grow">
                 {!isAdmin && (
                     <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            {testState === 'upcoming' ? 'Starts in' : 'Ends in'}
                        </p>
                        <p className="text-2xl font-bold tracking-tighter">
                            {timeRemaining}
                        </p>
                    </div>
                 )}
                 <div className="space-y-2 text-left">
                    <Label htmlFor={`language-select-${test.id}`}>Language</Label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger id={`language-select-${test.id}`}>
                            <SelectValue placeholder="Select a language" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableLanguages.map((lang) => (
                                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
                <div className="flex w-full gap-2">
                    <div className="flex-grow">{getButton()}</div>
                    <Button onClick={handleShare} variant="outline" size="icon" aria-label="Share on WhatsApp">
                        <Share2 className="h-5 w-5" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
