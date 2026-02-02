
"use client";

import { useState, useMemo } from 'react';
import { useDashboard } from '@/app/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Search, Loader2, Library, File as FileIcon, Download, BookOpen } from 'lucide-react';
import type { StudyMaterial, Topic } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

function PdfViewer({ fileUrl, fileName }: { fileUrl: string, fileName: string }) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [loadError, setLoadError] = useState<boolean>(false);

    // We use a proxy to avoid CORS "Failed to fetch" errors when loading external PDFs
    const proxiedUrl = `/api/pdf-proxy?url=${encodeURIComponent(fileUrl)}`;

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setLoadError(false);
    }

    function onDocumentLoadError(error: Error) {
        console.error("PDF Load Error:", error);
        setLoadError(true);
    }
    
    const handleDownload = () => {
        window.open(fileUrl, '_blank');
    };

    return (
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>{fileName}</DialogTitle>
                <DialogDescription asChild>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleDownload} className="w-fit">
                           <Download className="mr-2 h-4 w-4"/> Download/Open PDF
                        </Button>
                    </div>
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow rounded-md border overflow-hidden bg-muted/20">
                <ScrollArea className="h-full">
                    <Document
                        file={proxiedUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        className="flex flex-col items-center gap-4 p-4"
                        loading={<div className="flex flex-col items-center justify-center h-full py-20"><Loader2 className="h-8 w-8 animate-spin text-primary mb-2"/><p>Loading PDF...</p></div>}
                        error={
                            <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4">
                                <p className="text-destructive font-semibold mb-2">Failed to load PDF in viewer.</p>
                                <p className="text-sm text-muted-foreground mb-4">This can happen if the link is invalid or restricted.</p>
                                <Button onClick={handleDownload}>Open Direct Link</Button>
                            </div>
                        }
                    >
                        {Array.from(new Array(numPages), (el, index) => (
                            <Page 
                                key={`page_${index + 1}`} 
                                pageNumber={index + 1} 
                                renderTextLayer={true} 
                                renderAnnotationLayer={true}
                                className="shadow-md mb-4" 
                                width={Math.min(window.innerWidth * 0.8, 800)}
                            />
                        ))}
                    </Document>
                </ScrollArea>
            </div>
        </DialogContent>
    );
}

export default function StudyMaterialPage() {
    const { studyMaterials, topics, isLoading } = useDashboard();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredMaterials = useMemo(() => {
        if (isLoading || !studyMaterials || !topics) return [];
        
        const lowercasedFilter = searchTerm.toLowerCase();
        
        return studyMaterials.filter(material => {
            const topic = topics.find(t => t.id === material.topicId);
            return topic?.title.toLowerCase().includes(lowercasedFilter) || material.fileName.toLowerCase().includes(lowercasedFilter);
        });

    }, [studyMaterials, topics, searchTerm, isLoading]);


    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Study Material</h1>
                <p className="text-muted-foreground">
                    Access and read study materials for your exam preparation.
                </p>
            </div>

            <Card>
                <CardHeader>
                     <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 w-full"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMaterials.length > 0 ? (
                                    filteredMaterials.map(material => {
                                        const topic = topics.find(t => t.id === material.topicId);

                                        return (
                                            <TableRow key={material.id}>
                                                <TableCell className="font-medium">{topic?.title || material.fileName}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button>
                                                                <BookOpen className="mr-2 h-4 w-4"/>
                                                                Read Material
                                                            </Button>
                                                        </DialogTrigger>
                                                        <PdfViewer fileUrl={material.content} fileName={material.fileName} />
                                                    </Dialog>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-48 text-center">
                                            <div className="mx-auto bg-muted p-4 rounded-full w-fit mb-4">
                                                <Library className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <p className="font-semibold">No Study Materials Found</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {searchTerm 
                                                    ? "No materials match your search." 
                                                    : "Materials will appear here once uploaded."
                                                }
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
