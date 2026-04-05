"use client";

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, BookOpen, FileText, ChevronRight } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StudyMaterial } from '@/lib/types';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export function PdfViewer({ fileUrl, fileName, isAdmin = false }: { fileUrl: string, fileName: string, isAdmin?: boolean }) {
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
                <div className="absolute inset-0 pointer-events-none border-[12px] border-slate-900/10 z-50 rounded-lg" />
            </div>
        </DialogContent>
    );
}

export function HtmlReader({ content, fileName, isAdmin = false }: { content: string, fileName: string, isAdmin?: boolean }) {
    const [progress, setProgress] = useState(0);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const totalHeight = target.scrollHeight - target.clientHeight;
        const currentPosition = target.scrollTop;
        if (totalHeight > 0) {
            const scrollPercent = (currentPosition / totalHeight) * 100;
            setProgress(scrollPercent);
        }
    };

    return (
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-none bg-white">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 z-50">
                <div 
                    className="h-full bg-emerald-500 transition-all duration-150 ease-out" 
                    style={{ width: `${progress}%` }}
                />
            </div>

            <DialogHeader className="p-6 border-b bg-slate-50/50">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <DialogTitle className="text-2xl font-black text-slate-900 leading-tight">
                            {fileName}
                        </DialogTitle>
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-none font-bold text-[10px]">PREMIUM ARTICLE</Badge>
                            <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                                <BookOpen className="h-3 w-3" /> Enhanced Reading Mode • {Math.round(progress)}% read
                            </p>
                        </div>
                    </div>
                </div>
            </DialogHeader>

            <ScrollArea className="flex-grow p-8 sm:p-12" onScrollCapture={handleScroll}>
                <article className={cn(
                    "prose prose-slate lg:prose-xl max-w-4xl mx-auto prose-headings:font-black prose-headings:tracking-tight prose-p:text-slate-600 prose-p:leading-relaxed prose-strong:text-slate-900 prose-blockquote:border-red-500 prose-blockquote:bg-red-50/50 prose-blockquote:p-6 prose-blockquote:rounded-2xl pb-32",
                    !isAdmin && "select-none"
                )}>
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                </article>
            </ScrollArea>
        </DialogContent>
    );
}

export function MaterialViewer({ material, isAdmin = false }: { material: StudyMaterial, isAdmin?: boolean }) {
    const isHtml = material.fileType === 'docx' || (material.content && material.content.startsWith('<'));

    if (isHtml) {
        return <HtmlReader content={material.content} fileName={material.fileName} isAdmin={isAdmin} />;
    }

    return <PdfViewer fileUrl={material.content} fileName={material.fileName} isAdmin={isAdmin} />;
}
