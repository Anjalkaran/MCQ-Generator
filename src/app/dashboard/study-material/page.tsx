
"use client";

import { useState, useMemo } from 'react';
import { useDashboard } from '@/app/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Library, BookOpen, Layers, LayoutGrid, FileText, ChevronRight } from 'lucide-react';
import type { StudyMaterial, Topic, Category } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ADMIN_EMAILS } from '@/lib/constants';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

function PdfViewer({ fileUrl, fileName, isAdmin }: { fileUrl: string, fileName: string, isAdmin: boolean }) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [loadError, setLoadError] = useState<boolean>(false);

    // We use a proxy to avoid CORS errors
    const proxiedUrl = `/api/pdf-proxy?url=${encodeURIComponent(fileUrl)}`;

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setLoadError(false);
    }

    function onDocumentLoadError(error: Error) {
        console.error("PDF Load Error:", error);
        setLoadError(true);
    }

    return (
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden border-none bg-slate-950/95 backdrop-blur-xl">
            <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <DialogTitle className="text-xl font-bold text-white leading-tight">
                            {fileName}
                        </DialogTitle>
                        <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                             <FileText className="h-3 w-3" /> Exclusive Study Material • Secure Viewer
                        </p>
                    </div>
                </div>
            </DialogHeader>
            <div className="flex-grow overflow-hidden relative group">
                <ScrollArea className="h-full scrollbar-slate">
                    <div 
                        className={cn(
                            "flex flex-col items-center gap-6 p-8 min-h-full",
                            !isAdmin && "select-none"
                        )}
                        onContextMenu={(e) => !isAdmin && e.preventDefault()} // Disable right-click for non-admins
                    >
                        <Document
                            file={proxiedUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            className="flex flex-col items-center gap-8"
                            loading={
                                <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                                    <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                                    <p className="text-sm font-medium animate-pulse">Decrypting and loading material...</p>
                                </div>
                            }
                            error={
                                <div className="flex flex-col items-center justify-center p-20 text-center">
                                    <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                                        <FileText className="h-8 w-8 text-red-500" />
                                    </div>
                                    <p className="text-white font-bold text-lg mb-2">Secure Load Failed</p>
                                    <p className="text-sm text-slate-400 max-w-xs">
                                        We couldn't initialize the secure viewer for this document. Please try again later.
                                    </p>
                                </div>
                            }
                        >
                            {Array.from(new Array(numPages), (el, index) => (
                                <Page 
                                    key={`page_${index + 1}`} 
                                    pageNumber={index + 1} 
                                    renderTextLayer={true} 
                                    renderAnnotationLayer={true}
                                    className="shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden bg-white"
                                    width={Math.min(typeof window !== 'undefined' ? window.innerWidth * 0.9 : 800, 850)}
                                />
                            ))}
                        </Document>
                    </div>
                </ScrollArea>
                
                {/* Visual Security Overlay */}
                <div className="absolute inset-0 pointer-events-none border-[12px] border-slate-900/10 z-50 rounded-lg" />
            </div>
        </DialogContent>
    );
}

