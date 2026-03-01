"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Search, Upload, FileJson } from 'lucide-react';
import { deleteWeeklyTest } from '@/lib/firestore';
import type { BankedQuestion, WeeklyTest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const categoriesList = ["MTS", "POSTMAN", "PA"] as const;

const formSchema = z.object({
  title: z.string().min(3, "Title is required."),
  examCategories: z.array(z.string()).min(1, "Select at least one category."),
  file: z.any().refine((files) => files?.length > 0, "At least one JSON question file is required.")
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
    defaultValues: { title: '', examCategories: [] }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('title', values.title);
    values.examCategories.forEach(cat => formData.append('examCategories', cat));
    
    // Append all selected files to the same key
    if (values.file) {
        Array.from(values.file as FileList).forEach(file => {
            formData.append('file', file);
        });
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
        toast({ title: "Success", description: "Weekly test created successfully with merged questions." });
        form.reset();
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
    weeklyTests.filter(t => 
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.examCategories?.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [weeklyTests, searchTerm]
  );

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Add New Weekly Test</CardTitle>
                <CardDescription>Upload one or more JSON question papers. All questions will be combined into a single test.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                name="file"
                                render={({ field: { onChange, value, ...rest } }) => (
                                    <FormItem>
                                        <FormLabel>Question Papers (JSON)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                id="weekly-test-file"
                                                type="file" 
                                                accept=".json" 
                                                multiple
                                                onChange={(e) => onChange(e.target.files)}
                                                {...rest}
                                            />
                                        </FormControl>
                                        <FormDescription>You can select multiple files to merge them.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="examCategories"
                            render={() => (
                                <FormItem>
                                    <div className="mb-2">
                                        <FormLabel>Target Exam Categories</FormLabel>
                                    </div>
                                    <div className="flex flex-wrap gap-6 p-4 border rounded-md bg-muted/20">
                                        {categoriesList.map((item) => (
                                            <FormField
                                                key={item}
                                                control={form.control}
                                                name="examCategories"
                                                render={({ field }) => {
                                                    return (
                                                        <FormItem
                                                            key={item}
                                                            className="flex flex-row items-center space-x-3 space-y-0"
                                                        >
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(item)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                            ? field.onChange([...(field.value || []), item])
                                                                            : field.onChange(
                                                                                field.value?.filter(
                                                                                    (value: string) => value !== item
                                                                                )
                                                                            )
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal cursor-pointer">
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

                        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
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
                        <CardDescription>Permanent tests available to selected courses.</CardDescription>
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
                                <TableHead>Target Courses</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTests.length > 0 ? filteredTests.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell className="font-medium">{t.title}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {t.examCategories?.map(cat => <Badge key={cat} variant="secondary" className="text-[10px]">{cat}</Badge>)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{t.createdAt ? format(t.createdAt, 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Remove Weekly Test?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will hide the test from all selected users.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(t.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No weekly tests found.</TableCell>
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
