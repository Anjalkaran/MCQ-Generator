"use client";

import { useState, useMemo } from 'react';
import { 
  DialogContent, 
  DialogTitle, 
  DialogDescription,
} from '@/components/ui/dialog';
import { useDashboard } from '@/context/dashboard-context';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, BookOpen, FileText, ChevronLeft } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StudyMaterial } from '@/lib/types';
import { useRouter } from 'next/navigation';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export function PdfViewer({ fileUrl, isAdmin = false }: { fileUrl: string, isAdmin?: boolean }) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [loadError, setLoadError] = useState<boolean>(false);

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
        <div className="flex-grow overflow-hidden relative group">
            <ScrollArea className="h-full scrollbar-slate">
                <div 
                    className={cn(
                        "flex flex-col items-center gap-6 p-8 min-h-full",
                        !isAdmin && "select-none"
                    )}
                    onContextMenu={(e) => !isAdmin && e.preventDefault()}
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
                                <p className="text-slate-900 font-bold text-lg mb-2">Secure Load Failed</p>
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
            <div className="absolute inset-0 pointer-events-none border-[12px] border-slate-900/10 z-50 rounded-lg" />
        </div>
    );
}

export function MaterialContent({ material, isAdmin = false, isFullPage = false }: { material: StudyMaterial, isAdmin?: boolean, isFullPage?: boolean }) {
    const [selectedLang, setSelectedLang] = useState<'en' | 'ta' | 'hi'>('en');
    const router = useRouter();
    
    const { userData } = useDashboard();
    
    // Determine if we have translations and if they are allowed for this category
    const isIpOrGroupB = userData?.examCategory === 'IP' || userData?.examCategory === 'GROUP B';
    const hasTa = !!material.content_ta && (!isIpOrGroupB || isAdmin);
    const hasHi = !!material.content_hi;

    const currentContent = useMemo(() => {
        if (selectedLang === 'ta' && material.content_ta) return material.content_ta;
        if (selectedLang === 'hi' && material.content_hi) return material.content_hi;
        return material.content;
    }, [selectedLang, material]);

    const isHtml = material.fileType === 'docx' || (currentContent && (currentContent.startsWith('<') || currentContent.startsWith('{')));

    return (
        <div className={cn(
            "flex flex-col h-full overflow-hidden",
            isHtml ? "bg-white" : "bg-slate-50"
        )}>
            {/* Header with Language Switcher */}
            <div className={cn(
                "p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 transition-all",
                isHtml ? "bg-white/80 backdrop-blur-md" : "bg-slate-900 border-slate-800"
            )}>
                <div className="flex items-center gap-4">
                    {isFullPage && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => router.back()}
                            className={cn(
                                "rounded-full transition-all",
                                isHtml ? "hover:bg-slate-100 text-slate-600" : "hover:bg-slate-800 text-slate-300"
                            )}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                    )}
                    <div className="space-y-0.5">
                        <h1 className={cn(
                            "text-lg sm:text-xl font-bold leading-tight line-clamp-1",
                            isHtml ? "text-slate-900" : "text-white"
                        )}>
                            {material.fileName}
                        </h1>
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary" className={cn(
                                "border-none font-bold text-[9px] px-2 py-0 h-5",
                                isHtml ? "bg-emerald-100 text-emerald-700" : "bg-red-500/20 text-red-400"
                            )}>
                                {isHtml ? 'PREMIUM ARTICLE' : 'SECURE PDF'}
                            </Badge>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <BookOpen className="h-3 w-3" /> Enhanced Mode
                            </p>
                        </div>
                    </div>
                </div>

                {(hasTa || hasHi) && (
                    <div className={cn(
                        "flex items-center p-1 rounded-xl shrink-0 self-center sm:self-auto shadow-sm",
                        isHtml ? "bg-slate-100" : "bg-slate-800"
                    )}>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedLang('en')}
                            className={cn(
                                "h-8 px-4 rounded-lg text-xs font-bold transition-all",
                                selectedLang === 'en' 
                                    ? "bg-white text-red-600 shadow-sm" 
                                    : isHtml ? "text-slate-500" : "text-slate-400 hover:text-white"
                            )}
                        >
                            EN
                        </Button>
                        {hasTa && (
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedLang('ta')}
                                className={cn(
                                    "h-8 px-4 rounded-lg text-xs font-bold transition-all",
                                    selectedLang === 'ta' 
                                        ? "bg-white text-red-600 shadow-sm" 
                                        : isHtml ? "text-slate-500" : "text-slate-400 hover:text-white"
                                )}
                            >
                                தமிழ்
                            </Button>
                        )}
                        {hasHi && (
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedLang('hi')}
                                className={cn(
                                    "h-8 px-4 rounded-lg text-xs font-bold transition-all",
                                    selectedLang === 'hi' 
                                        ? "bg-white text-red-600 shadow-sm" 
                                        : isHtml ? "text-slate-500" : "text-slate-400 hover:text-white"
                                )}
                            >
                                हिंदी
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-grow relative overflow-hidden">
                {isHtml ? (
                    <ScrollArea className="h-full">
                        <div className="max-w-4xl mx-auto p-4 sm:p-12 pb-32">
                           <article className={cn(
                                "prose prose-slate lg:prose-xl max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-slate-600 prose-p:leading-relaxed prose-strong:text-slate-900 prose-blockquote:border-red-500 prose-blockquote:bg-red-50/50 prose-blockquote:p-6 prose-blockquote:rounded-2xl",
                                !isAdmin && "select-none"
                            )}>
                                <div dangerouslySetInnerHTML={{ __html: currentContent }} />
                            </article>
                        </div>
                    </ScrollArea>
                ) : (
                    <PdfViewer fileUrl={material.content} isAdmin={isAdmin} />
                )}
            </div>
        </div>
    );
}

export function MaterialViewer({ material, isAdmin = false }: { material: StudyMaterial, isAdmin?: boolean }) {
    const isHtml = material.fileType === 'docx' || (material.content && (material.content.startsWith('<') || material.content.startsWith('{')));

    return (
        <DialogContent className={cn(
            "flex flex-col p-0 overflow-hidden border-none",
            isHtml ? "max-w-4xl h-[90vh]" : "max-w-5xl h-[90vh]"
        )}>
            <DialogTitle className="sr-only">{material.fileName}</DialogTitle>
            <DialogDescription className="sr-only">Read study material securely.</DialogDescription>
            <MaterialContent material={material} isAdmin={isAdmin} />
        </DialogContent>
    );
}
