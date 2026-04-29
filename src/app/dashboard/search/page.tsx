"use client";

import React, { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDashboard } from "@/context/dashboard-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, BookOpen, FileText, BrainCircuit, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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

        // Filter Topics
        const filteredTopics = (topics || []).filter(t => {
            const matchesExam = t.examCategories?.includes(selectedExam as any);
            const matchesText = t.title.toLowerCase().includes(lowerQuery) || 
                               t.description?.toLowerCase().includes(lowerQuery);
            return matchesExam && matchesText;
        });

        // Filter Materials
        const filteredMaterials = (studyMaterials || []).filter(m => {
            const topic = (topics || []).find(t => t.id === m.topicId);
            const matchesExam = topic?.examCategories?.includes(selectedExam as any);
            const matchesText = m.fileName.toLowerCase().includes(lowerQuery) || 
                               (m.content && m.content.toLowerCase().includes(lowerQuery));
            return matchesExam && matchesText;
        });

        // Filter MCQs
        const filteredMcqs = (syllabusMCQs || []).filter(m => {
            const topic = (topics || []).find(t => t.id === m.topicId);
            const matchesExam = topic?.examCategories?.includes(selectedExam as any);
            const matchesText = m.fileName.toLowerCase().includes(lowerQuery) || 
                               (m.content && m.content.toLowerCase().includes(lowerQuery));
            return matchesExam && matchesText;
        });

        return {
            topics: filteredTopics,
            materials: filteredMaterials,
            mcqs: filteredMcqs
        };
    }, [query, topics, studyMaterials, syllabusMCQs, userData, isLoading]);

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
                <CardHeader className="p-4 flex flex-row items-center gap-4">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                        <BrainCircuit className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-bold truncate">{topic.title}</CardTitle>
                        <CardDescription className="text-xs truncate">{topic.description || "Interactive syllabus test"}</CardDescription>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                </CardHeader>
            </Link>
        </Card>
    );
}

function MaterialResultCard({ material, topics }: { material: any, topics: any[] }) {
    const topic = topics?.find(t => t.id === material.topicId);
    return (
        <Card className="hover:border-red-200 transition-all duration-300 hover:shadow-md cursor-pointer bg-white">
            <Link href={`/dashboard/read-material/${material.id}`}>
                <CardHeader className="p-4 flex flex-row items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-bold truncate">{material.fileName}</CardTitle>
                        <CardDescription className="text-xs truncate">
                            Topic: {topic?.title || "General"}
                        </CardDescription>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                </CardHeader>
            </Link>
        </Card>
    );
}

function McqResultCard({ mcq, topics }: { mcq: any, topics: any[] }) {
    const topic = topics?.find(t => t.id === mcq.topicId);
    return (
        <Card className="hover:border-red-200 transition-all duration-300 hover:shadow-md cursor-pointer bg-white">
            <Link href={`/dashboard/topic-wise-mcq/${mcq.topicId}`}>
                <CardHeader className="p-4 flex flex-row items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-bold truncate">{mcq.fileName}</CardTitle>
                        <CardDescription className="text-xs truncate">
                            Topic: {topic?.title || "General"}
                        </CardDescription>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                </CardHeader>
            </Link>
        </Card>
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
