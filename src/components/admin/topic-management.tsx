
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
import { addCategory, addTopic, deleteTopic, deleteCategory } from '@/lib/firestore';
import type { Topic, Category, QuizData } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, Upload } from 'lucide-react';
import { generateMCQs } from '@/ai/flows/generate-mcqs';
import { useRouter } from 'next/navigation';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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
  numberOfQuestions: z.coerce.number().min(3).max(50),
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
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [isLoading, setIsLoading] = useState(false);
  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [isTopicDialogOpen, setTopicDialogOpen] = useState(false);
  const { toast } = useToast();

  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', examCategory: '' },
  });

  const topicForm = useForm<z.infer<typeof topicSchema>>({
    resolver: zodResolver(topicSchema),
    defaultValues: { title: '', description: '', categoryId: '' },
  });
  
  const materialForm = useForm<z.infer<typeof materialSchema>>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      topicId: '',
      numberOfQuestions: 10,
    },
  });

  const onCategorySubmit = async (values: z.infer<typeof categorySchema>) => {
    setIsLoading(true);
    try {
      const newCategoryDoc = await addCategory(values);
      const newCategory = { id: newCategoryDoc.id, ...values };
      setCategories(prev => [...prev, newCategory].sort((a,b) => a.name.localeCompare(b.name)));
      toast({ title: 'Success', description: 'New category added.' });
      categoryForm.reset();
      setCategoryDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add category.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const onTopicSubmit = async (values: z.infer<typeof topicSchema>) => {
    setIsLoading(true);
    try {
      const topicData = { ...values, description: values.description || '', icon: 'default' };
      const newTopicDoc = await addTopic(topicData);
      const newTopic = { id: newTopicDoc.id, ...topicData };
      setTopics(prev => [...prev, newTopic].sort((a,b) => a.title.localeCompare(b.title)));
      toast({ title: 'Success', description: 'New topic added.' });
      topicForm.reset();
      setTopicDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add topic.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const onMaterialSubmit = async (values: z.infer<typeof materialSchema>) => {
    setIsLoading(true);
    const selectedTopic = topics.find(t => t.id === values.topicId);
     if (!selectedTopic) {
        toast({ title: 'Error', description: 'Topic not found.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }

    try {
        const file = values.file;
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = async (event) => {
            const fileAsDataUri = event.target?.result as string;

            try {
                const { mcqs } = await generateMCQs({
                    topic: selectedTopic.title,
                    numberOfQuestions: values.numberOfQuestions,
                    topicMaterial: fileAsDataUri
                });

                if (!mcqs || mcqs.length === 0) {
                    toast({ title: 'Quiz Generation Failed', description: 'The AI could not generate a quiz from the document.', variant: 'destructive' });
                    setIsLoading(false);
                    return;
                }
                
                const quizData: QuizData = {
                    topic: { id: selectedTopic.id, title: selectedTopic.title, description: `Quiz from uploaded material: ${file.name}`, icon: 'default', categoryId: selectedTopic.categoryId },
                    mcqs: mcqs,
                };
                
                localStorage.setItem(`quiz-${selectedTopic.id}`, JSON.stringify(quizData));
                router.push(`/quiz/${selectedTopic.id}`);

            } catch (e: any) {
                console.error('Error in quiz generation from material:', e);
                toast({ title: 'Error', description: e.message || 'Failed to generate quiz from document.', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            toast({ title: 'Error', description: 'Failed to read the uploaded file.', variant: 'destructive' });
            setIsLoading(false);
        };
    } catch (error) {
        console.error('Error setting up file reader:', error);
        toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
        setIsLoading(false);
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
    <Card>
        <CardHeader>
            <CardTitle>Topic & Category Management</CardTitle>
            <CardDescription>Add, view, and manage all quiz categories and topics.</CardDescription>
        </CardHeader>
        <CardContent>
           <Tabs defaultValue="categories">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="categories">Manage Categories ({categories.length})</TabsTrigger>
                <TabsTrigger value="topics">Manage Topics ({topics.length})</TabsTrigger>
                <TabsTrigger value="materials">Upload Material</TabsTrigger>
              </TabsList>

              <TabsContent value="categories">
                <div className="flex justify-end mb-4">
                  <Dialog open={isCategoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Category</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                        <DialogDescription>Create a new category to group your quiz topics.</DialogDescription>
                      </DialogHeader>
                       <Form {...categoryForm}>
                        <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4 py-4">
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                           <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isLoading}>
                              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Create Category
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
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
                <div className="flex justify-end mb-4">
                  <Dialog open={isTopicDialogOpen} onOpenChange={setTopicDialogOpen}>
                    <DialogTrigger asChild>
                      <Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Topic</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Topic</DialogTitle>
                        <DialogDescription>Add a new topic to an existing category.</DialogDescription>
                      </DialogHeader>
                      <Form {...topicForm}>
                        <form onSubmit={topicForm.handleSubmit(onTopicSubmit)} className="space-y-4 py-4">
                          <FormField
                            control={topicForm.control}
                            name="categoryId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={categories.length === 0}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
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
                           <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isLoading}>
                              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Create Topic
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
                 <div className="border rounded-md">
                   <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Topic Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topics.map((topic) => (
                          <TableRow key={topic.id}>
                            <TableCell className="font-medium">{topic.title}</TableCell>
                            <TableCell>{getCategoryName(topic.categoryId)}</TableCell>
                            <TableCell className="text-muted-foreground">{topic.description}</TableCell>
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

               <TabsContent value="materials">
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle>Generate Quiz from Material</CardTitle>
                    <CardDescription>Upload a PDF or TXT file to generate a quiz for a specific topic.</CardDescription>
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={topics.length === 0}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a topic to generate a quiz for" /></SelectTrigger></FormControl>
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
                                name="numberOfQuestions"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Number of Questions (3-50)</FormLabel>
                                    <FormControl><Input type="number" min="3" max="50" {...field} /></FormControl>
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

                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Generate & Start Quiz
                            </Button>
                        </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
           </Tabs>
        </CardContent>
    </Card>
  );
}
