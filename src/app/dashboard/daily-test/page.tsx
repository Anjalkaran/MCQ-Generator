"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle, CalendarCheck, Clock, Share2, Calendar, Sparkles, BookOpen, ChevronRight, CheckCircle2, Trophy, Search, Hash } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { generateLiveMockTest } from "@/ai/flows/generate-live-mock-test";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FadeIn, SlideUp, StaggerContainer, StaggerItem, HoverScale } from '@/components/animations/motion-wrapper';
import type { DailyTest } from "@/lib/types";
import { format, isToday, isYesterday, startOfMonth } from "date-fns";
import { cn, normalizeDate } from "@/lib/utils";
import { CountdownTimer } from "@/components/ui/countdown-timer";

const allLanguages = ["English", "Tamil", "Hindi", "Telugu", "Kannada"] as const;
const ipLanguages = ["English", "Hindi"] as const;

function DailyTestCard({ test, index }: { test: DailyTest; index: number }) {
    const { user, userData } = useDashboard();
    const { toast } = useToast();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

    const isIPUser = userData?.examCategory === 'IP';
    const availableLanguages = isIPUser ? ipLanguages : allLanguages;

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
                weeklyTestId: undefined,
                dailyTestId: test.id, 
                questionPaperId: test.questionPaperId,
                examCategory: userData.examCategory,
                language: selectedLanguage,
                testTitle: test.title,
                duration: test.duration || undefined,
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
        const message = `Check out "${test.title}" on Anjalkaran! Daily Test for your preparation. Practice now: https://anjalkaran.in`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const createdDate = test.createdAt ? normalizeDate(test.createdAt) : null;
    const isNew = createdDate ? isToday(createdDate) : false;

    return (
        <Card 
            className={cn(
                "group relative overflow-hidden transition-all duration-300 h-full flex flex-col",
                "border-primary/10 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1",
                "bg-gradient-to-br from-white to-gray-50/50"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
        >
            {isNew && (
                <div className="absolute top-3 right-3 z-10">
                    <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse ring-4 ring-red-500/20" />
                </div>
            )}

            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className={cn(
                        "p-2.5 rounded-xl transition-colors group-hover:scale-110 duration-300",
                        isNew ? "bg-red-50 text-red-600" : "bg-primary/5 text-primary"
                    )}>
                        <BookOpen className="h-5 w-5" />
                    </div>
                    {createdDate && (
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {isToday(createdDate) ? 'Today' : isYesterday(createdDate) ? 'Yesterday' : format(createdDate, 'MMM d')}
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-2 mt-4">
                    <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {test.title}
                    </CardTitle>
                    {test.duration && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 w-fit px-2 py-0.5 rounded-full border border-amber-100">
                            <Clock className="h-3 w-3" />
                            {test.duration} Minutes
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-2 flex-grow">
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        Language
                    </Label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger className="h-9 text-xs bg-white/50 border-primary/10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {availableLanguages.map(l => (
                                <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>

            <CardFooter className="gap-2 pt-2 pb-6 px-6">
                <Button 
                    onClick={startTest} 
                    disabled={isGenerating} 
                    className={cn(
                        "flex-1 h-10 relative overflow-hidden transition-all duration-300",
                        "bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 border-none shadow-lg shadow-red-500/20 active:scale-95 text-xs font-bold"
                    )}
                >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Test"}
                </Button>
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleShare}
                    className="h-10 w-10 border-primary/10"
                >
                    <Share2 className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
}

function DailyTestSpotlight({ test }: { test: DailyTest }) {
    const { user, userData } = useDashboard();
    const { toast } = useToast();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

    const availableLanguages = userData?.examCategory === 'IP' ? ipLanguages : allLanguages;
    const createdDate = test.createdAt ? normalizeDate(test.createdAt) : null;

    const startTest = async () => {
        setIsGenerating(true);
        try {
            const { quizId } = await generateLiveMockTest({ 
                dailyTestId: test.id, 
                questionPaperId: test.questionPaperId,
                examCategory: userData?.examCategory || 'MTS',
                language: selectedLanguage,
                testTitle: test.title,
                duration: test.duration || undefined,
            });
            if (quizId) router.push(`/quiz/${quizId}`);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Card className="relative overflow-hidden border-2 border-red-500/20 bg-gradient-to-br from-white via-white to-red-50/30 shadow-2xl rounded-[2.5rem]">
            <div className="absolute top-0 right-0 p-8">
                <Badge className="bg-red-600 text-white animate-bounce shadow-lg shadow-red-500/20 border-none px-4 py-1.5 rounded-full font-bold">TODAY'S SPECIAL</Badge>
            </div>
            
            <div className="grid md:grid-cols-5 gap-0 items-stretch">
                <div className="md:col-span-3 p-8 sm:p-12 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-6 text-red-600 font-bold tracking-widest text-xs uppercase">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {createdDate ? format(createdDate, 'EEEE, dd MMMM yyyy') : 'Live Now'}
                            </div>
                            {test.duration && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-red-50 rounded-lg">
                                    <Clock className="h-4 w-4" />
                                    {test.duration} MINUTES
                                </div>
                            )}
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                            {test.title}
                        </h2>
                        <p className="text-slate-500 text-lg leading-relaxed max-w-xl">
                            Challenge yourself with today's specialized assessment. Fresh questions designed to test your core conceptual understanding.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-6 pt-4">
                        <div className="space-y-2 w-full sm:w-48">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Preparation Language</Label>
                            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableLanguages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <Button 
                            onClick={startTest} 
                            disabled={isGenerating}
                            className="w-full sm:w-auto h-16 px-10 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-lg shadow-xl shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            {isGenerating ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <PlayCircle className="h-6 w-6 mr-3" />}
                            START PRACTICE NOW
                        </Button>
                    </div>
                </div>

                <div className="hidden md:flex md:col-span-2 relative bg-red-600 overflow-hidden items-center justify-center">
                    <div className="absolute inset-0 opacity-10">
                        {[...Array(20)].map((_, i) => <Hash key={i} className="absolute h-12 w-12 text-white" style={{ top: `${Math.random()*100}%`, left: `${Math.random()*100}%` }} />)}
                    </div>
                    <div className="relative text-center space-y-6 text-white p-8">
                        <div className="h-24 w-24 bg-white/20 backdrop-blur-xl rounded-3xl mx-auto flex items-center justify-center ring-4 ring-white/10">
                            <Trophy className="h-12 w-12" />
                        </div>
                        <div>
                            <div className="text-4xl font-black">100%</div>
                            <div className="text-xs font-bold uppercase tracking-widest opacity-80 mt-1">Difficulty Match</div>
                        </div>
                        <p className="text-xs font-medium leading-relaxed opacity-70">Based on strict exam blueprints for your curriculum.</p>
                    </div>
                </div>
            </div>
        </Card>
    );
}

function DailyTestArchiveItem({ test }: { test: DailyTest }) {
    const { userData } = useDashboard();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const createdDate = test.createdAt ? normalizeDate(test.createdAt) : null;

    const startTest = async () => {
        setIsGenerating(true);
        try {
            const { quizId } = await generateLiveMockTest({ 
                dailyTestId: test.id, 
                questionPaperId: test.questionPaperId,
                examCategory: userData?.examCategory || 'MTS',
                language: 'English',
                testTitle: test.title,
                duration: test.duration || undefined,
            });
            if (quizId) router.push(`/quiz/${quizId}`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 transition-all group">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                    <BookOpen className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-red-700 transition-colors line-clamp-1">{test.title}</h4>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span className="flex items-center gap-1 font-medium italic">
                            <Calendar className="h-2.5 w-2.5" />
                            {createdDate ? format(createdDate, 'MMM dd, yyyy') : 'No Date'}
                        </span>
                    </div>
                </div>
            </div>
            <Button 
                onClick={startTest} 
                disabled={isGenerating}
                variant="ghost" 
                size="sm" 
                className="h-9 px-4 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
            >
                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                Revise
            </Button>
        </div>
    );
}

export default function DailyTestPage() {
    const { dailyTests, isLoading, userData } = useDashboard();
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    if (isLoading) return (
        <div className="flex flex-col h-[70vh] items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-red-600 opacity-20" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Synchronizing assessment bank...</p>
        </div>
    );

    const userCategory = userData?.examCategory || 'MTS';

    const filteredTests = (dailyTests || []).filter(test => {
        const cats = (test.examCategories || []).map(c => c.toUpperCase());
        const userCatUpper = userCategory.toUpperCase();
        const singularCat = (test as any).examCategory?.toUpperCase();
        
        const scheduledDate = test.scheduledAt ? normalizeDate(test.scheduledAt) : null;
        const isScheduledForFuture = scheduledDate && scheduledDate > new Date();
        if (isScheduledForFuture) return false;

        const matchesCat = cats.includes(userCatUpper) || singularCat === userCatUpper;
        const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
    });

    const nextUpcomingTest = (dailyTests || [])
        .filter(test => {
            const cats = (test.examCategories || []).map(c => c.toUpperCase());
            const userCatUpper = userCategory.toUpperCase();
            const singularCat = (test as any).examCategory?.toUpperCase();
            const isMatch = cats.includes(userCatUpper) || singularCat === userCatUpper;
            
            const scheduledDate = test.scheduledAt ? normalizeDate(test.scheduledAt) : null;
            const isScheduledForFuture = scheduledDate && scheduledDate > new Date();
            return isMatch && isScheduledForFuture;
        })
        .sort((a, b) => {
            const dateA = normalizeDate(a.scheduledAt)?.getTime() || 0;
            const dateB = normalizeDate(b.scheduledAt)?.getTime() || 0;
            return dateA - dateB;
        })[0];

    const sortedTests = [...filteredTests].sort((a, b) => {
        const dateA = a.createdAt ? (normalizeDate(a.createdAt)?.getTime() || 0) : 0;
        const dateB = b.createdAt ? (normalizeDate(b.createdAt)?.getTime() || 0) : 0;
        return dateB - dateA;
    });

    const spotlight = sortedTests[0];
    const recent = sortedTests.slice(1, 7);
    const archive = sortedTests.slice(7);

    // Group Archive by Month
    const groupedArchive = archive.reduce((acc, test) => {
        const date = test.createdAt ? normalizeDate(test.createdAt) : null;
        if (!date) return acc;
        const monthKey = format(date, 'MMMM yyyy');
        if (!acc[monthKey]) acc[monthKey] = [];
        acc[monthKey].push(test);
        return acc;
    }, {} as Record<string, DailyTest[]>);

    return (
        <div className="space-y-12 pb-24 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-2">
                <div className="space-y-2">
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900">
                        Daily <span className="text-red-600">Practice</span>
                    </h1>
                    <p className="text-slate-500 font-medium">Bite-sized assessments released every 24 hours for <span className="text-red-600">{userCategory}</span>.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-80">
                    <div className="relative w-full group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Find specific topics..." 
                            className="h-12 pl-11 rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-red-500/20"
                        />
                    </div>
                </div>
            </div>

            {nextUpcomingTest && (
                <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-red-600 via-red-500 to-amber-500 p-12 text-white shadow-2xl shadow-red-200/50 mx-2">
                    <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 h-80 w-80 bg-white/10 rounded-full blur-[80px]" />
                    <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 h-80 w-80 bg-black/10 rounded-full blur-[80px]" />
                    
                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="space-y-6 text-center md:text-left flex-1">
                            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-xs uppercase tracking-[0.2em]">
                                <Sparkles className="h-4 w-4 animate-pulse" />
                                Premium Release Schedule
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9]">
                                Next Practice <br/>
                                <span className="opacity-50">Is Incoming.</span>
                            </h2>
                            <p className="text-white/80 max-w-lg text-lg font-semibold leading-relaxed">
                                Get ready for <span className="text-white underline decoration-white/40 decoration-4 underline-offset-4">{nextUpcomingTest.title}</span>. Precision crafted for the <span className="underline decoration-white/40">{userCategory}</span> curriculum.
                            </p>
                        </div>
                        
                        <div className="flex flex-col items-center gap-6 p-10 bg-white rounded-[2.5rem] shadow-2xl shadow-black/20 text-slate-900 border-4 border-red-50/50 scale-105 sm:scale-110">
                            <div className="text-[11px] font-black text-red-600 uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="flex h-3 w-3 rounded-full bg-red-600 animate-ping" />
                                LIVE IN
                            </div>
                            <CountdownTimer 
                                targetDate={normalizeDate(nextUpcomingTest.scheduledAt) || new Date()} 
                                className="bg-transparent border-none shadow-none p-0" 
                            />
                        </div>
                    </div>
                </div>
            )}

            {sortedTests.length > 0 ? (
                <div className="space-y-16">
                    {/* spotlight */}
                    {!searchQuery && spotlight && (
                        <FadeIn>
                            <SectionHeading title="Today's Challenge" subtitle="Your primary target for today's session" icon={Sparkles} />
                            <DailyTestSpotlight test={spotlight} />
                        </FadeIn>
                    )}

                    {/* recent */}
                    {recent.length > 0 && (
                        <div className="space-y-8">
                            <SectionHeading title="Recent Sessions" subtitle="Missed a test? Catch up on the last few days" icon={Clock} />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {recent.map((test, i) => <DailyTestCard key={test.id} test={test} index={i} />)}
                            </div>
                        </div>
                    )}

                    {/* Archive */}
                    {(archive.length > 0) && (
                        <div className="space-y-8">
                            <SectionHeading title="Concept Library" subtitle="The vault of all previous assessments" icon={Library} />
                            
                            <Accordion type="single" collapsible className="w-full space-y-4">
                                {Object.entries(groupedArchive).map(([month, tests], idx) => (
                                    <AccordionItem key={month} value={`item-${idx}`} className="border-none bg-slate-50/50 rounded-3xl overflow-hidden px-2">
                                        <AccordionTrigger className="hover:no-underline px-6 h-16 font-bold text-slate-700">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="h-5 w-5 text-red-500" />
                                                {month}
                                                <Badge variant="secondary" className="ml-2 bg-white text-slate-500 border-slate-100">{tests.length} Tests</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pb-4">
                                            <div className="grid sm:grid-cols-2 gap-3 pt-2">
                                                {tests.map(test => <DailyTestArchiveItem key={test.id} test={test} />)}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    )}
                </div>
            ) : (
                <EmptyState userCategory={userCategory} onRefresh={() => router.refresh()} nextUpcomingTest={nextUpcomingTest} />
            )}
        </div>
    );
}

function SectionHeading({ title, subtitle, icon: Icon }: any) {
    return (
        <div className="flex items-center gap-4 mb-8 px-2">
            <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-600/20">
                <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-0.5">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h3>
                <p className="text-sm font-semibold text-slate-400">{subtitle}</p>
            </div>
        </div>
    );
}

const Library = ({ className }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 7h6"/><path d="M8 11h8"/><path d="M8 15h6"/></svg>
);

function EmptyState({ userCategory, onRefresh, nextUpcomingTest }: any) {
    return (
        <div className="py-24 flex flex-col items-center justify-center text-center space-y-8 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 mx-2">
            {!nextUpcomingTest && (
                <div className="p-10 rounded-full bg-red-50 text-red-200 scale-125 mb-4 border border-red-100 shadow-inner">
                    <BookOpen className="h-16 w-16 text-red-400" />
                </div>
            )}
            
            <div className="space-y-4">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                    {nextUpcomingTest ? "More Content Incoming" : "Vault Empty"}
                </h3>
                <p className="text-slate-500 max-w-sm mx-auto leading-relaxed font-semibold">
                    {nextUpcomingTest 
                        ? `The scheduled challenge "${nextUpcomingTest.title}" will unlock automatically.`
                        : `Our curators are currently preparing fresh practice sets for ${userCategory}.`
                    }
                </p>
            </div>

            {nextUpcomingTest && (
                <div className="bg-white p-8 rounded-[2rem] border-2 border-red-50 shadow-xl shadow-red-100/50">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">RELEASING IN</div>
                    <CountdownTimer targetDate={normalizeDate(nextUpcomingTest.scheduledAt) || new Date()} className="bg-transparent border-none shadow-none p-0" />
                </div>
            )}

            <Button onClick={onRefresh} variant="outline" className="mt-4 h-14 px-10 rounded-2xl border-red-200 text-red-600 hover:bg-white transition-all shadow-sm font-bold">
                <Loader2 className="h-5 w-5 mr-3" /> {nextUpcomingTest ? "Update Dashboard" : "Check for Updates"}
            </Button>
        </div>
    );
}
