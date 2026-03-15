
"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Link as LinkIcon, Trash2, Search, PlusCircle, Globe, FileText } from 'lucide-react';
import { deleteStudyMaterial } from '@/lib/firestore';
import type { Topic, StudyMaterial } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDesc, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { Checkbox } from '../ui/checkbox';

const examCategories = ["MTS", "POSTMAN", "PA", "IP"] as const;

const formSchema = z.object({
  topicName: z.string().min(1, 'Display Title is required.'),
  contentUrl: z.string().url('Please enter a valid URL.').min(1, 'PDF Link is required.'),
  examCategories: z.array(z.string()).min(1, "Select at least one exam category."),
});

interface StudyMaterialManagementProps {
    initialTopics: Topic[];
    initialMaterials: StudyMaterial[];
}

export function StudyMaterialManagement({ initialTopics, initialMaterials }: StudyMaterialManagementProps) {
    const { toast } = useToast();
    const [isRegistering, setIsRegistering] = useState(false);
    const [topics, setTopics] = useState<Topic[]>(initialTopics);
    const [materials, setMaterials] = useState<StudyMaterial[]>(initialMaterials);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            topicName: '',
            contentUrl: '',
            examCategories: [],
        }
    });

    const filteredMaterials = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        return materials.filter(material => {
          const topic = topics.find(t => t.id === material.topicId);
          return topic?.title.toLowerCase().includes(lowercasedFilter) || material.fileName.toLowerCase().includes(lowercasedFilter);
        });
      }, [searchTerm, materials, topics]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsRegistering(true);
        
        try {
            const response = await fetch('/api/study-material/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server processing failed.');
            }

            const data = await response.json();
            const { newMaterial, newTopic } = data;
            
            setMaterials(prev => [newMaterial, ...prev]);
            if (newTopic) {
                setTopics(prev => [...prev, newTopic]);
            }

            toast({ title: 'Success', description: 'Study material registered successfully and AI content extracted.' });
            form.reset();
            setIsUploadDialogOpen(false);
        } catch (error: any) {
            console.error('Registration Error:', error);
            toast({ title: 'Registration Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsRegistering(false);
        }
    };
    
    const handleDelete = async (materialId: string) => {
        try {
            await deleteStudyMaterial(materialId);
            setMaterials(prev => prev.filter(m => m.id !== materialId));
            toast({ title: 'Success', description: 'Study material deleted.' });
        } catch (error) {
            toast({ title: 'Error', description: 'Could not delete the material.', variant: 'destructive' });
        }
    };
    
    const getTopicTitle = (topicId: string) => topics.find(t => t.id === topicId)?.title || 'N/A';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Study Material</CardTitle>
                    <CardDescription>Register PDF links and manage study content. The AI will automatically extract text from the link for Doubts.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Register New PDF Link
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Register Study Material</DialogTitle>
                                    <DialogDescription>
                                        Provide a direct link to a PDF. The system will fetch it and prepare it for AI answering.
                                    </DialogDescription>
                                </DialogHeader>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                        <FormField
                                            control={form.control}
                                            name="topicName"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Material Title</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Organization of the Department" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="contentUrl"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>PDF Direct Link</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://example.com/file.pdf" {...field} />
                                                </FormControl>
                                                <FormDescription>Ensure this is a direct public URL to the PDF file.</FormDescription>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                        control={form.control}
                                        name="examCategories"
                                        render={() => (
                                            <FormItem>
                                            <div className="mb-2">
                                                <FormLabel>Exam Categories</FormLabel>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/20">
                                            {examCategories.map((item) => (
                                                <FormField
                                                key={item}
                                                control={form.control}
                                                name="examCategories"
                                                render={({ field }) => (
                                                    <FormItem key={item} className="flex flex-row items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(item)}
                                                            onCheckedChange={(checked) => {
                                                            return checked
                                                                ? field.onChange([...(field.value || []), item])
                                                                : field.onChange(field.value?.filter(v => v !== item))
                                                            }}
                                                        />
                                                        </FormControl>
                                                        <FormLabel className="font-normal cursor-pointer">{item}</FormLabel>
                                                    </FormItem>
                                                )}
                                                />
                                            ))}
                                            </div>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />

                                        <Button type="submit" disabled={isRegistering} className="w-full">
                                            {isRegistering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
                                            {isRegistering ? 'Processing...' : 'Register Link'}
                                        </Button>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                        
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by title..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 w-full sm:w-[300px]"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Managed Materials</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Registered At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMaterials.length > 0 ? (
                                    filteredMaterials.map(material => (
                                        <TableRow key={material.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    {getTopicTitle(material.topicId)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">{format(new Date(material.uploadedAt), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="text-right">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Material?</AlertDialogTitle>
                                                            <AlertDialogDesc>This will remove the material record and the extracted AI text. The original link remains untouched.</AlertDialogDesc>
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
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">No study materials found.</TableCell>
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
