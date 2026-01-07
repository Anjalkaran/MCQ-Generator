
"use client";

import { useState, useMemo } from 'react';
import { useDashboard } from '@/app/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Search, Loader2, Library } from 'lucide-react';
import type { StudyMaterial, Topic, Category } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GroupedMaterials {
  [categoryId: string]: {
    category: Category;
    topics: {
      topic: Topic;
      materials: StudyMaterial[];
    }[];
  };
}


export default function StudyMaterialPage() {
    const { studyMaterials, topics, categories, isLoading } = useDashboard();
    const [searchTerm, setSearchTerm] = useState('');

    const getTopic = (topicId: string) => topics.find(t => t.id === topicId);

    const groupedMaterials = useMemo(() => {
        if (isLoading || !studyMaterials || !topics || !categories) return {};

        const lowercasedFilter = searchTerm.toLowerCase();
        
        const filteredMaterials = searchTerm
            ? studyMaterials.filter(material => {
                const topic = getTopic(material.topicId);
                return topic?.title.toLowerCase().includes(lowercasedFilter) || material.fileName.toLowerCase().includes(lowercasedFilter);
            })
            : studyMaterials;

        return filteredMaterials.reduce((acc, material) => {
            const topic = getTopic(material.topicId);
            if (!topic) return acc;

            const category = categories.find(c => c.id === topic.categoryId);
            if (!category) return acc;

            if (!acc[category.id]) {
                acc[category.id] = { category, topics: [] };
            }

            let topicGroup = acc[category.id].topics.find(t => t.topic.id === topic.id);
            if (!topicGroup) {
                topicGroup = { topic, materials: [] };
                acc[category.id].topics.push(topicGroup);
            }
            
            topicGroup.materials.push(material);

            return acc;
        }, {} as GroupedMaterials);

    }, [studyMaterials, topics, categories, searchTerm, isLoading]);


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
                    Access notes and documents for your exam preparation.
                </p>
            </div>

             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by topic or file name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full"
                />
            </div>

            {Object.keys(groupedMaterials).length > 0 ? (
                 <Accordion type="multiple" className="w-full space-y-4">
                    {Object.values(groupedMaterials).map(({ category, topics }) => (
                         <Card key={category.id}>
                            <CardHeader>
                                <CardTitle>{category.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                 <Accordion type="single" collapsible className="w-full">
                                    {topics.map(({ topic, materials }) => (
                                        <AccordionItem value={topic.id} key={topic.id}>
                                            <AccordionTrigger className="text-lg font-semibold">{topic.title}</AccordionTrigger>
                                            <AccordionContent>
                                                <div className="flex flex-col space-y-2">
                                                {materials.map(material => (
                                                     <Dialog key={material.id}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" className="justify-between h-auto py-2">
                                                                <div className="text-left">
                                                                    <p>{material.fileName}</p>
                                                                    <p className="text-xs text-muted-foreground">{material.fileType}</p>
                                                                </div>
                                                                <Eye className="h-5 w-5" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                                                            <DialogHeader>
                                                                <DialogTitle>{material.fileName}</DialogTitle>
                                                                <DialogDescription>Topic: {topic.title}</DialogDescription>
                                                            </DialogHeader>
                                                            <ScrollArea className="flex-grow rounded-md border p-4">
                                                                <pre className="text-sm whitespace-pre-wrap">{material.content}</pre>
                                                            </ScrollArea>
                                                        </DialogContent>
                                                    </Dialog>
                                                ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </CardContent>
                        </Card>
                    ))}
                 </Accordion>
            ) : (
                <Card>
                    <CardContent className="h-48 flex flex-col items-center justify-center text-center">
                         <div className="mx-auto bg-muted p-4 rounded-full w-fit mb-4">
                            <Library className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <CardTitle>No Study Materials Found</CardTitle>
                        <CardDescription className="mt-2">
                             {searchTerm 
                                ? "No materials match your search term." 
                                : "No materials have been uploaded for your exam category yet."
                             }
                        </CardDescription>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
