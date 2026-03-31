"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle, CalendarCheck, Share2, Calendar, ChevronRight, Award, Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { generateLiveMockTest } from "@/ai/flows/generate-live-mock-test";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from "@/components/ui/label";
import type { WeeklyTest, MCQHistory } from "@/lib/types";
import { format } from "date-fns";
import { getExamHistoryForUser } from "@/lib/firestore";
import { FadeIn, SlideUp, StaggerContainer, StaggerItem, HoverScale } from '@/components/animations/motion-wrapper';
import { cn } from "@/lib/utils";

const allLanguages = ["English", "Tamil", "Hindi", "Telugu", "Kannada"] as const;
const ipLanguages = ["English", "Hindi"] as const;

function WeeklyTestTimelineItem({ test, index, isLast, history }: { test: WeeklyTest; index: number; isLast: boolean; history: MCQHistory[] }) {
    const { user, userData } = useDashboard();
    const { toast } = useToast();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

    const isIPUser = userData?.examCategory === 'IP';
    const availableLanguages = isIPUser ? ipLanguages : allLanguages;

    const testScores = history
        .filter(h => h.weeklyTestId === test.id)
        .sort((a, b) => b.score - a.score);
    
    const bestScore = testScores.length > 0 ? testScores[0] : null;

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
        <StaggerItem className="relative flex gap-8 pb-12 last:pb-0">
            {/* Timeline Line */}
            {!isLast && (
                <div className="absolute left-6 top-12 bottom-0 w-1 bg-gradient-to-b from-red-200 to-transparent rounded-full" />
            )}
            
            {/* Number Indicator */}
            <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-2xl bg-white border-2 border-red-100 flex items-center justify-center shadow-sm group-hover:border-red-500 transition-colors">
                <CalendarCheck className="h-6 w-6 text-red-600" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {index + 1}
                </div>
            </div>

            {/* Content Card Alternative */}
            <div className="flex-grow p-1 rounded-3xl bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-200 transition-all duration-300 hover:shadow-xl group">
                <div className="p-6 sm:p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                    <div className="flex-grow space-y-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    bestScore ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                )}>
                                    {bestScore ? "Completed" : "Weekly Test"}
                                </span>
                                <span className="flex items-center gap-1 text-slate-400 text-xs">
                                    <Calendar className="h-3 w-3" />
                                    {test.createdAt ? format(test.createdAt, 'MMM d, yyyy') : 'Recently released'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                                    {test.title}
                                </h3>
                                {bestScore && (
                                    <div className="flex flex-col items-end">
                                        <div className="text-2xl font-black text-green-600 leading-none">
                                            {bestScore.score}/{bestScore.totalQuestions}
                                        </div>
                                        <div className="text-[10px] uppercase tracking-tighter text-slate-400 font-bold">Best Score</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center">
                                        <Award className="h-4 w-4 text-slate-400" />
                                    </div>
                                ))}
                            </div>
                            <span className="text-xs text-slate-400 font-medium">+1.5k students completed</span>
                        </div>
                    </div>

                    <div className="w-full lg:w-72 space-y-6 lg:border-l lg:border-slate-200 lg:pl-8">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest pl-1">
                                Preferred Language
                            </Label>
                            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                <SelectTrigger className="h-11 bg-white ring-red-500/10 hover:ring-red-500/20 shadow-sm border-slate-200 transition-all">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableLanguages.map(l => (
                                        <SelectItem key={l} value={l} className="focus:bg-red-50 focus:text-red-700">
                                            {l}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-2">
                            <HoverScale className="flex-grow">
                                <Button 
                                    onClick={startTest} 
                                    disabled={isGenerating} 
                                    className="w-full h-12 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 font-bold"
                                >
                                    {isGenerating ? (
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    ) : (
                                        <PlayCircle className="mr-2 h-5 w-5" />
                                    )}
                                    Start Full Test
                                </Button>
                            </HoverScale>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-12 w-12 rounded-xl text-slate-400 hover:text-green-600 hover:border-green-200 transition-colors shadow-sm"
                                onClick={handleShare}
                            >
                                <Share2 className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </StaggerItem>
    );
}

export default function WeeklyTestPage() {
    const { user, weeklyTests, isLoading, userData } = useDashboard();
    const [history, setHistory] = useState<MCQHistory[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (user?.uid) {
            getExamHistoryForUser(user.uid)
                .then(setHistory)
                .finally(() => setIsHistoryLoading(false));
        }
    }, [user?.uid]);

    if (isLoading || isHistoryLoading) {
        return (
            <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-red-600" />
                <p className="text-slate-400 font-medium animate-pulse">Designing your roadmap...</p>
            </div>
        );
    }

    const filteredTests = weeklyTests || [];

    return (
        <div className="max-w-5xl mx-auto space-y-12 py-6 px-4">
            <FadeIn>
                <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 text-white shadow-2xl">
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <CalendarCheck className="h-40 w-40 transform rotate-12" />
                    </div>
                    
                    <div className="relative z-10 space-y-6 max-w-2xl text-center sm:text-left">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm font-medium backdrop-blur-md">
                            <Trophy className="h-4 w-4 text-yellow-400" />
                            <span>Academic Roadmap</span>
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
                            Weekly <span className="text-red-500">Test</span> Series
                        </h1>
                        <p className="text-lg text-slate-300 leading-relaxed">
                            Master your syllabus with our curated weekly modules. Each test is designed by experts to reflect real exam patterns for <span className="text-white font-bold">{userData?.examCategory}</span> category.
                        </p>
                        
                        <div className="flex flex-wrap gap-8 pt-4 justify-center sm:justify-start">
                            <div className="space-y-1 text-center sm:text-left">
                                <div className="text-3xl font-bold">{filteredTests.length}</div>
                                <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Total Tests</div>
                            </div>
                            <div className="w-px h-12 bg-white/10 hidden sm:block" />
                            <div className="space-y-1 text-center sm:text-left">
                                <div className="text-3xl font-bold">120m</div>
                                <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Avg Duration</div>
                            </div>
                            <div className="w-px h-12 bg-white/10 hidden sm:block" />
                            <div className="space-y-1 text-center sm:text-left">
                                <div className="text-3xl font-bold">100%</div>
                                <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Accuracy Goal</div>
                            </div>
                        </div>
                    </div>
                </div>
            </FadeIn>

            {filteredTests.length > 0 ? (
                <StaggerContainer className="py-8 pl-4 lg:pl-12">
                    {filteredTests.map((test, index) => (
                        <WeeklyTestTimelineItem 
                            key={test.id} 
                            test={test} 
                            index={index} 
                            isLast={index === filteredTests.length - 1} 
                            history={history}
                        />
                    ))}
                </StaggerContainer>
            ) : (
                <FadeIn className="text-center py-24 border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50">
                    <CalendarCheck className="mx-auto h-20 w-20 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">No Modules Released Yet</h3>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto">
                        Our content creators are preparing the next big test for your category. Stay tuned!
                    </p>
                    <Button 
                        variant="link" 
                        onClick={() => router.push('/dashboard')}
                        className="mt-6 text-red-600 font-bold flex items-center gap-2 mx-auto"
                    >
                        Explore Other Materials <ChevronRight className="h-4 w-4" />
                    </Button>
                </FadeIn>
            )}
        </div>
    );
}