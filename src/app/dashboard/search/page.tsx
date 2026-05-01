"use client";

import React, { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDashboard } from "@/context/dashboard-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, BookOpen, FileText, BrainCircuit, ChevronRight, ArrowLeft } from 'lucide-react';
import { getQuestionBankDocuments } from '@/lib/firestore';
import { generateMCQs } from '@/ai/flows/generate-mcqs';
import Link from 'next/link';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

function getSnippet(content: string, query: string): { text: string, matchedQuestion: string | null, matchedQuestionObj: any | null } {
    if (!content) return { text: "", matchedQuestion: null, matchedQuestionObj: null };
    let cleanText = content;
    
    // Check if it's stringified JSON
    if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(content);
            const questions = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || []);
            // Search inside questions
            for (const q of questions) {
                if (q.question && q.question.toLowerCase().includes(query)) {
                    return { text: `MCQ: "${q.question}"`, matchedQuestion: q.question, matchedQuestionObj: q };
                }
                if (q.options && Array.isArray(q.options)) {
                    for (const opt of q.options) {
                        if (opt && opt.toLowerCase().includes(query)) {
                            return { text: `Option: "...${opt}..."`, matchedQuestion: q.question, matchedQuestionObj: q };
                        }
                    }
                }
                if (q.solution && q.solution.toLowerCase().includes(query)) {
                    return { text: `Solution: "...${q.solution}..."`, matchedQuestion: q.question, matchedQuestionObj: q };
                }
                if (q.explanation && q.explanation.toLowerCase().includes(query)) {
                    return { text: `Explanation: "...${q.explanation}..."`, matchedQuestion: q.question, matchedQuestionObj: q };
                }
            }
        } catch (e) {
            // Not valid JSON or parse failed, treat as raw text
        }
    }
    
    // Fallback: Raw text search
    const index = cleanText.toLowerCase().indexOf(query);
    if (index === -1) return { text: "", matchedQuestion: null };
    
    const start = Math.max(0, index - 40);
    const end = Math.min(cleanText.length, index + query.length + 40);
    let snippet = cleanText.substring(start, end);
    if (start > 0) snippet = "..." + snippet;
    if (end < cleanText.length) snippet = snippet + "...";
    
    // Remove unwanted JSON artifacts if any leaked through
    return { text: snippet.replace(/["'{}[\]]/g, '').trim(), matchedQuestion: null, matchedQuestionObj: null };
}

export default function SearchPage() {
    return (
        <React.Suspense fallback={<div className="flex h-[50vh] w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
            <SearchContent />
        </React.Suspense>
    );
}

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get('q') || '';
    
    const { topics, studyMaterials, syllabusMCQs, userData, isLoading } = useDashboard();
    const [searchTerm, setSearchTerm] = useState(query);
    const [questionBank, setQuestionBank] = useState<any[]>([]);
    const [isBankLoading, setIsBankLoading] = useState(false);

    React.useEffect(() => {
        if (!userData?.examCategory) return;
        
        async function loadBank() {
            setIsBankLoading(true);
            try {
                const docs = await getQuestionBankDocuments();
                setQuestionBank(docs);
            } catch (error) {
                console.error("Error loading question bank:", error);
            } finally {
                setIsBankLoading(false);
            }
        }
        
        loadBank();
    }, [userData?.examCategory]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;
        router.push(`/dashboard/search?q=${encodeURIComponent(searchTerm)}`);
    };

    const results = useMemo(() => {
        if (isLoading || !userData) return { topics: [], materials: [], mcqs: [] };

        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) return { topics: [], materials: [], mcqs: [] };

        const selectedExam = userData.examCategory || 'MTS';

        // Helper for multi-word search
        const matchesQuery = (fields: (string | undefined | null)[]) => {
            const keywords = lowerQuery.split(/\s+/).filter(Boolean);
            if (keywords.length === 0) return true;
            return keywords.every(kw => 
                fields.some(f => f && f.toLowerCase().includes(kw))
            );
        };

        // Filter Topics
        const filteredTopics = (topics || []).filter(t => {
            const matchesExam = t.examCategories?.includes(selectedExam as any);
            const matchesText = matchesQuery([t.title, t.description, t.material, t.material_ta, t.material_hi]);
            return matchesExam && matchesText;
        }).map(t => {
            let snippetObj = { text: "", matchedQuestion: null as string | null, matchedQuestionObj: null as any | null };
            if (t.material && matchesQuery([t.material])) snippetObj = getSnippet(t.material, lowerQuery);
            else if (t.material_ta && matchesQuery([t.material_ta])) snippetObj = getSnippet(t.material_ta, lowerQuery);
            else if (t.material_hi && matchesQuery([t.material_hi])) snippetObj = getSnippet(t.material_hi, lowerQuery);
            else snippetObj = getSnippet(t.description || "", lowerQuery);
            return { ...t, snippet: snippetObj.text, matchedQuestion: snippetObj.matchedQuestion, matchedQuestionObj: snippetObj.matchedQuestionObj };
        });

        // Create Virtual Materials from Topics containing text guides
        const virtualMaterials = (topics || []).filter(t => t.material || t.material_ta || t.material_hi).map(t => ({
            id: `v_${t.id}`,
            topicId: t.id,
            fileName: t.title,
            fileType: 'docx',
            content: t.material || "",
            content_ta: t.material_ta || "",
            content_hi: t.material_hi || "",
            examCategories: t.examCategories,
            uploadedAt: new Date()
        }));

        const allMaterials = [...(studyMaterials || []), ...virtualMaterials];

        // Filter Materials
        const filteredMaterials = allMaterials.filter(m => {
            const topic = (topics || []).find(t => t.id === m.topicId);
            const matchesExam = topic 
                ? topic.examCategories?.includes(selectedExam as any) 
                : m.examCategories?.includes(selectedExam as any);
                
            const matchesText = matchesQuery([m.fileName, m.fileName_ta, m.fileName_hi, m.content, m.content_ta, m.content_hi, m.topicName]);
            return matchesExam && matchesText;
        }).map(m => {
            let snippetObj = { text: "", matchedQuestion: null as string | null, matchedQuestionObj: null as any | null };
            if (m.content && matchesQuery([m.content])) snippetObj = getSnippet(m.content, lowerQuery);
            else if (m.content_ta && matchesQuery([m.content_ta])) snippetObj = getSnippet(m.content_ta, lowerQuery);
            else if (m.content_hi && matchesQuery([m.content_hi])) snippetObj = getSnippet(m.content_hi, lowerQuery);
            return { ...m, snippet: snippetObj.text, matchedQuestion: snippetObj.matchedQuestion, matchedQuestionObj: snippetObj.matchedQuestionObj };
        });

        // Filter MCQs
        const filteredMcqs = (syllabusMCQs || []).filter(m => {
            const topic = (topics || []).find(t => t.id === m.topicId);
            const matchesExam = topic 
                ? topic.examCategories?.includes(selectedExam as any) 
                : (m.examCategory === selectedExam || m.examCategories?.includes(selectedExam as any) || !m.examCategory);
                
            const matchesText = matchesQuery([m.fileName, m.fileName_ta, m.fileName_hi, m.content, m.content_ta, m.content_hi, m.topicName]);
            return matchesExam && matchesText;
        }).map(m => {
            let snippetObj = { text: "", matchedQuestion: null as string | null, matchedQuestionObj: null as any | null };
            if (m.content && matchesQuery([m.content])) snippetObj = getSnippet(m.content, lowerQuery);
            else if (m.content_ta && matchesQuery([m.content_ta])) snippetObj = getSnippet(m.content_ta, lowerQuery);
            else if (m.content_hi && matchesQuery([m.content_hi])) snippetObj = getSnippet(m.content_hi, lowerQuery);
            return { ...m, snippet: snippetObj.text, matchedQuestion: snippetObj.matchedQuestion, matchedQuestionObj: snippetObj.matchedQuestionObj };
        });

        // Filter MCQ Bank
        const filteredMcqBank = (questionBank || []).filter(m => {
            let isAllowed = false;
            const userCat = userData.examCategory;
            
            if (userData?.email && ["shanmugasundaram.tsm@gmail.com", "admin@anjalkaran.in"].includes(userData.email)) {
                isAllowed = true;
            } else if (userCat === 'IP' || userCat === 'GROUP B') {
                isAllowed = m.examCategory === 'IP' || m.examCategory === 'GROUP B';
            } else if (userCat === 'PA') {
                isAllowed = m.examCategory === 'PA' || m.examCategory === 'POSTMAN' || m.examCategory === 'MTS';
            } else if (userCat === 'POSTMAN') {
                isAllowed = m.examCategory === 'POSTMAN' || m.examCategory === 'MTS';
            } else if (userCat === 'MTS') {
                isAllowed = m.examCategory === 'MTS';
            }

            const matchesText = matchesQuery([m.fileName, m.content]);
            return isAllowed && matchesText;
        }).map(m => {
            const snippetObj = getSnippet(m.content || "", lowerQuery);
            return { ...m, snippet: snippetObj.text, matchedQuestion: snippetObj.matchedQuestion, matchedQuestionObj: snippetObj.matchedQuestionObj, isBank: true };
        });

        return {
            topics: filteredTopics,
            materials: filteredMaterials,
            mcqs: [...filteredMcqs, ...filteredMcqBank]
        };
    }, [query, topics, studyMaterials, syllabusMCQs, userData, isLoading, questionBank]);

    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center flex-col gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium text-slate-500 animate-pulse">Searching knowledge base...</p>
            </div>
        );
    }

    const totalResults = results.topics.length + results.materials.length + results.mcqs.length;

    return (
        <div className="max-w-5xl mx-auto space-y-8 py-6">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full hover:bg-slate-100"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Search Results</h1>
                    <p className="text-sm text-slate-500">
                        {query ? `Found ${totalResults} results for "${query}"` : "Search across your active course"}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSearchSubmit} className="relative group max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-red-600 transition-colors" />
                <Input
                    placeholder="Search topics, MCQs, or study guides..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 bg-white border-slate-200 rounded-2xl shadow-sm focus-visible:ring-red-600 focus-visible:border-red-600 transition-all text-base"
                />
                <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold">
                    Search
                </Button>
            </form>

            {query && (
                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="bg-slate-100 p-1 h-12 rounded-xl border border-slate-200 mb-6">
                        <TabsTrigger value="all" className="rounded-lg px-4 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-red-600">
                            All ({totalResults})
                        </TabsTrigger>
                        <TabsTrigger value="topics" className="rounded-lg px-4 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-red-600">
                            Topics ({results.topics.length})
                        </TabsTrigger>
                        <TabsTrigger value="materials" className="rounded-lg px-4 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-red-600">
                            Materials ({results.materials.length})
                        </TabsTrigger>
                        <TabsTrigger value="mcqs" className="rounded-lg px-4 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-red-600">
                            MCQs ({results.mcqs.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-8 focus-visible:ring-0">
                        {totalResults === 0 ? (
                            <EmptySearchState query={query} />
                        ) : (
                            <>
                                {results.topics.length > 0 && (
                                    <Section title="Matching Topics">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {results.topics.map(t => (
                                                <TopicResultCard key={t.id} topic={t} />
                                            ))}
                                        </div>
                                    </Section>
                                )}

                                {results.materials.length > 0 && (
                                    <Section title="Study Materials">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {results.materials.map(m => (
                                                <MaterialResultCard key={m.id} material={m} topics={topics} />
                                            ))}
                                        </div>
                                    </Section>
                                )}

                                {results.mcqs.length > 0 && (
                                    <Section title="MCQ Sets">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {results.mcqs.map(m => (
                                                <McqResultCard key={m.id} mcq={m} topics={topics} />
                                            ))}
                                        </div>
                                    </Section>
                                )}
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="topics" className="focus-visible:ring-0">
                        {results.topics.length === 0 ? <EmptySearchState query={query} /> : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {results.topics.map(t => <TopicResultCard key={t.id} topic={t} />)}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="materials" className="focus-visible:ring-0">
                        {results.materials.length === 0 ? <EmptySearchState query={query} /> : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {results.materials.map(m => <MaterialResultCard key={m.id} material={m} topics={topics} />)}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="mcqs" className="focus-visible:ring-0">
                        {results.mcqs.length === 0 ? <EmptySearchState query={query} /> : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {results.mcqs.map(m => <McqResultCard key={m.id} mcq={m} topics={topics} />)}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="h-4 w-1 bg-red-600 rounded-full" />
                {title}
            </h2>
            {children}
        </div>
    );
}

function TopicResultCard({ topic }: { topic: any }) {
    return (
        <Card className="hover:border-red-200 transition-all duration-300 hover:shadow-md cursor-pointer bg-white">
            <Link href={`/dashboard/topic-wise-mcq/${topic.id}`}>
                <CardHeader className="p-4 flex flex-row items-center gap-4 pb-2">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 flex-shrink-0">
                        <BrainCircuit className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-bold truncate">{topic.title}</CardTitle>
                        <CardDescription className="text-xs truncate">{topic.description || "Interactive syllabus test"}</CardDescription>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                </CardHeader>
                {topic.snippet && (
                    <CardContent className="px-4 pb-4 pt-0">
                        <p className="text-xs text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-100/80 font-medium leading-relaxed">
                            {topic.snippet}
                        </p>
                    </CardContent>
                )}
            </Link>
        </Card>
    );
}

function MaterialResultCard({ material, topics }: { material: any, topics: any[] }) {
    const topic = topics?.find(t => t.id === material.topicId);
    return (
        <Card className="hover:border-red-200 transition-all duration-300 hover:shadow-md cursor-pointer bg-white">
            <Link href={`/dashboard/read-material/${material.id}`}>
                <CardHeader className="p-4 flex flex-row items-center gap-4 pb-2">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-bold truncate">{topic?.title || "General Study Guide"}</CardTitle>
                        <CardDescription className="text-xs truncate">
                            Study Document
                        </CardDescription>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                </CardHeader>
                {material.snippet && (
                    <CardContent className="px-4 pb-4 pt-0">
                        <p className="text-xs text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-100/80 font-medium leading-relaxed">
                            {material.snippet}
                        </p>
                    </CardContent>
                )}
            </Link>
        </Card>
    );
}

function McqResultCard({ mcq, topics }: { mcq: any, topics: any[] }) {
    const { user, userData } = useDashboard();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = React.useState(false);

    const topic = topics?.find(t => t.id === mcq.topicId);
    const linkHref = mcq.isBank 
        ? "/dashboard/mock-test/previous-year" 
        : `/dashboard/topic-wise-mcq/${mcq.topicId}`;

    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        
        // If we matched a specific question, just show it
        if (mcq.matchedQuestionObj) {
            setIsDialogOpen(true);
            return;
        }

        if (mcq.isBank) {
            // Let the standard Link handle Question Bank redirections
            router.push(linkHref);
            return;
        }

        if (isGenerating) return;

        setIsGenerating(true);
        try {
            if (!user || !userData) {
                router.push('/auth/login');
                return;
            }

            const res: any = await generateMCQs({
                topic: topic?.title || mcq.topicTitle || "Topic MCQs",
                category: topic?.categoryId || "uncategorized",
                numberOfQuestions: mcq.matchedQuestion ? 1 : 25, // default quantity or 1 for specific
                examCategory: userData.examCategory,
                part: topic?.part,
                material: topic?.material,
                userId: user.uid,
                topicId: mcq.topicId,
                language: 'English',
                specificQuestionText: mcq.matchedQuestion,
            });

            if (res && res.quizId) {
                router.push(`/quiz/${res.quizId}`);
            } else {
                console.error("Exam Generation Failed", res?.error);
            }
        } catch (error) {
            console.error("Error generating exam on click:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const cardContent = (
        <>
            <CardHeader className="p-4 flex flex-row items-center gap-4 pb-2">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 flex-shrink-0">
                    <BookOpen className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-bold truncate">
                        {mcq.matchedQuestionObj 
                            ? mcq.matchedQuestionObj.question 
                            : (mcq.isBank 
                                ? `${mcq.examCategory || "General"} Previous Paper` 
                                : (topic?.title || "Topic MCQs"))}
                    </CardTitle>
                    <CardDescription className="text-xs truncate">
                        {mcq.matchedQuestionObj 
                            ? `From: ${topic?.title || mcq.topicTitle || "Question Bank"}` 
                            : (mcq.isBank 
                                ? `MCQ Bank (${mcq.examYear || 'Past Year'})` 
                                : `Interactive Test`)}
                    </CardDescription>
                </div>
                {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-red-600 flex-shrink-0" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                )}
            </CardHeader>
            {mcq.snippet && (
                <CardContent className="px-4 pb-4 pt-0">
                    <p className="text-xs text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-100/80 font-medium leading-relaxed">
                        {mcq.snippet}
                    </p>
                </CardContent>
            )}
        </>
    );

    return (
        <>
            <Card 
                onClick={mcq.matchedQuestionObj ? handleClick : (!mcq.isBank ? handleClick : undefined)} 
                className={cn(
                    "hover:border-red-200 transition-all duration-300 hover:shadow-md bg-white",
                    (mcq.matchedQuestionObj || !mcq.isBank) ? "cursor-pointer" : "",
                    isGenerating ? 'opacity-70 pointer-events-none' : ''
                )}
            >
                {mcq.isBank && !mcq.matchedQuestionObj ? (
                    <Link href={linkHref}>
                        {cardContent}
                    </Link>
                ) : (
                    cardContent
                )}
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Question Overview</DialogTitle>
                    </DialogHeader>
                    {mcq.matchedQuestionObj && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">{mcq.matchedQuestionObj.question}</h3>
                            <div className="space-y-2">
                                {mcq.matchedQuestionObj.options?.map((opt: string, i: number) => {
                                    const isCorrect = opt === mcq.matchedQuestionObj.correctAnswer;
                                    return (
                                        <div key={i} className={cn("p-3 rounded-lg border", isCorrect ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-100")}>
                                            <div className="flex items-center gap-2">
                                                {isCorrect && <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />}
                                                <span className={cn(isCorrect && "text-green-700 font-medium")}>{opt}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            {(mcq.matchedQuestionObj.solution || mcq.matchedQuestionObj.explanation) && (
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-900 border border-blue-100">
                                    <span className="font-semibold block mb-1">Explanation:</span>
                                    {mcq.matchedQuestionObj.solution || mcq.matchedQuestionObj.explanation}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function EmptySearchState({ query }: { query: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <Search className="h-10 w-10 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-800">No results found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
                We couldn't find anything matching "{query}" in your active course materials or topics.
            </p>
        </div>
    );
}
