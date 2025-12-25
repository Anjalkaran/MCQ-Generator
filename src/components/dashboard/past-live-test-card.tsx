
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/app/dashboard/layout';
import { Loader2, PlayCircle, CheckCircle, Trophy, Ban, Repeat, Gem } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateLiveMockTest } from '@/ai/flows/generate-live-mock-test';
import type { LiveTest } from '@/lib/types';
import { normalizeDate } from '@/lib/utils';
import { ADMIN_EMAILS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { getExamHistoryForUser } from '@/lib/firestore';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';

const allLanguages = ["English", "Tamil", "Hindi", "Telugu", "Kannada"] as const;
const ipLanguages = ["English", "Hindi"] as const;


export const PastLiveTestCard = ({ test }: { test: LiveTest }) => {
    const { user, userData } = useDashboard();
    const { toast } = useToast();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [practiceAttempts, setPracticeAttempts] = useState(0);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

    const startTime = normalizeDate(test.startTime);
    const isIPTest = test.examCategory === 'IP';
    const availableLanguages = isIPTest ? ipLanguages : allLanguages;

    useEffect(() => {
        const checkPracticeHistory = async () => {
            if (!user) {
                setIsLoadingHistory(false);
                return;
            }
            try {
                const history = await getExamHistoryForUser(user.uid);
                const practiceQuizIdPrefix = `live-test-${test.id}`;
                const attempts = history.filter(item => item.topicId?.startsWith(practiceQuizIdPrefix)).length;
                setPracticeAttempts(attempts);
            } catch (error) {
                console.error("Failed to check practice test history:", error);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        checkPracticeHistory();
    }, [user, test.id]);
    
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
                testTitle: `${test.title} (Practice)`,
            });

            if (!quizId) {
                 throw new Error("The AI failed to generate the test questions. Please try again later.");
            }
            
            router.push(`/quiz/${quizId}`);

        } catch (error: any) {
            console.error("Error generating past live test:", error);
            toast({ title: 'Error', description: error.message || 'Could not generate the test. Please try again.', variant: 'destructive' });
        } finally {
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
                        Practice Test ({practiceAttempts} attempt(s))
                    </>
                )}
            </Button>
        );
    }
    
    const showLanguageSelect = !test.title.includes("Live Test 1") && !test.title.includes("Live Test 2");

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
                 {showLanguageSelect && (
                    <div className="space-y-2 text-left">
                        <Label htmlFor={`past-language-select-${test.id}`}>Language</Label>
                        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                            <SelectTrigger id={`past-language-select-${test.id}`}>
                                <SelectValue placeholder="Select a language" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableLanguages.map((lang) => (
                                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                 )}
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
