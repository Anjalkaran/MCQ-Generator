"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useDashboard } from "@/context/dashboard-context";
import { Loader2, PlayCircle, Lock, CheckCircle, TimerOff, Trophy, Repeat, Users, Share2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { generateLiveMockTest } from '@/ai/flows/generate-live-mock-test';
import type { LiveTest } from '@/lib/types';
import { markLiveTestAsTaken } from '@/lib/firestore';
import { normalizeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ADMIN_EMAILS } from '@/lib/constants';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';

const allLanguages = ["English", "Tamil", "Hindi", "Telugu", "Kannada"] as const;
const ipLanguages = ["English", "Hindi"] as const;

export const LiveTestCard = ({ test }: { test: LiveTest }) => {
    const { user, userData, setUserData } = useDashboard();
    const { toast } = useToast();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [testState, setTestState] = useState<'upcoming' | 'live' | 'ended' | 'completed' | 'loading'>('loading');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

    const startTime = useMemo(() => normalizeDate(test.startTime), [test.startTime]);
    const endTime = useMemo(() => normalizeDate(test.endTime), [test.endTime]);
    
    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
    const hasTakenTest = userData?.liveTestsTaken?.includes(test.id);

    const isIPTest = test.examCategory === 'IP';
    const availableLanguages = isIPTest ? ipLanguages : allLanguages;

    useEffect(() => {
        if (!startTime || !endTime) return;
        if (isAdmin) { setTestState('live'); return; }

        const interval = setInterval(() => {
            const now = new Date();
            if (now < startTime) {
                if (testState !== 'upcoming') setTestState('upcoming');
                setTimeRemaining(formatDistanceToNowStrict(startTime));
            } else if (now >= startTime && now <= endTime) {
                if (testState !== 'live') setTestState('live');
                setTimeRemaining(formatDistanceToNowStrict(endTime));
            } else {
                if (testState !== 'ended') setTestState('ended');
                setTimeRemaining('Ended');
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime, endTime, testState, isAdmin]);

    const startTest = async () => {
        setIsGenerating(true);
        if (!user || !userData) {
            toast({ title: 'Auth Required', description: 'Please login again.', variant: 'destructive' });
            setIsGenerating(false);
            return;
        }

        try {
            const { quizId } = await generateLiveMockTest({ 
                liveTestId: test.id,
                questionPaperId: test.questionPaperId,
                examCategory: userData.examCategory,
                language: selectedLanguage,
                testTitle: test.title,
            });

            if (!isAdmin && !hasTakenTest) {
                await markLiveTestAsTaken(user.uid, test.id);
                setUserData(prev => prev ? ({ ...prev, liveTestsTaken: [...(prev.liveTestsTaken || []), test.id] }) : null);
            }

            router.push(`/quiz/${quizId}`);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Could not start test.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    if (!startTime || !endTime) return <Card><CardContent className="p-6 flex justify-center"><Loader2 className="animate-spin" /></CardContent></Card>;

    return (
        <Card className="border-primary/20 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
            <CardHeader className="text-center">
                <CardTitle className="text-lg text-primary">{test.title}</CardTitle>
                <CardDescription>{format(startTime, 'dd/MM/yyyy p')}</CardDescription>
                {hasTakenTest && <div className="flex justify-center mt-1"><Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">Attempted</Badge></div>}
            </CardHeader>
            <CardContent className="space-y-4 flex-grow text-center">
                 {!isAdmin && (
                     <div className="bg-muted p-3 rounded-md">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{testState === 'upcoming' ? 'Starts In' : 'Ends In'}</p>
                        <p className="text-xl font-bold">{timeRemaining}</p>
                    </div>
                 )}
                 <div className="text-left space-y-1.5">
                    <Label className="text-xs">Language</Label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{availableLanguages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                 </div>
            </CardContent>
            <CardFooter>
                <Button onClick={startTest} disabled={isGenerating || (testState === 'upcoming' && !isAdmin)} className={cn("w-full", hasTakenTest ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700")}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (hasTakenTest ? <Repeat className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />)}
                    {testState === 'upcoming' && !isAdmin ? `Starts in ${timeRemaining}` : (hasTakenTest ? "Retake Test" : "Start Weekly Test")}
                </Button>
            </CardFooter>
        </Card>
    );
}