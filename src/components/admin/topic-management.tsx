
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
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';


const examCategories = ["MTS", "POSTMAN", "PA"] as const;

const categorySchema = z.object({
  name: z.string().min(2, { message: 'Category name must be at least 2 characters.' }),
  examCategories: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one exam category.",
  }),
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
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [isLoadingTopic, setIsLoadingTopic] = useState(false);

  const { toast } = useToast();

  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', examCategories: [] },
  });

  const topicForm = useForm<z.infer<typeof topicSchema>>({
    resolver: zodResolver(topicSchema),
    defaultValues: { title: '', description: '', categoryId: '' },
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
                                                    ? field.onChange([...field.value, item])
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
                            <Button type="submit" disabled={isLoadingTopic || categories.length === 0}>
                                {isLoadingTopic ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                Create Topic
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
                                <TableHead>Exam Types</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell className="font-medium">{cat.name}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {cat.examCategories.map(ec => <Badge key={ec} variant="secondary">{ec}</Badge>)}
                                        </div>
                                    </TableCell>
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
                                <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topics.map((topic) => (
                                <TableRow key={topic.id}>
                                    <TableCell className="font-medium">{topic.title}</TableCell>
                                    <TableCell>{getCategoryName(topic.categoryId)}</TableCell>
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
