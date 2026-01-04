
"use client";

import { useState, useMemo } from 'react';
import { useDashboard } from '@/app/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, Search, Loader2, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';
import type { StudyMaterial } from '@/lib/types';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function PDFViewer({ material }: { material: StudyMaterial }) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [scale, setScale] = useState(1.0);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
    const resetZoom = () => setScale(1.0);
    
    return (
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader className="flex-none border-b">
                 <div className="flex justify-between items-center py-2">
                    <DialogTitle>{material.title}</DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={zoomOut} disabled={scale <= 0.5}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" onClick={resetZoom}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset ({Math.round(scale * 100)}%)
                        </Button>
                        <Button variant="outline" size="icon" onClick={zoomIn} disabled={scale >= 3.0}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </DialogHeader>
            <div className="flex-1 overflow-auto" onContextMenu={(e) => e.preventDefault()}>
                <Document
                    file={{ url: material.content }}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}
                >
                    {Array.from(new Array(numPages), (el, index) => (
                        <Page key={`page_${index + 1}`} pageNumber={index + 1} scale={scale} renderTextLayer={false} />
                    ))}
                </Document>
            </div>
        </DialogContent>
    );
}


export default function StudyMaterialPage() {
    const { user, userData, studyMaterials, isLoading } = useDashboard();
    const [searchTerm, setSearchTerm] = useState('');
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const { toast } = useToast();

    const handleDownload = async (material: StudyMaterial) => {
        if (!user || !userData) {
            toast({ title: "Authentication Error", description: "You must be logged in to download.", variant: "destructive"});
            return;
        }
        
        setDownloadingId(material.id);

        try {
            // Track the download
            await fetch('/api/track-download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.uid,
                    userName: userData.name,
                    materialId: material.id,
                    fileTitle: material.title,
                    fileName: material.fileName,
                }),
            });
            
            // Initiate the download
            const link = document.createElement("a");
            link.href = material.content;
            link.download = material.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Download failed:", error);
            toast({ title: "Error", description: "Could not start the download.", variant: "destructive"});
        } finally {
            setDownloadingId(null);
        }
    };


    const filteredMaterials = useMemo(() => {
        const materials = studyMaterials || [];
        if (!searchTerm) {
            return materials;
        }

        const lowercasedFilter = searchTerm.toLowerCase();
        return materials.filter(material =>
            material.title.toLowerCase().includes(lowercasedFilter)
        );
    }, [studyMaterials, searchTerm]);

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
                                    filteredMaterials.map(material => (
                                        <Dialog key={material.id}>
                                            <TableRow>
                                                <TableCell className="font-medium">{material.title}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <DialogTrigger asChild>
                                                            <Button>
                                                                <BookOpen className="mr-2 h-4 w-4" />
                                                                Read Material
                                                            </Button>
                                                        </DialogTrigger>
                                                        <Button variant="outline" onClick={() => handleDownload(material)} disabled={downloadingId === material.id}>
                                                            {downloadingId === material.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                                            Download
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            <PDFViewer material={material} />
                                        </Dialog>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">
                                            {searchTerm ? "No materials match your search." : "No study materials have been uploaded yet."}
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
