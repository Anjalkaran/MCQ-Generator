
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addCategory, addTopic, deleteTopic, deleteCategory } from '@/lib/firestore';
import type { Topic, Category } from '@/lib/types';
import { Loader2, Trash2 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';

const categorySchema = z.object({
  name: z.string().min(2, { message: 'Category name must be at least 2 characters.' }),
  examCategory: z.string().min(1, { message: 'Please select an exam category.' }) as z.ZodType<'MTS' | 'POSTMAN' | 'PA' | 'ALL'>,
});

const topicSchema = z.object({
  title: z.string().min(3, { message: 'Topic title is required.' }),
  description: z.string().optional(),
  categoryId: z.string({ required_error: 'Please select a category.' }),
});

type GroupedTopics = {
  [key: string]: Topic[];
};

interface TopicManagementProps {
    initialCategories: Category[];
    initialTopics: Topic[];
}

export function TopicManagement({ initialCategories, initialTopics }: TopicManagementProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [isLoading, setIsLoading] = useState(false);
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
      setTopics(prev => [...prev, newTopic]);
      toast({ title: 'Success', description: 'New topic added.' });
      topicForm.reset();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add topic.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    setIsLoading(true);
    try {
        await deleteTopic(topicId);
        setTopics(prev => prev.filter(t => t.id !== topicId));
        toast({ title: 'Success', description: 'Topic deleted.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete topic.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteCategory = async (categoryId: string) => {
    setIsLoading(true);
    try {
        const topicsToDelete = topics.filter(topic => topic.categoryId === categoryId);
        await deleteCategory(categoryId, topicsToDelete);
        setCategories(prev => prev.filter(c => c.id !== categoryId));
        setTopics(prev => prev.filter(t => t.categoryId !== categoryId));
        toast({ title: 'Success', description: 'Category and its topics have been deleted.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete category.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  const groupedTopics = topics.reduce((acc, topic) => {
    const categoryName = categories.find(c => c.id === topic.categoryId)?.name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(topic);
    return acc;
  }, {} as { [key: string]: Topic[] });

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
         <Card>
            <CardHeader>
                <CardTitle>Existing Topics & Categories</CardTitle>
                <CardDescription>View and manage all topics grouped by category.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                {Object.entries(groupedTopics).map(([categoryName, topics]) => {
                  const category = categories.find(c => c.name === categoryName);
                  return (
                    <AccordionItem value={categoryName} key={category?.id || categoryName}>
                      <AccordionTrigger className='text-lg font-medium'>
                        <div className='flex justify-between items-center w-full pr-4'>
                          <div className="flex items-center gap-2">
                           {categoryName}
                           {category && <Badge variant="secondary">{category.examCategory}</Badge>}
                          </div>
                         {category && (
                           <AlertDialog>
                              <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" disabled={isLoading}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Category: {categoryName}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the category and ALL topics within it. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>Delete Category</AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                         )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2 pl-4">
                          {topics.map(topic => (
                            <li key={topic.id} className="flex items-center justify-between p-2 rounded-md border">
                              <div>
                                <p className="font-semibold">{topic.title}</p>
                                <p className="text-sm text-muted-foreground">{topic.description}</p>
                              </div>
                               <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled={isLoading}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          This will permanently delete the topic: {topic.title}. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteTopic(topic.id)}>Delete Topic</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
                </Accordion>
            </CardContent>
         </Card>
      </div>
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
                      <FormControl>
                        <Input placeholder="e.g., Basic Arithmetics" {...field} />
                      </FormControl>
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
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an exam category" />
                          </SelectTrigger>
                        </FormControl>
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
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Category
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={categories.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name} ({cat.examCategory})</SelectItem>
                          ))}
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
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Topic
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
