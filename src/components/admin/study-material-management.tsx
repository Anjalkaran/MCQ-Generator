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
import { Loader2, Link as LinkIcon, Trash2, Search, PlusCircle, Upload, FileText } from 'lucide-react';
import { deleteStudyMaterial } from '@/lib/firestore';
import type { Topic, StudyMaterial } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDesc, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { getFirebaseStorage, getFirebaseDb } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

const examCategories = ["MTS", "POSTMAN", "PA", "IP"] as const;

const formSchema = z.object({
  topicName: z.string().min(1, 'Display Title is required.'),
  file: z.instanceof(File).refine(file => file.type === 'application/pdf', 'Please upload a PDF file.'),
  examCategories: z.array(z.string()).min(1, "Select at least one exam category."),
});

interface StudyMaterialManagementProps {
    initialTopics: Topic[];
    initialMaterials: StudyMaterial[];
}

export function StudyMaterialManagement({ initialTopics, initialMaterials }: StudyMaterialManagementProps) {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [topics, setTopics] = useState<Topic[]>(initialTopics);
    const [materials, setMaterials] = useState<StudyMaterial[]>(initialMaterials);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            topicName: '',
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
        setIsUploading(true);
        setUploadProgress(0);
        
        const storage = getFirebaseStorage();
        const db = getFirebaseDb();
        if (!storage || !db) {
            toast({ title: 'Error', description: 'Firebase services not initialized.', variant: 'destructive' });
            setIsUploading(false);
            return;
        }

        const { topicName, file, examCategories } = values;
        const cleanFileName = file.name.replace(/[^\w-.]/g, '_');
        const storagePath = `study-materials/${Date.now()}_${cleanFileName}`;
        const storageRef = ref(storage, storagePath);

        try {
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error("Upload Error:", error);
                    toast({ 
                        title: 'Upload Failed', 
                        description: error.code === 'storage/unauthorized' ? 'Permission Denied. Please check storage rules.' : 'An error occurred during upload.',
                        variant: 'destructive' 
                    });
                    setIsUploading(false);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    
                    // Call the processing logic via API or handle it here
                    try {
                        const response = await fetch('/api/study-material/upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                topicName,
                                contentUrl: downloadURL,
                                examCategories
                            }),
                        });

                        const data = await response.json();
                        if (!response.ok) throw new Error(data.error || 'Server processing failed.');

                        const { newMaterial, newTopic } = data;
                        setMaterials(prev => [newMaterial, ...prev]);
                        if (newTopic) setTopics(prev => [...prev, newTopic]);

                        toast({ title: 'Success', description: 'Study material uploaded and AI content processed.' });
                        form.reset();
                        setIsUploadDialogOpen(false);
                    } catch (err: any) {
                        toast({ title: 'Processing Failed', description: err.message, variant: 'destructive' });
                    } finally {
                        setIsUploading(false);
                        setUploadProgress(0);
                    }
                }
            );
            
        } catch (error: any) {
            toast({ title: 'Operation Failed', description: error.message, variant: 'destructive' });
            setIsUploading(false);
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
                    <CardDescription>Upload PDF documents and manage study content. The AI will automatically extract text for Doubts.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Upload New PDF
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Upload Study Material</DialogTitle>
                                    <DialogDescription>
                                        Select a PDF file. The system will store it and prepare it for AI answering.
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
                                            name="file"
                                            render={({ field: { value, onChange, ...rest } }) => (
                                                <FormItem>
                                                <FormLabel>PDF File</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        type="file" 
                                                        accept="application/pdf"
                                                        onChange={(e) => onChange(e.target.files?.[0])}
                                                        {...rest}
                                                    />
                                                </FormControl>
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

                                        {isUploading && (
                                            <div className="space-y-2">
                                                <Progress value={uploadProgress} />
                                                <p className="text-xs text-center text-muted-foreground">{uploadProgress.toFixed(0)}% Uploaded</p>
                                            </div>
                                        )}

                                        <Button type="submit" disabled={isUploading} className="w-full">
                                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                            {isUploading ? 'Uploading...' : 'Upload & Register'}
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
                                    <TableHead>Uploaded At</TableHead>
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
                                                            <AlertDialogDesc>This will remove the material record. The PDF will remain in Storage but will no longer be linked.</AlertDialogDesc>
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