
"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Link as LinkIcon, Trash2, Search, PlusCircle, Globe, FileText, Upload, Edit, ExternalLink, MoreVertical, CheckCircle2, BookOpen, Clock } from 'lucide-react';
import { deleteStudyMaterial, updateTopic, updateStudyMaterial } from '@/lib/firestore';
import { getFirebaseAuth } from '@/lib/firebase';
import type { Topic, StudyMaterial, Category } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDesc, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { normalizeDate } from '@/lib/utils';
import { format } from 'date-fns';
import { Checkbox } from '../ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFirebaseStorage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const examCategories = ["MTS", "POSTMAN", "PA", "IP", "GROUP B"] as const;

const formSchema = z.object({
  topicName: z.string().min(1, 'Display Title is required.'),
  method: z.enum(['url', 'file']).default('url'),
  contentUrl: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
  file: z.any().optional(),
  examCategories: z.array(z.string()).min(1, "Select at least one exam category."),
}).refine((data) => {
  if (data.method === 'url') {
    return !!data.contentUrl && data.contentUrl.length > 0;
  }
  return true; 
}, {
  message: "PDF Link is required when using URL method.",
  path: ["contentUrl"]
});

const editFormSchema = z.object({
    topicName: z.string().min(1, 'Title is required.'),
    categoryId: z.string({ required_error: 'Please select a parent category.' }),
    examCategories: z.array(z.string()).min(1, "Select at least one category."),
});

interface StudyMaterialManagementProps {
    initialTopics: Topic[];
    initialMaterials: StudyMaterial[];
    initialCategories: Category[];
}

