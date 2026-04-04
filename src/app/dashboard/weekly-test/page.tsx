"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle, CalendarCheck, Share2, Calendar, ChevronRight, Award, Trophy, Sparkles, HelpCircle, ClipboardCheck, Clock } from "lucide-react";
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
import { cn, normalizeDate } from "@/lib/utils";
import { CountdownTimer } from "@/components/ui/countdown-timer";

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
                duration: test.duration,
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
                                {test.duration && (
                                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-100">
                                        <Clock className="h-2.5 w-2.5" />
                                        {test.duration} MINS
                                    </span>
                                )}
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

import { Badge } from "@/components/ui/badge";

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
            <div className="flex flex-col h-[70vh] items-center justify-center space-y-4">
                <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-red-600 opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-2 w-2 bg-red-600 rounded-full animate-ping" />
                    </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-wide">Loading weekly curriculum...</p>
            </div>
        );
    }

    const userCategory = userData?.examCategory || 'MTS';

    const filteredTests = (weeklyTests || []).filter(test => {
        const cats = (test.examCategories || []).map(c => c.toUpperCase());
        const userCatUpper = userCategory.toUpperCase();
        const singularCat = (test as any).examCategory?.toUpperCase();
        
        const isScheduledForFuture = test.scheduledAt && normalizeDate(test.scheduledAt)! > new Date();
        if (isScheduledForFuture) return false;

        return cats.includes(userCatUpper) || singularCat === userCatUpper;
    });

    const nextUpcomingTest = (weeklyTests || [])
        .filter(test => {
            const cats = (test.examCategories || []).map(c => c.toUpperCase());
            const userCatUpper = userCategory.toUpperCase();
            const singularCat = (test as any).examCategory?.toUpperCase();
            const isMatch = cats.includes(userCatUpper) || singularCat === userCatUpper;
            const isScheduledForFuture = test.scheduledAt && normalizeDate(test.scheduledAt)! > new Date();
            return isMatch && isScheduledForFuture;
        })
        .sort((a,b) => normalizeDate(a.scheduledAt)!.getTime() - normalizeDate(b.scheduledAt)!.getTime())[0];

    return (
        <div className="space-y-10 pb-12">
            {/* Premium Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-500/10 via-transparent to-red-500/10 p-8 border border-white/20 shadow-xl backdrop-blur-sm">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 h-64 w-64 bg-red-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 h-64 w-64 bg-red-500/10 rounded-full blur-[100px]" />
                
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-4 text-center md:text-left flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-600 text-[11px] font-bold uppercase tracking-wider border border-red-500/20">
                            <Sparkles className="h-3 w-3" />
                            Elite Weekly Assessment
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                            Weekly Live Tests
                        </h1>
                        <p className="text-muted-foreground max-w-lg text-lg leading-relaxed">
                            Challenge yourself with comprehensive full-length mock tests for <span className="text-red-600 font-bold">{userCategory}</span> course. Simulated exam environment to track your growth.
                        </p>
                    </div>
                    
                    {nextUpcomingTest ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                NEXT CHALLENGE IN
                            </div>
                            <CountdownTimer 
                                targetDate={normalizeDate(nextUpcomingTest.scheduledAt)!} 
                                className="bg-white/80 backdrop-blur-md shadow-2xl border-2 border-red-100 rounded-[2.5rem] px-8 py-6 scale-90 sm:scale-100" 
                            />
                            <div className="text-[10px] font-bold text-slate-400 max-w-[200px] text-center leading-tight">
                                Prepare well for "{nextUpcomingTest.title}"
                            </div>
                        </div>
                    ) : (
                        <div className="hidden lg:grid grid-cols-2 gap-4 w-full max-w-md">
                            {[
                                { label: "Full Length", icon: ClipboardCheck, color: "text-red-500", bg: "bg-red-50" },
                                { label: "Rank Analysis", icon: Trophy, color: "text-amber-500", bg: "bg-amber-50" },
                                { label: "Real Timer", icon: Clock, color: "text-red-500", bg: "bg-red-50" },
                                { label: "Detailed Solutions", icon: HelpCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
                            ].map((stat, i) => (
                                <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 shadow-sm transition-transform hover:scale-[1.02]">
                                    <div className={cn("p-2 rounded-lg", stat.bg)}>
                                        <stat.icon className={cn("h-4 w-4", stat.color)} />
                                    </div>
                                    <span className="text-xs font-bold text-foreground/80">{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-white/20 pb-6">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight">Available Test Papers</h2>
                        <p className="text-sm text-muted-foreground">Recent assessments specialized for your curriculum</p>
                    </div>
                    <Badge variant="outline" className="px-4 py-1.5 rounded-lg bg-red-50 text-red-600 border-red-100 font-bold">
                        {userCategory} COURSE
                    </Badge>
                </div>

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
                    <div className="relative overflow-hidden rounded-[2rem] border-2 border-dashed border-red-500/20 bg-red-500/5 py-24 text-center">
                        <div className="absolute inset-0 bg-gradient-to-t from-red-500/5 via-transparent to-transparent opacity-50" />
                        <div className="relative flex flex-col items-center gap-4">
                            <div className="p-6 rounded-full bg-white shadow-xl text-red-200 scale-125 mb-4 border border-red-100">
                                <Trophy className="h-12 w-12" />
                            </div>
                            <h3 className="text-2xl font-bold">New Tests Coming Soon</h3>
                            <p className="text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
                                We are preparing high-quality assessment papers for the <span className="text-red-600 font-bold">{userCategory}</span> course. <br/>Check back every Sunday!
                            </p>
                            <Button 
                                variant="outline" 
                                onClick={() => router.refresh()} 
                                className="mt-4 gap-2 px-8 py-6 rounded-xl border-red-500/20 hover:bg-white transition-all shadow-sm"
                            >
                                <Loader2 className="h-4 w-4" />
                                Refresh Assessments
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}