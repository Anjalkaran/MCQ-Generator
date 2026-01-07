
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Topic, StudyMaterial } from '@/lib/types';
import { Loader2, Upload, Trash2, Search, Download, FileText } from 'lucide-react';
import { getStudyMaterials, deleteStudyMaterial } from '@/lib/firestore';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useDashboard } from '@/app/dashboard/layout';

const materialSchema = z.object({
  topicId: z.string().min(1, 'Please select a topic.'),
  file: z.instanceof(File).refine(file => file.size > 0, 'Please upload a file.'),
});

interface StudyMaterialManagementProps {
    initialTopics: Topic[];
}

export function StudyMaterialManagement({ initialTopics }: StudyMaterialManagementProps) {
    const [materials, setMaterials] = useState<StudyMaterial[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    const { topics } = useDashboard();
    
    const form = useForm<z.infer<typeof materialSchema>>({
        resolver: zodResolver(materialSchema),
    });

    useEffect(() => {
        const fetchMaterials = async () => {
            setIsLoading(true);
            try {
                const fetchedMaterials = await getStudyMaterials();
                setMaterials(fetchedMaterials);
            } catch (error) {
                console.error("Failed to fetch study materials:", error);
                toast({ title: 'Error', description: 'Could not load study materials.', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchMaterials();
    }, [toast]);
    
    const getTopicTitle = (topicId: string) => {
        return topics.find(t => t.id === topicId)?.title || 'Unknown Topic';
    };

    const filteredMaterials = useMemo(() => {
        if (!searchTerm) return materials;
        return materials.filter(m => 
            getTopicTitle(m.topicId).toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.fileName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [materials, searchTerm, topics]);

    const onSubmit = async (values: z.infer<typeof materialSchema>) => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', values.file);
        formData.append('topicId', values.topicId);

        try {
            const response = await fetch('/api/study-material/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload file.');
            }

            const { newDocument } = await response.json();
            setMaterials(prev => [newDocument, ...prev]);
            toast({ title: 'Success', description: 'Study material uploaded successfully.' });
            form.reset();

        } catch (error: any) {
            console.error("Material upload error:", error);
            toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (docId: string) => {
        try {
            await deleteStudyMaterial(docId);
            setMaterials(prev => prev.filter(m => m.id !== docId));
            toast({ title: "Success", description: "Study material deleted." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete material.", variant: "destructive" });
        }
    };
    
    const handleDownload = async (material: StudyMaterial, topicTitle: string) => {
        const { user } = useDashboard();
        if (user?.uid && user.displayName) {
             logDownload(user.uid, user.displayName, material, topicTitle).catch(console.error);
        }
        window.open(material.downloadUrl, '_blank');
    };


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Upload Study Material</CardTitle>
                    <CardDescription>Upload PDF or DOCX files for any topic. Uploading for a topic will replace any existing material.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                           <FormField
                                control={form.control}
                                name="topicId"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Topic</FormLabel>
                                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                            >
                                            {field.value ? topics.find(topic => topic.id === field.value)?.title : "Select a topic"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0" style={{minWidth: "var(--radix-popover-trigger-width)"}}>
                                        <Command>
                                            <CommandInput placeholder="Search topic..." />
                                            <CommandList>
                                                <CommandEmpty>No topic found.</CommandEmpty>
                                                <CommandGroup>
                                                {topics.map((topic) => (
                                                    <CommandItem
                                                    value={topic.title}
                                                    key={topic.id}
                                                    onSelect={() => {
                                                        form.setValue("topicId", topic.id);
                                                        setPopoverOpen(false);
                                                    }}
                                                    >
                                                    <Check className={cn("mr-2 h-4 w-4", topic.id === field.value ? "opacity-100" : "opacity-0")} />
                                                    {topic.title}
                                                    </CommandItem>
                                                ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="file"
                                render={({ field: { onChange, ...fieldProps } }) => (
                                    <FormItem>
                                        <FormLabel>Material File (.pdf, .docx)</FormLabel>
                                        <FormControl>
                                            <Input type="file" accept=".pdf,.docx" onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)} {...fieldProps} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isUploading}>
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Upload Material
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Uploaded Materials</CardTitle>
                    <CardDescription>View, download, or delete existing study materials.</CardDescription>
                    <div className="relative pt-2">
                        <Search className="absolute left-2.5 top-4 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by topic or filename..."
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
                                    <TableHead>Topic</TableHead>
                                    <TableHead>File Name</TableHead>
                                    <TableHead>Uploaded At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : filteredMaterials.length > 0 ? (
                                    filteredMaterials.map((material) => (
                                        <TableRow key={material.id}>
                                            <TableCell className="font-medium">{getTopicTitle(material.topicId)}</TableCell>
                                            <TableCell>{material.fileName}</TableCell>
                                            <TableCell>{format(new Date(material.uploadedAt), "dd/MM/yyyy")}</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleDownload(material, getTopicTitle(material.topicId))}><Download className="h-4 w-4" /></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will permanently delete the material "{material.fileName}". This action cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(material.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center">No study materials found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
