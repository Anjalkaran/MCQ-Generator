
"use client";

import { useState, useMemo } from 'react';
import { useDashboard } from '@/app/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, Search, Loader2 } from 'lucide-react';
import type { Topic } from '@/lib/types';

function StudyMaterialViewer({ material }: { material: string }) {
    return (
        <DialogContent className="max-w-4xl h-[90vh]">
            <DialogHeader>
                <DialogTitle>Study Material</DialogTitle>
            </DialogHeader>
            <div className="h-full overflow-y-auto p-4 border rounded-md bg-muted/40">
                <pre className="text-sm whitespace-pre-wrap font-sans">{material}</pre>
            </div>
        </DialogContent>
    );
}


export default function StudyMaterialPage() {
    const { topics, categories, isLoading } = useDashboard();
    const [searchTerm, setSearchTerm] = useState('');

    const materials = useMemo(() => {
        const topicsWithMaterial = topics.filter(topic => topic.material && topic.material.trim() !== '');

        if (!searchTerm) {
            return topicsWithMaterial;
        }

        const lowercasedFilter = searchTerm.toLowerCase();
        return topicsWithMaterial.filter(topic =>
            topic.title.toLowerCase().includes(lowercasedFilter) ||
            categories.find(c => c.id === topic.categoryId)?.name.toLowerCase().includes(lowercasedFilter)
        );
    }, [topics, categories, searchTerm]);
    
    const materialsByCategory = useMemo(() => {
        const grouped: { [key: string]: Topic[] } = {};
        materials.forEach(topic => {
            const categoryName = categories.find(c => c.id === topic.categoryId)?.name || 'Uncategorized';
            if (!grouped[categoryName]) {
                grouped[categoryName] = [];
            }
            grouped[categoryName].push(topic);
        });
        return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
    }, [materials, categories]);


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
                    Access and read study materials uploaded for various topics.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by topic or category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 w-full"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {materialsByCategory.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {materialsByCategory.map(([categoryName, topics]) => (
                                <AccordionItem value={categoryName} key={categoryName}>
                                    <AccordionTrigger className="text-lg font-semibold">{categoryName}</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-2 pl-4">
                                            {topics.map(topic => (
                                                <Dialog key={topic.id}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" className="w-full justify-start">
                                                            <FileText className="mr-2 h-4 w-4" />
                                                            {topic.title}
                                                        </Button>
                                                    </DialogTrigger>
                                                    {topic.material && <StudyMaterialViewer material={topic.material} />}
                                                </Dialog>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
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