export function StudyMaterialManagement({ initialTopics, initialMaterials, initialCategories }: StudyMaterialManagementProps) {
    const { toast } = useToast();
    const [isRegistering, setIsRegistering] = useState(false);
    const [topics, setTopics] = useState<Topic[]>(initialTopics);
    const [materials, setMaterials] = useState<StudyMaterial[]>(initialMaterials);
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [editingItem, setEditingItem] = useState<{ material: StudyMaterial; topic: Topic } | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            topicName: '',
            method: 'url',
            contentUrl: '',
            examCategories: [],
        }
    });

    const editForm = useForm<z.infer<typeof editFormSchema>>({
        resolver: zodResolver(editFormSchema),
    });

    const filteredMaterials = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        return materials.filter(material => {
            const topic = topics.find(t => t.id === material.topicId);
            const topicTitle = (topic?.title || '').toLowerCase();
            const fileName = (material.fileName || '').toLowerCase();
            return topicTitle.includes(lowercasedFilter) || fileName.includes(lowercasedFilter);
        });
    }, [searchTerm, materials, topics]);

    const stats = useMemo(() => ({
        total: materials.length,
        mtsCount: topics.filter(t => t.examCategories?.includes('MTS')).length,
        postmanCount: topics.filter(t => t.examCategories?.includes('POSTMAN')).length,
        paCount: topics.filter(t => t.examCategories?.includes('PA')).length,
    }), [materials, topics]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsRegistering(true);
        try {
            let finalContentUrl = values.contentUrl || "";
            let fileName = values.topicName;

            if (values.method === 'file') {
                if (!values.file || values.file.length === 0) throw new Error('Please select a PDF file.');
                const storage = getFirebaseStorage();
                if (!storage) throw new Error("Firebase Storage not initialized.");

                const file = values.file[0];
                fileName = file.name;
                const storagePath = `study-materials/${Date.now()}_${fileName}`;
                const storageRef = ref(storage, storagePath);

                toast({ title: 'Uploading...', description: 'Sending file to Firebase Storage.' });
                await uploadBytes(storageRef, file, { contentType: 'application/pdf' });
                finalContentUrl = await getDownloadURL(storageRef);
            }

            if (!finalContentUrl) throw new Error('Content URL is missing.');

            const auth = getFirebaseAuth();
            const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : null;

            const response = await fetch('/api/study-material/upload', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': idToken ? `Bearer ${idToken}` : ''
                },
                body: JSON.stringify({
                    topicName: values.topicName,
                    contentUrl: finalContentUrl,
                    fileName: fileName,
                    examCategories: values.examCategories
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Server processing failed.' }));
                throw new Error(errorData.error || 'Server processing failed.');
            }

            const data = await response.json();
            const { newMaterial, newTopic } = data;
            
            setMaterials(prev => [newMaterial, ...prev]);
            if (newTopic) {
                setTopics(prev => [...prev, newTopic]);
            }

            toast({ title: 'Success', description: 'Study material registered successfully.' });
            form.reset();
            setIsUploadDialogOpen(false);
        } catch (error: any) {
            toast({ title: 'Registration Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsRegistering(false);
        }
    };

    const handleEditClick = (material: StudyMaterial) => {
        const topic = topics.find(t => t.id === material.topicId);
        if (!topic) return;
        
        setEditingItem({ material, topic });
        editForm.reset({
            topicName: topic.title,
            categoryId: topic.categoryId,
            examCategories: topic.examCategories,
        });
        setIsEditDialogOpen(true);
    };

    const onEditSubmit = async (values: z.infer<typeof editFormSchema>) => {
        if (!editingItem) return;
        setIsUpdating(true);
        try {
            // Update Topic
            await updateTopic(editingItem.topic.id, { 
                title: values.topicName, 
                categoryId: values.categoryId,
                examCategories: values.examCategories as any 
            });
            
            // Update local state
            setTopics(prev => prev.map(t => t.id === editingItem.topic.id ? { 
                ...t, 
                title: values.topicName, 
                categoryId: values.categoryId,
                examCategories: values.examCategories as any 
            } : t));
            
            // Also update fileName in StudyMaterial metadata for display consistency
            await updateStudyMaterial(editingItem.material.id, {
                fileName: values.topicName // syncing fileName for UI search convenience
            });
            setMaterials(prev => prev.map(m => m.id === editingItem.material.id ? { ...m, fileName: values.topicName } : m));

            toast({ title: 'Success', description: 'Material details updated.' });
            setIsEditDialogOpen(false);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to update.', variant: 'destructive' });
        } finally {
            setIsUpdating(false);
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
    
    const getTopic = (topicId: string) => topics.find(t => t.id === topicId);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Total Materials</p>
                                <h3 className="text-2xl font-bold">{stats.total}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Badge variant="outline" className="text-blue-600 border-blue-200">MTS</Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">MTS Topics</p>
                                <h3 className="text-2xl font-bold">{stats.mtsCount}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <Badge variant="outline" className="text-purple-600 border-purple-200">POSTMAN</Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Postman Topics</p>
                                <h3 className="text-2xl font-bold">{stats.postmanCount}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <Badge variant="outline" className="text-orange-600 border-orange-200">PA/IP</Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">PA Topics</p>
                                <h3 className="text-2xl font-bold">{stats.paCount}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-md">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                <FileText className="h-6 w-6 text-primary" />
                                Study Materials
                            </CardTitle>
                            <CardDescription>Manage academic content, PDF resources, and AI knowledge base.</CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search material..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 w-[200px] md:w-[300px] bg-muted/50 border-none focus-visible:ring-1"
                                />
                            </div>
                            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="shadow-sm">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Register New
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-xl">
                                    <DialogHeader>
                                        <DialogTitle>Add Study Material</DialogTitle>
                                        <DialogDescription>
                                            Upload a PDF or provide a direct link. Our AI will automatically process the content.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                                            <FormField
                                                control={form.control}
                                                name="topicName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Display Title</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g., Guide to Postal Manual Volume V" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="space-y-4">
                                                <Tabs defaultValue="url" onValueChange={(v) => form.setValue('method', v as 'url' | 'file')}>
                                                    <TabsList className="grid w-full grid-cols-2">
                                                        <TabsTrigger value="url"><Globe className="mr-2 h-4 w-4" /> PDF URL</TabsTrigger>
                                                        <TabsTrigger value="file"><Upload className="mr-2 h-4 w-4" /> Upload PDF</TabsTrigger>
                                                    </TabsList>
                                                    <TabsContent value="url" className="mt-4">
                                                        <FormField
                                                            control={form.control}
                                                            name="contentUrl"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <Input placeholder="https://..." {...field} />
                                                                    </FormControl>
                                                                    <FormDescription className="text-xs">Direct public link to the PDF file.</FormDescription>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </TabsContent>
                                                    <TabsContent value="file" className="mt-4">
                                                        <FormField
                                                            control={form.control}
                                                            name="file"
                                                            render={({ field: { onChange, value, ...rest } }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <Input type="file" accept=".pdf" onChange={(e) => onChange(e.target.files)} {...rest} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </TabsContent>
                                                </Tabs>
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="examCategories"
                                                render={() => (
                                                    <FormItem>
                                                        <FormLabel>Applicable Exams</FormLabel>
                                                        <div className="grid grid-cols-2 gap-3 p-4 border rounded-xl bg-muted/20">
                                                            {examCategories.map((item) => (
                                                                <FormField
                                                                    key={item}
                                                                    control={form.control}
                                                                    name="examCategories"
                                                                    render={({ field }) => (
                                                                        <FormItem key={item} className="flex flex-row items-center space-x-3 space-y-0">
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
                                                                            <Label className="font-medium text-sm cursor-pointer">{item}</Label>
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
                                                {isRegistering ? 'Processing AI Extraction...' : 'Register Material'}
                                            </Button>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-xl border border-muted-foreground/10 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[40%]">Material Title</TableHead>
                                    <TableHead>Categories</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Added Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMaterials.length > 0 ? (
                                    filteredMaterials.map(material => {
                                        const topic = getTopic(material.topicId);
                                        return (
                                            <TableRow key={material.id} className="hover:bg-muted/20 transition-colors">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-foreground">{topic?.title || 'Unknown Topic'}</span>
                                                        <span className="text-xs text-muted-foreground truncate max-w-[250px]">{material.fileName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {topic?.examCategories?.map(cat => (
                                                            <Badge key={cat} variant="secondary" className="text-[10px] uppercase py-0 px-1.5 font-bold">
                                                                {cat}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-200 flex items-center w-fit gap-1 text-[10px] py-0">
                                                        <CheckCircle2 className="h-3 w-3" /> Ready
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        {format(normalizeDate(material.uploadedAt) || new Date(), 'MMM dd, yyyy')}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                            asChild
                                                        >
                                                            <a href={material.content} target="_blank" rel="noreferrer">
                                                                <ExternalLink className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                        
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => handleEditClick(material)}>
                                                                    <Edit className="mr-2 h-4 w-4 text-blue-500" />
                                                                    Edit Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                            Delete Material
                                                                        </DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Permanent Deletion</AlertDialogTitle>
                                                                            <AlertDialogDesc>
                                                                                This will remove the material and its associated AI index. Users will no longer be able to ask doubts about this topic.
                                                                            </AlertDialogDesc>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction 
                                                                                onClick={() => handleDelete(material.id)}
                                                                                className="bg-destructive hover:bg-destructive/90"
                                                                            >
                                                                                Delete Forever
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-1">
                                                <BookOpen className="h-8 w-8 opacity-20" />
                                                <p>No study materials found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Material Details</DialogTitle>
                        <DialogDescription>Update the title and categories for this study material.</DialogDescription>
                    </DialogHeader>
                    {editingItem && (
                        <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6 pt-4">
                                <FormField
                                    control={editForm.control}
                                    name="topicName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Topic Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={editForm.control}
                                    name="categoryId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Parent Category</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select parent category" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {categories.map((cat) => (
                                                        <SelectItem key={cat.id} value={cat.id}>
                                                            {cat.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                <FormField
                                    control={editForm.control}
                                    name="examCategories"
                                    render={() => (
                                        <FormItem>
                                            <FormLabel>Applicable Exams</FormLabel>
                                            <div className="grid grid-cols-2 gap-3 p-4 border rounded-xl bg-muted/20">
                                                {examCategories.map((item) => (
                                                    <FormField
                                                        key={item}
                                                        control={editForm.control}
                                                        name="examCategories"
                                                        render={({ field }) => (
                                                            <FormItem key={item} className="flex flex-row items-center space-x-3 space-y-0">
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
                                                                <Label className="font-medium text-sm cursor-pointer">{item}</Label>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                <DialogFooter>
                                    <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={isUpdating}>
                                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Changes
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
