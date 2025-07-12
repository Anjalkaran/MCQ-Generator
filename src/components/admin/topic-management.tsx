
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addCategory, addTopic, deleteTopic, deleteCategory, updateTopicMaterial } from '@/lib/firestore';
import type { Topic, Category } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, Upload } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import pdf from 'pdf-parse';


const categorySchema = z.object({
  name: z.string().min(2, { message: 'Category name must be at least 2 characters.' }),
  examCategory: z.string().min(1, { message: 'Please select an exam category.' }) as z.ZodType<'MTS' | 'POSTMAN' | 'PA' | 'ALL'>,
});

const topicSchema = z.object({
  title: z.string().min(3, { message: 'Topic title is required.' }),
  description: z.string().optional(),
  categoryId: z.string({ required_error: 'Please select a category.' }),
});

const materialSchema = z.object({
  topicId: z.string().min(1, 'Please select a topic.'),
  file: z.instanceof(File, { message: 'Please upload a file.' }).refine(
    (file) => file.size < 5 * 1024 * 1024, // 5MB limit
    'File size must be less than 5MB.'
  ).refine(
    (file) => ['application/pdf', 'text/plain'].includes(file.type),
    'Only PDF and TXT files are allowed.'
  ),
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
  const [isLoadingMaterial, setIsLoadingMaterial] = useState(false);

  const { toast } = useToast();

  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', examCategory: 'ALL' },
  });

  const topicForm = useForm<z.infer<typeof topicSchema>>({
    resolver: zodResolver(topicSchema),
    defaultValues: { title: '', description: '', categoryId: '' },
  });
  
  const materialForm = useForm<z.infer<typeof materialSchema>>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      topicId: '',
    },
  });

  const onCategorySubmit = async (values: z.infer<typeof categorySchema>) => {
    setIsLoadingCategory(true);
    try {
      const newCategoryDoc = await addCategory(values);
      const newCategory = { id: newCategoryDoc.id, ...values };
      setCategories(prev => [...prev, newCategory].sort((a,b) => a.name.localeCompare(b.name)));
      toast({ title: 'Success', description: 'New category added.' });
      categoryForm.reset();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add category.', variant: 'destructive' });
    } finally {
        setIsLoadingCategory(false);
    }
  };

  const onTopicSubmit = async (values: z.infer<typeof topicSchema>) => {
    setIsLoadingTopic(true);
    try {
      const topicData = { ...values, description: values.description || '', icon: 'default' };
      const newTopicDoc = await addTopic(topicData);
      const newTopic = { id: newTopicDoc.id, ...topicData };
      setTopics(prev => [...prev, newTopic].sort((a,b) => a.title.localeCompare(b.title)));
      toast({ title: 'Success', description: 'New topic added.' });
      topicForm.reset();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add topic.', variant: 'destructive' });
    } finally {
        setIsLoadingTopic(false);
    }
  };

  const onMaterialSubmit = async (values: z.infer<typeof materialSchema>) => {
    setIsLoadingMaterial(true);
    const selectedTopic = topics.find(t => t.id === values.topicId);
     if (!selectedTopic) {
        toast({ title: 'Error', description: 'Topic not found.', variant: 'destructive' });
        setIsLoadingMaterial(false);
        return;
    }

    try {
        const file = values.file;
        const reader = new FileReader();
        
        reader.onerror = () => {
          toast({ title: 'Error', description: 'Failed to read the uploaded file.', variant: 'destructive' });
          setIsLoadingMaterial(false);
        };

        reader.onload = async (event) => {
            if (!event.target?.result) {
                toast({ title: 'Error', description: 'Could not read file data.', variant: 'destructive' });
                setIsLoadingMaterial(false);
                return;
            }
            const arrayBuffer = event.target.result as ArrayBuffer;
            const buffer = Buffer.from(arrayBuffer);

            try {
                let materialContent = '';
        
                if (file.type === 'application/pdf') {
                  const data = await pdf(buffer);
                  materialContent = data.text;
                } else if (file.type === 'text/plain') {
                  materialContent = buffer.toString('utf-8');
                } else {
                  throw new Error('Unsupported file type.');
                }

                await updateTopicMaterial(selectedTopic.id, materialContent);

                // Optimistically update local state
                setTopics(prevTopics => prevTopics.map(t => 
                    t.id === selectedTopic.id ? { ...t, material: materialContent } : t
                ));

                toast({ title: 'Success', description: `Material uploaded to topic: ${selectedTopic.title}` });
                materialForm.reset();

            } catch (e: any) {
                console.error('Error in material upload:', e);
                toast({ title: 'Material Upload Failed', description: e.message || 'An unexpected error occurred.', variant: 'destructive' });
            } finally {
                setIsLoadingMaterial(false);
            }
        };

        reader.readAsArrayBuffer(file);

    } catch (error) {
        console.error('Error setting up file reader:', error);
        toast({ title: 'Error', description: 'An unexpected error occurred while preparing the file.', variant: 'destructive' });
        setIsLoadingMaterial(false);
    }
  }


  const handleDeleteTopic = async (topicId: string) => {
    try {
        await deleteTopic(topicId);
        setTopics(prev => prev.filter(t => t.id !== topicId));
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
        toast({ title: 'Success', description: 'Category and its topics have been deleted.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete category.', variant: 'destructive' });
    }
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'N/A';
  }

  const fileRef = materialForm.register("file");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Add New Category</CardTitle>
                </CardHeader>
                <CardContent>
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
                            name="examCategory"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Exam Category</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select an exam category" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                    <SelectItem value="MTS">MTS</SelectItem>
                                    <SelectItem value="POSTMAN">POSTMAN</SelectItem>
                                    <SelectItem value="PA">PA</SelectItem>
                                    <SelectItem value="ALL">ALL (Common)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <Button type="submit" disabled={isLoadingCategory}>
                                {isLoadingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                Create Category
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Add New Topic</CardTitle>
                </CardHeader>
                <CardContent>
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
                                        {categories.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name} ({cat.examCategory})</SelectItem>))}
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
                            <Button type="submit" disabled={isLoadingTopic || categories.length === 0}>
                                {isLoadingTopic ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                Create Topic
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

             <Card className="border-dashed">
                <CardHeader>
                <CardTitle>Upload Material to Topic</CardTitle>
                <CardDescription>Upload a PDF or TXT file and link it to a topic.</CardDescription>
                </CardHeader>
                <CardContent>
                <Form {...materialForm}>
                    <form onSubmit={materialForm.handleSubmit(onMaterialSubmit)} className="space-y-6">
                        <FormField
                            control={materialForm.control}
                            name="topicId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Topic</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={topics.length === 0}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a topic to upload material for" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                    {topics.map(topic => (
                                        <SelectItem key={topic.id} value={topic.id}>
                                            {topic.title} ({getCategoryName(topic.categoryId)})
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={materialForm.control}
                            name="file"
                            render={({ field: { onChange, ...fieldProps } }) => (
                                <FormItem>
                                    <FormLabel>Material File (PDF or TXT, max 5MB)</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept=".pdf,.txt" {...fileRef} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={isLoadingMaterial}>
                            {isLoadingMaterial ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
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
                        <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
                        <TabsTrigger value="topics">Topics ({topics.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="categories">
                        <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Category Name</TableHead>
                                <TableHead>Exam Type</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell className="font-medium">{cat.name}</TableCell>
                                    <TableCell><Badge variant="secondary">{cat.examCategory}</Badge></TableCell>
                                    <TableCell className="text-right">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Category: {cat.name}?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete the category and all its topics. This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="topics">
                        <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Topic Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Has Material?</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topics.map((topic) => (
                                <TableRow key={topic.id}>
                                    <TableCell className="font-medium">{topic.title}</TableCell>
                                    <TableCell>{getCategoryName(topic.categoryId)}</TableCell>
                                    <TableCell>
                                        {topic.material && topic.material.length > 0 ? (
                                            <Badge variant="default">Yes</Badge>
                                        ) : (
                                            <Badge variant="secondary">No</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Topic: {topic.title}?</AlertDialogTitle>
                                            <AlertDialogDescription>This action is permanent and cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteTopic(topic.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
  );
}
