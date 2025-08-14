
"use client";

import { useState, useMemo } from 'react';
import { useDashboard } from '@/app/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, Search, Loader2 } from 'lucide-react';
import type { StudyMaterial } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

function StudyMaterialViewer({ material }: { material: StudyMaterial }) {
    return (
        <DialogContent className="max-w-4xl h-[90vh]">
            <DialogHeader>
                <DialogTitle>{material.title}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-full w-full rounded-md border p-4 bg-muted/40">
                <pre className="text-sm whitespace-pre-wrap font-sans">{material.content}</pre>
            </ScrollArea>
        </DialogContent>
    );
}

export default function StudyMaterialPage() {
    const { studyMaterials, isLoading } = useDashboard();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredMaterials = useMemo(() => {
        if (!searchTerm) {
            return studyMaterials;
        }

        const lowercasedFilter = searchTerm.toLowerCase();
        return studyMaterials.filter(material =>
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
                    {filteredMaterials.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                           {filteredMaterials.map(material => (
                             <Dialog key={material.id}>
                               <Card>
                                 <CardHeader>
                                   <CardTitle className="text-lg">{material.title}</CardTitle>
                                 </CardHeader>
                                 <CardContent>
                                   <DialogTrigger asChild>
                                      <Button className="w-full">
                                        <BookOpen className="mr-2 h-4 w-4" />
                                        Read Material
                                      </Button>
                                   </DialogTrigger>
                                 </CardContent>
                               </Card>
                               <StudyMaterialViewer material={material} />
                             </Dialog>
                           ))}
                         </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            <BookOpen className="mx-auto h-12 w-12 mb-4" />
                            <p className="font-semibold">No Study Materials Found</p>
                            <p className="text-sm">No materials match your search, or none have been uploaded yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
