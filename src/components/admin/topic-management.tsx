
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
import type { Topic, Category } from '@/lib/types';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
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

interface TopicManagementProps {
    initialCategories: Category[];
    initialTopics: Topic[];
}

export function TopicManagement({ initialCategories, initialTopics }: TopicManagementProps) {
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

  const handleDeleteTopic = async (topicId: string) => {
    // No need to set loading state here as it's not disabling a global button
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

  return (
    <Card>
        <CardHeader>
            <CardTitle>Topic & Category Management</CardTitle>
            <CardDescription>Add, view, and manage all quiz categories and topics.</CardDescription>
        </CardHeader>
        <CardContent>
           <Tabs defaultValue="categories">
              <TabsList className="mb-4">
                <TabsTrigger value="categories">Manage Categories ({categories.length})</TabsTrigger>
                <TabsTrigger value="topics">Manage Topics ({topics.length})</TabsTrigger>
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
           </Tabs>
        </CardContent>
    </Card>
  );
}

    