function MaterialCard({ material, topic }: { material: StudyMaterial, topic?: Topic }) {
    return (
        <Card className="group relative overflow-hidden border-slate-200 bg-white hover:border-primary/30 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col">
            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 text-[10px] font-bold uppercase tracking-wider">
                    Ready to Read
                </Badge>
            </div>
            
            <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-3 group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-500">
                    <FileText className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="text-sm font-bold leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
                    {topic?.title || material.fileName}
                </CardTitle>
                <CardDescription className="text-[11px] font-medium flex items-center gap-1.5 uppercase tracking-tighter">
                   {topic?.part || 'General'} • {topic?.examCategories?.join(', ') || 'All Exams'}
                </CardDescription>
            </CardHeader>
            
            <CardContent className="mt-auto pt-0">
                <div className="flex flex-col gap-3">
                    <div className="h-[1px] w-full bg-slate-100" />
                    <Button 
                        variant="ghost" 
                        className="w-full justify-between text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-primary hover:bg-primary/5 h-9"
                        asChild
                    >
                        <div>
                            Read Now
                            <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function StudyMaterialPage() {
    const { studyMaterials, topics, categories, isLoading, userData } = useDashboard();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<string>('category');
    const [selectedExam, setSelectedExam] = useState<string>(userData?.examCategory || 'MTS');
    
    const isAdmin = userData?.email && ADMIN_EMAILS.includes(userData.email);

    const processedData = useMemo(() => {
        if (isLoading || !studyMaterials || !topics) return { categorized: {}, byPaper: {}, all: [] };
        
        const filteredByExam = studyMaterials.filter(m => {
            const topic = topics.find(t => t.id === m.topicId);
            if (!topic) return false;
            // Filter by selected exam (admins can toggle, users are fixed to their category)
            return topic.examCategories?.includes(selectedExam as any);
        });

        const searchFiltered = filteredByExam.filter(material => {
            const topic = topics.find(t => t.id === material.topicId);
            const lowerFilter = searchTerm.toLowerCase();
            return topic?.title.toLowerCase().includes(lowerFilter) || material.fileName.toLowerCase().includes(lowerFilter);
        });

        // Group by Category
        const byCat: Record<string, { category: Category | undefined, materials: { material: StudyMaterial, topic?: Topic }[] }> = {};
        searchFiltered.forEach(m => {
            const topic = topics.find(t => t.id === m.topicId);
            const catId = topic?.categoryId || 'uncategorized';
            if (!byCat[catId]) {
                byCat[catId] = { 
                    category: categories.find(c => c.id === catId), 
                    materials: [] 
                };
            }
            byCat[catId].materials.push({ material: m, topic });
        });

        // Group by Paper/Part
        const byPaper: Record<string, { materials: { material: StudyMaterial, topic?: Topic }[] }> = {};
        searchFiltered.forEach(m => {
            const topic = topics.find(t => t.id === m.topicId);
            const paper = topic?.part || 'Other';
            if (!byPaper[paper]) byPaper[paper] = { materials: [] };
            byPaper[paper].materials.push({ material: m, topic });
        });

        return { 
            categorized: byCat, 
            byPaper, 
            all: searchFiltered.map(m => ({ material: m, topic: topics.find(t => t.id === m.topicId) })) 
        };

    }, [studyMaterials, topics, categories, searchTerm, isLoading, selectedExam, userData?.role]);

    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center flex-col gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium text-slate-500 animate-pulse uppercase tracking-widest">Organizing Materials...</p>
            </div>
        );
    }
    
    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-100">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                            {selectedExam} Knowledge Hub
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Study Materials</h1>
                    <p className="text-sm text-slate-500 max-w-lg">
                        Preparation guides and manuals curated for the <span className="font-bold text-slate-700 underline decoration-primary/30 decoration-2 underline-offset-4 cursor-default transition-colors hover:decoration-primary">{selectedExam}</span> competitive examination.
                    </p>
                </div>
                
                <div className="flex flex-col gap-3 w-full md:w-auto">
                    {isAdmin && (
                        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-lg w-fit self-end">
                            {['MTS', 'POSTMAN', 'PA', 'IP'].map((exam) => (
                                <button
                                    key={exam}
                                    onClick={() => setSelectedExam(exam)}
                                    className={cn(
                                        "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                                        selectedExam === exam 
                                            ? "bg-white text-primary shadow-sm scale-105" 
                                            : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {exam}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Search materials..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
                        />
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2 scrollbar-none">
                    <TabsList className="bg-slate-100 p-1 h-12 rounded-2xl border border-slate-200">
                        <TabsTrigger value="category" className="rounded-xl px-6 h-10 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-xs font-bold uppercase tracking-wider">
                            <LayoutGrid className="h-3.5 w-3.5 mr-2" />
                            By Category
                        </TabsTrigger>
                        <TabsTrigger value="paper" className="rounded-xl px-6 h-10 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-xs font-bold uppercase tracking-wider">
                            <Layers className="h-3.5 w-3.5 mr-2" />
                            By Paper / Part
                        </TabsTrigger>
                        <TabsTrigger value="all" className="rounded-xl px-6 h-10 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-xs font-bold uppercase tracking-wider">
                            <BookOpen className="h-3.5 w-3.5 mr-2" />
                            View All
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="category" className="space-y-12 mt-0 focus-visible:ring-0">
                    {Object.keys(processedData.categorized).length > 0 ? (
                        Object.entries(processedData.categorized).map(([catId, { category, materials }]) => (
                            <section key={catId} className="space-y-5">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
                                        {category?.name || 'General Materials'}
                                        <span className="ml-2 text-xs font-normal text-slate-400 lowercase">({materials.length} items)</span>
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {materials.map(({ material, topic }) => (
                                        <Dialog key={material.id}>
                                            <DialogTrigger asChild>
                                                <button className="text-left w-full outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
                                                    <MaterialCard material={material} topic={topic} />
                                                </button>
                                            </DialogTrigger>
                                            <PdfViewer fileUrl={material.content} fileName={material.fileName} isAdmin={isAdmin} />
                                        </Dialog>
                                    ))}
                                </div>
                            </section>
                        ))
                    ) : <EmptyState searchTerm={searchTerm} />}
                </TabsContent>

                <TabsContent value="paper" className="space-y-12 mt-0 focus-visible:ring-0">
                    {Object.keys(processedData.byPaper).length > 0 ? (
                        Object.entries(processedData.byPaper).map(([paper, { materials }]) => (
                            <section key={paper} className="space-y-5">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-1 bg-slate-900 rounded-full" />
                                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
                                        {paper}
                                        <span className="ml-2 text-xs font-normal text-slate-400 lowercase">({materials.length} items)</span>
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {materials.map(({ material, topic }) => (
                                        <Dialog key={material.id}>
                                            <DialogTrigger asChild>
                                                <button className="text-left w-full outline-none">
                                                    <MaterialCard material={material} topic={topic} />
                                                </button>
                                            </DialogTrigger>
                                            <PdfViewer fileUrl={material.content} fileName={material.fileName} isAdmin={isAdmin} />
                                        </Dialog>
                                    ))}
                                </div>
                            </section>
                        ))
                    ) : <EmptyState searchTerm={searchTerm} />}
                </TabsContent>

                <TabsContent value="all" className="mt-0 focus-visible:ring-0">
                    {processedData.all.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {processedData.all.map(({ material, topic }) => (
                                <Dialog key={material.id}>
                                    <DialogTrigger asChild>
                                        <button className="text-left w-full outline-none">
                                            <MaterialCard material={material} topic={topic} />
                                        </button>
                                    </DialogTrigger>
                                    <PdfViewer fileUrl={material.content} fileName={material.fileName} isAdmin={isAdmin} />
                                </Dialog>
                            ))}
                        </div>
                    ) : <EmptyState searchTerm={searchTerm} />}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function EmptyState({ searchTerm }: { searchTerm: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <div className="mx-auto bg-white p-6 rounded-3xl shadow-sm border border-slate-100 w-fit mb-6">
                <Library className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">No Materials Found</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-xs">
                {searchTerm 
                    ? `We couldn't find any documents matching "${searchTerm}". Try a different term.` 
                    : "Your study collection is currently empty. Check back later for new content."}
            </p>
        </div>
    );
}
