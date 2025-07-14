
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addCategory, addTopic, deleteTopic, deleteCategory, updateCategory, updateTopic } from '@/lib/firestore';
import type { Topic, Category } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, Upload, Edit } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

const examCategories = ["MTS", "POSTMAN", "PA"] as const;
const parts = ["Part A", "Part B"] as const;

const categorySchema = z.object({
  name: z.string().min(2, { message: 'Category name must be at least 2 characters.' }),
  part: z.enum(parts, { required_error: 'You must select a part.'}),
  examCategories: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one exam category.",
  }),
});

const topicSchema = z.object({
  title: z.string().min(3, { message: 'Topic title is required.' }),
  description: z.string().optional(),
  categoryId: z.string({ required_error: 'Please select a category.' }),
});

const materialSchema = z.object({
    topicId: z.string().min(1, 'Please select a topic.'),
    file: z.instanceof(FileList).refine(files => files?.length > 0, 'File is required.'),
});

interface TopicManagementProps {
    initialCategories: Category[];
    initialTopics: Topic[];
}

export function TopicManagement({ initialCategories, initialTopics }: TopicManagementProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [isLoadingTopic, setIsLoadingTopic] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [uploadCategoryId, setUploadCategoryId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');


  const { toast } = useToast();

  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', part: 'Part A', examCategories: [] },
  });

  const topicForm = useForm<z.infer<typeof topicSchema>>({
    resolver: zodResolver(topicSchema),
    defaultValues: { title: '', description: '', categoryId: '' },
  });

  const materialForm = useForm<z.infer<typeof materialSchema>>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
        topicId: '',
        file: undefined,
    }
  });

  useEffect(() => {
    if (editingCategory) {
        categoryForm.reset(editingCategory);
    } else {
        categoryForm.reset({ name: '', part: 'Part A', examCategories: [] });
    }
  }, [editingCategory, categoryForm]);

  useEffect(() => {
    if (editingTopic) {
        topicForm.reset({
            title: editingTopic.title,
            description: editingTopic.description,
            categoryId: editingTopic.categoryId,
        });
    } else {
        topicForm.reset({ title: '', description: '', categoryId: '' });
    }
  }, [editingTopic, topicForm]);

  const onCategorySubmit = async (values: z.infer<typeof categorySchema>) => {
    setIsLoadingCategory(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, values);
        const updatedCategories = prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...values } : c).sort((a,b) => a.name.localeCompare(b.name));
        setCategories(updatedCategories);
        setSelectedCategoryId(editingCategory.id);
        toast({ title: 'Success', description: 'Category updated.' });
        setEditingCategory(null);
        setIsCategoryDialogOpen(false); 
      } else {
        const newCategoryDoc = await addCategory(values);
        const newCategory = { id: newCategoryDoc.id, ...values };
        setCategories(prev => [...prev, newCategory].sort((a,b) => a.name.localeCompare(b.name)));
        toast({ title: 'Success', description: 'New category added.' });
        categoryForm.reset({ name: '', part: 'Part A', examCategories: [] });
      }
    } catch (error) {
      toast({ title: 'Error', description: editingCategory ? 'Failed to update category.' : 'Failed to add category.', variant: 'destructive' });
    } finally {
        setIsLoadingCategory(false);
    }
  };

  const onTopicSubmit = async (values: z.infer<typeof topicSchema>) => {
    setIsLoadingTopic(true);
    try {
        if(editingTopic) {
            const topicData = { ...values, description: values.description || '' };
            await updateTopic(editingTopic.id, topicData);
            const updatedTopics = prev => prev.map(t => t.id === editingTopic.id ? { ...t, ...topicData } : t).sort((a,b) => a.title.localeCompare(b.title));
            setTopics(updatedTopics);
            setSelectedTopicId(editingTopic.id);
            toast({ title: 'Success', description: 'Topic updated.' });
            setEditingTopic(null);
            setIsTopicDialogOpen(false);
        } else {
            const topicData = { ...values, description: values.description || '', icon: 'default' };
            const newTopicDoc = await addTopic(topicData);
            const newTopic = { id: newTopicDoc.id, ...topicData };
            setTopics(prev => [...prev, newTopic].sort((a,b) => a.title.localeCompare(b.title)));
            toast({ title: 'Success', description: 'New topic added.' });
            topicForm.reset({ title: '', description: '', categoryId: values.categoryId });
        }
    } catch (error) {
      toast({ title: 'Error', description: editingTopic ? 'Failed to update topic.' : 'Failed to add topic.', variant: 'destructive' });
    } finally {
        setIsLoadingTopic(false);
    }
  };

  const onMaterialSubmit = async (values: z.infer<typeof materialSchema>) => {
    setIsUploading(true);
    const file = values.file[0];
    if (!file) {
        toast({ title: 'Error', description: 'No file selected.', variant: 'destructive' });
        setIsUploading(false);
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('topicId', values.topicId);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file.');
      }

      const result = await response.json();
      
      setTopics(prevTopics => prevTopics.map(t => t.id === values.topicId ? {...t, material: result.material} : t));

      toast({ title: 'Success', description: 'Material uploaded and saved.' });
      materialForm.reset();
      setUploadCategoryId('');

    } catch (error: any) {
        console.error("Material upload error:", error);
        toast({ title: 'Upload Failed', description: error.message || 'Could not process the file.', variant: 'destructive' });
    } finally {
        setIsUploading(false);
    }
  };


  const handleDeleteTopic = async (topicId: string) => {
    try {
        await deleteTopic(topicId);
        setTopics(prev => prev.filter(t => t.id !== topicId));
        setSelectedTopicId('');
        toast({ title: 'Success', description: 'Topic deleted.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete topic.', variant: 'destructive' });
    }
  };
  
  const handleDeleteCategory = async (categoryId: string) => {
    try {
        const topicsToDelete = topics.filter(topic => topic.categoryId === categoryId);
        await deleteCategory(categoryId, topicsToDelete);
        setCategories(prev => prev.filter(c => c.id !== categoryId));
        setTopics(prev => prev.filter(t => t.categoryId !== categoryId));
        setSelectedCategoryId('');
        toast({ title: 'Success', description: 'Category and its topics have been deleted.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete category.', variant: 'destructive' });
    }
  }

  const handleOpenCategoryDialog = (category: Category | null) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  }

  const handleOpenTopicDialog = (topic: Topic | null) => {
    setEditingTopic(topic);
    setIsTopicDialogOpen(true);
  }
  
  const fileRef = materialForm.register("file");
  const filteredUploadTopics = uploadCategoryId ? topics.filter(topic => topic.categoryId === uploadCategoryId) : [];
  
  const currentlySelectedCategory = categories.find(c => c.id === selectedCategoryId);
  const currentlySelectedTopic = topics.find(t => t.id === selectedTopicId);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
            <Dialog open={isCategoryDialogOpen} onOpenChange={(isOpen) => { setIsCategoryDialogOpen(isOpen); if (!isOpen) setEditingCategory(null); }}>
                <DialogTrigger asChild>
                    <Button onClick={() => handleOpenCategoryDialog(null)} className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Category
                    </Button>
                </DialogTrigger>
                <DialogContent>
                     <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                    </DialogHeader>
                    <Form {...categoryForm}>
                        <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                            <FormField
                            control={categoryForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Category Name</FormLabel>
                                <FormControl><Input placeholder="e.g., Basic Arithmetics" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                                control={categoryForm.control}
                                name="part"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                    <FormLabel>Part</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex space-x-4"
                                        >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="Part A" /></FormControl>
                                            <FormLabel className="font-normal">Part A</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="Part B" /></FormControl>
                                            <FormLabel className="font-normal">Part B</FormLabel>
                                        </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                            control={categoryForm.control}
                            name="examCategories"
                            render={() => (
                                <FormItem>
                                <div className="mb-4">
                                    <FormLabel className="text-base">Exam Categories</FormLabel>
                                </div>
                                <div className="space-y-2">
                                {examCategories.map((item) => (
                                    <FormField
                                    key={item}
                                    control={categoryForm.control}
                                    name="examCategories"
                                    render={({ field }) => {
                                        return (
                                        <FormItem
                                            key={item}
                                            className="flex flex-row items-start space-x-3 space-y-0"
                                        >
                                            <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(item)}
                                                onCheckedChange={(checked) => {
                                                return checked
                                                    ? field.onChange([...(field.value || []), item])
                                                    : field.onChange(
                                                        field.value?.filter(
                                                        (value) => value !== item
                                                        )
                                                    )
                                                }}
                                            />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                            {item}
                                            </FormLabel>
                                        </FormItem>
                                        )
                                    }}
                                    />
                                ))}
                                </div>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isLoadingCategory}>
                                    {isLoadingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={isTopicDialogOpen} onOpenChange={(isOpen) => { setIsTopicDialogOpen(isOpen); if (!isOpen) setEditingTopic(null); }}>
                 <DialogTrigger asChild>
                    <Button onClick={() => handleOpenTopicDialog(null)} className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Topic
                    </Button>
                </DialogTrigger>
                 <DialogContent>
                     <DialogHeader>
                        <DialogTitle>{editingTopic ? 'Edit Topic' : 'Add New Topic'}</DialogTitle>
                    </DialogHeader>
                    <Form {...topicForm}>
                        <form onSubmit={topicForm.handleSubmit(onTopicSubmit)} className="space-y-4">
                            <FormField
                                control={topicForm.control}
                                name="categoryId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={categories.length === 0}>
                                    <FormControl><SelectTrigger><SelectValue placeholder={categories.length > 0 ? "Select a category" : "Please add a category first"} /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {categories.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={topicForm.control}
                                name="title"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Topic Title</FormLabel>
                                    <FormControl><Input placeholder="e.g., Average" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={topicForm.control}
                                name="description"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl><Textarea placeholder="A short description of the topic." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsTopicDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isLoadingTopic || categories.length === 0}>
                                    {isLoadingTopic ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
             <Card>
                <CardHeader>
                    <CardTitle>Upload Material</CardTitle>
                    <CardDescription>Upload PDF or DOCX material for a topic.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...materialForm}>
                        <form onSubmit={materialForm.handleSubmit(onMaterialSubmit)} className="space-y-4">
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select 
                                    onValueChange={(value) => {
                                        setUploadCategoryId(value);
                                        materialForm.setValue('topicId', '');
                                    }} 
                                    value={uploadCategoryId} 
                                    disabled={categories.length === 0}
                                >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={categories.length > 0 ? "Select a category" : "Please add a category first"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {categories.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                                </SelectContent>
                                </Select>
                            </FormItem>
                            <FormField
                                control={materialForm.control}
                                name="topicId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Topic</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!uploadCategoryId || filteredUploadTopics.length === 0}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={!uploadCategoryId ? "Select a category first" : (filteredUploadTopics.length === 0 ? "No topics in this category" : "Select a topic")} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {filteredUploadTopics.map(topic => (<SelectItem key={topic.id} value={topic.id}>{topic.title}</SelectItem>))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={materialForm.control}
                                name="file"
                                render={() => (
                                    <FormItem>
                                        <FormLabel>Material File</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="file" 
                                                accept=".pdf,.docx"
                                                {...fileRef}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isUploading || topics.length === 0}>
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Upload Material
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Manage Content</CardTitle>
                <CardDescription>View, edit, or delete existing categories and topics.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="categories">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="categories">Categories</TabsTrigger>
                        <TabsTrigger value="topics">Topics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="categories" className="space-y-4">
                        <div className="flex items-end gap-2">
                           <div className="flex-1">
                                <Label>Select Category</Label>
                                <Select onValueChange={setSelectedCategoryId} value={selectedCategoryId} disabled={categories.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={categories.length > 0 ? "Select a category..." : "No categories found"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {currentlySelectedCategory && (
                                <>
                                 <Button variant="ghost" size="icon" onClick={() => handleOpenCategoryDialog(currentlySelectedCategory)}><Edit className="h-4 w-4" /></Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Category: {currentlySelectedCategory.name}?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete the category and all its topics. This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteCategory(currentlySelectedCategory.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            )}
                        </div>
                        {currentlySelectedCategory && (
                            <Card className="bg-muted/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">{currentlySelectedCategory.name}</CardTitle>
                                    <CardDescription>
                                        Part: <Badge variant="secondary">{currentlySelectedCategory.part}</Badge>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm font-medium">Associated Exam Types:</p>
                                     <div className="flex gap-1 flex-wrap mt-2">
                                        {currentlySelectedCategory.examCategories && currentlySelectedCategory.examCategories.map(ec => <Badge key={ec} variant="secondary">{ec}</Badge>)}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="topics" className="space-y-4">
                        <div className="flex items-end gap-2">
                             <div className="flex-1">
                                <Label>Select Topic</Label>
                                <Select onValueChange={setSelectedTopicId} value={selectedTopicId} disabled={topics.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={topics.length > 0 ? "Select a topic..." : "No topics found"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {topics.map(topic => (
                                            <SelectItem key={topic.id} value={topic.id}>{topic.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {currentlySelectedTopic && (
                                <>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenTopicDialog(currentlySelectedTopic)}><Edit className="h-4 w-4" /></Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Topic: {currentlySelectedTopic.title}?</AlertDialogTitle>
                                            <AlertDialogDescription>This action is permanent and cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteTopic(currentlySelectedTopic.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            )}
                        </div>
                        {currentlySelectedTopic && (
                             <Card className="bg-muted/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">{currentlySelectedTopic.title}</CardTitle>
                                     <CardDescription>
                                        Category: {categories.find(c => c.id === currentlySelectedTopic.categoryId)?.name || 'N/A'}
                                     </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm">{currentlySelectedTopic.description}</p>
                                    <p className="text-sm mt-4">
                                        <Badge variant={currentlySelectedTopic.material ? "default" : "secondary"}>
                                            {currentlySelectedTopic.material ? 'Material Uploaded' : 'No Material'}
                                        </Badge>
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
  );
}
