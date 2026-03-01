"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, CalendarCheck, Search, Upload } from 'lucide-react';
import { deleteWeeklyTest } from '@/lib/firestore';
import type { BankedQuestion, WeeklyTest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

const examCategories = ["MTS", "POSTMAN", "PA", "IP"] as const;

const formSchema = z.object({
  title: z.string().min(3, "Title is required."),
  examCategory: z.enum(examCategories, { required_error: "Select a category." }),
  file: z.any().refine((files) => files?.length > 0, "Question paper JSON file is required.")
});

interface WeeklyTestManagementProps {
    initialWeeklyTests: WeeklyTest[];
    initialBankedQuestions: BankedQuestion[];
}

export function WeeklyTestManagement({ initialWeeklyTests, initialBankedQuestions }: WeeklyTestManagementProps) {
  const [weeklyTests, setWeeklyTests] = useState<WeeklyTest[]>(initialWeeklyTests);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', examCategory: undefined }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('examCategory', values.examCategory);
    if (values.file && values.file[0]) {
        formData.append('file', values.file[0]);
    }

    try {
        const response = await fetch('/api/weekly-test/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create weekly test.');
        }

        const { newTest } = await response.json();
        
        setWeeklyTests(prev => [newTest, ...prev]);
        toast({ title: "Success", description: "Weekly test created successfully." });
        form.reset();
        // Clear file input manually as reset() doesn't always handle file refs well
        const fileInput = document.getElementById('weekly-test-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
        await deleteWeeklyTest(id);
        setWeeklyTests(prev => prev.filter(t => t.id !== id));
        toast({ title: "Deleted", description: "Weekly test removed." });
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete test.", variant: "destructive" });
    }
  };

  const filteredTests = useMemo(() => 
    weeklyTests.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.examCategory.includes(searchTerm)),
    [weeklyTests, searchTerm]
  );

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Add New Weekly Test</CardTitle>
                <CardDescription>Upload a JSON question paper to make it available as a Weekly Test. This will not affect the general question bank.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Test Title</FormLabel>
                                        <FormControl><Input placeholder="e.g. Weekly Test 1" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="examCategory"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger></FormControl>
                                            <SelectContent>{examCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="file"
                                render={({ field: { onChange, value, ...rest } }) => (
                                    <FormItem>
                                        <FormLabel>Question Paper (JSON)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                id="weekly-test-file"
                                                type="file" 
                                                accept=".json" 
                                                onChange={(e) => onChange(e.target.files)}
                                                {...rest}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Add Weekly Test
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Existing Weekly Tests</CardTitle>
                        <CardDescription>These tests are always available to users in their respective categories.</CardDescription>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Course</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTests.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell className="font-medium">{t.title}</TableCell>
                                    <TableCell>{t.examCategory}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{t.createdAt ? format(t.createdAt, 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Remove Weekly Test?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will hide the test from all users. This action cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(t.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
