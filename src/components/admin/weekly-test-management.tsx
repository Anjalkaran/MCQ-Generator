"use client";

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Search, Upload, FilePlus, List, Edit, Save, FileCode, ClipboardPaste } from 'lucide-react';
import { deleteWeeklyTest, getLiveTestQuestionPaper, updateLiveTestBankDocument } from '@/lib/firestore';
import type { BankedQuestion, WeeklyTest, MCQ } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const categoriesList = ["MTS", "POSTMAN", "PA", "IP"] as const;

const formSchema = z.object({
  title: z.string().min(3, "Title is required."),
  examCategories: z.array(z.string()).min(1, "Select at least one category."),
  method: z.enum(["file", "paste"]).default("file"),
  file: z.any().optional(),
  pastedJson: z.string().optional()
});

const appendSchema = z.object({
  method: z.enum(["file", "paste"]).default("file"),
  file: z.any().optional(),
  pastedJson: z.string().optional()
});

const mcqSchema = z.object({
    question: z.string().min(1, "Question text is required."),
    options: z.array(z.string().min(1, "Option text is required.")).length(4),
    correctAnswer: z.string().min(1, "Correct answer is required."),
    solution: z.string().optional(),
    topic: z.string().optional(),
    translations: z.record(z.object({
        question: z.string().optional(),
        options: z.array(z.string()).optional(),
        correctAnswer: z.string().optional(),
        solution: z.string().optional(),
    })).optional(),
});

interface WeeklyTestManagementProps {
    initialWeeklyTests: WeeklyTest[];
    initialBankedQuestions: BankedQuestion[];
}

export function WeeklyTestManagement({ initialWeeklyTests, initialBankedQuestions }: WeeklyTestManagementProps) {
  const [weeklyTests, setWeeklyTests] = useState<WeeklyTest[]>(initialWeeklyTests);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppending, setIsAppending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTestToAppend, setSelectedTestToAppend] = useState<WeeklyTest | null>(null);
  
  const [managingTest, setManagingTest] = useState<WeeklyTest | null>(null);
  const [testQuestions, setQuestions] = useState<MCQ[]>([]);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', examCategories: [], method: 'file', pastedJson: '' }
  });

  const appendForm = useForm<z.infer<typeof appendSchema>>({
    resolver: zodResolver(appendSchema),
    defaultValues: { method: 'file', pastedJson: '' }
  });

  const editQuestionForm = useForm<z.infer<typeof mcqSchema>>();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('title', values.title);
    values.examCategories.forEach(cat => formData.append('examCategories', cat));
    
    if (values.method === 'file') {
        if (!values.file || values.file.length === 0) {
            toast({ title: "Error", description: "Please select a JSON file.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        Array.from(values.file as FileList).forEach(file => {
            formData.append('file', file);
        });
    } else {
        if (!values.pastedJson || values.pastedJson.trim().length === 0) {
            toast({ title: "Error", description: "Please paste the JSON content.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        try {
            JSON.parse(values.pastedJson); // Validate JSON
            const blob = new Blob([values.pastedJson], { type: 'application/json' });
            formData.append('file', blob, 'pasted_questions.json');
        } catch (e) {
            toast({ title: "Invalid JSON", description: "The content you pasted is not a valid JSON. Please check the structure.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
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
        const fileInput = document.getElementById('weekly-test-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const onAppendSubmit = async (values: z.infer<typeof appendSchema>) => {
    if (!selectedTestToAppend) return;
    setIsAppending(true);

    const formData = new FormData();
    formData.append('weeklyTestId', selectedTestToAppend.id);
    
    if (values.method === 'file') {
        if (!values.file || values.file.length === 0) {
            toast({ title: "Error", description: "Please select a JSON file.", variant: "destructive" });
            setIsAppending(false);
            return;
        }
        Array.from(values.file as FileList).forEach(file => {
            formData.append('file', file);
        });
    } else {
        if (!values.pastedJson || values.pastedJson.trim().length === 0) {
            toast({ title: "Error", description: "Please paste the JSON content.", variant: "destructive" });
            setIsAppending(false);
            return;
        }
        try {
            JSON.parse(values.pastedJson);
            const blob = new Blob([values.pastedJson], { type: 'application/json' });
            formData.append('file', blob, 'appended_questions.json');
        } catch (e) {
            toast({ title: "Invalid JSON", description: "The pasted content is not valid JSON.", variant: "destructive" });
            setIsAppending(false);
            return;
        }
    }

    try {
        const response = await fetch('/api/weekly-test/append', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to append questions.');
        }

        const data = await response.json();
        toast({ title: "Success", description: data.message });
        appendForm.reset();
        setSelectedTestToAppend(null);
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setIsAppending(false);
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

  const handleManageQuestions = async (test: WeeklyTest) => {
    setManagingTest(test);
    setIsQuestionsLoading(true);
    try {
        const paper = await getLiveTestQuestionPaper(test.questionPaperId);
        if (paper) {
            const data = JSON.parse(paper.content);
            setQuestions(data.questions || []);
        }
    } catch (e) {
        toast({ title: "Error", description: "Could not load questions.", variant: "destructive" });
    } finally {
        setIsQuestionsLoading(false);
    }
  };

  const handleEditQuestion = (index: number) => {
    const q = testQuestions[index];
    setEditingQuestionIndex(index);
    editQuestionForm.reset({
        question: q.question,
        options: [...q.options],
        correctAnswer: q.correctAnswer,
        solution: q.solution || '',
        topic: q.topic || '',
        translations: q.translations || {}
    });
  };

  const onEditQuestionSubmit = (values: z.infer<typeof mcqSchema>) => {
    if (editingQuestionIndex === null) return;
    
    const updatedQuestions = [...testQuestions];
    updatedQuestions[editingQuestionIndex] = {
        ...updatedQuestions[editingQuestionIndex],
        ...values,
    };
    
    setQuestions(updatedQuestions);
    setEditingQuestionIndex(null);
    toast({ title: "Question Updated", description: "Changes applied locally. Remember to click Save All Changes." });
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = [...testQuestions];
    updated.splice(index, 1);
    setQuestions(updated);
    toast({ title: "Removed", description: "Question removed from this test." });
  };

  const saveAllQuestionChanges = async () => {
    if (!managingTest) return;
    setIsSavingQuestions(true);
    try {
        const content = JSON.stringify({ questions: testQuestions });
        await updateLiveTestBankDocument(managingTest.questionPaperId, content);
        toast({ title: "Success", description: "Question paper updated successfully." });
        setManagingTest(null);
    } catch (error) {
        toast({ title: "Error", description: "Failed to save changes to database.", variant: "destructive" });
    } finally {
        setIsSavingQuestions(false);
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Add New Weekly Test</CardTitle>
                    <CardDescription>Upload a JSON question paper file or paste the JSON content directly.</CardDescription>
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
                                <div className="space-y-2">
                                    <Label>Input Method</Label>
                                    <Tabs value={form.watch('method')} onValueChange={(v) => form.setValue('method', v as any)}>
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="file"><Upload className="mr-2 h-4 w-4" /> File</TabsTrigger>
                                            <TabsTrigger value="paste"><ClipboardPaste className="mr-2 h-4 w-4" /> Paste</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {form.watch('method') === 'file' ? (
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
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                ) : (
                                    <FormField
                                        control={form.control}
                                        name="pastedJson"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Paste JSON Content</FormLabel>
                                                <FormControl>
                                                    <Textarea 
                                                        rows={8} 
                                                        placeholder='{ "questions": [ ... ] }'
                                                        className="font-mono text-xs"
                                                        {...field} 
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
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

            <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-primary" /> Expected JSON Structure
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="text-[10px] leading-relaxed font-mono bg-background p-3 border rounded-md overflow-x-auto">
{`{
  "questions": [
    {
      "question": "Question text (HTML allowed)",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "solution": "Optional logic/steps",
      "topic": "Topic Name",
      "translations": {
        "ta": { 
          "question": "தமிழ்...", 
          "options": [...], 
          "correctAnswer": "..." 
        }
      }
    }
  ]
}`}
                    </pre>
                    <p className="text-[10px] text-muted-foreground mt-3 leading-snug">
                        * Supported translations keys: <strong>ta</strong> (Tamil), <strong>hi</strong> (Hindi), <strong>te</strong> (Telugu), <strong>kn</strong> (Kannada).
                    </p>
                </CardContent>
            </Card>
        </div>

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
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleManageQuestions(t)} title="Edit Individual Questions">
                                            <List className="h-4 w-4 text-primary" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setSelectedTestToAppend(t)} title="Append Questions">
                                            <FilePlus className="h-4 w-4 text-blue-600" />
                                        </Button>
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

        {/* APPEND QUESTIONS DIALOG */}
        <Dialog open={!!selectedTestToAppend} onOpenChange={(open) => !open && setSelectedTestToAppend(null)}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Append Questions</DialogTitle>
                    <DialogDescription>
                        Add more questions to <strong>{selectedTestToAppend?.title}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <Form {...appendForm}>
                    <form onSubmit={appendForm.handleSubmit(onAppendSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Input Method</Label>
                            <Tabs value={appendForm.watch('method')} onValueChange={(v) => appendForm.setValue('method', v as any)}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="file"><Upload className="mr-2 h-4 w-4" /> File</TabsTrigger>
                                    <TabsTrigger value="paste"><ClipboardPaste className="mr-2 h-4 w-4" /> Paste</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {appendForm.watch('method') === 'file' ? (
                            <FormField
                                control={appendForm.control}
                                name="file"
                                render={({ field: { onChange, value, ...rest } }) => (
                                    <FormItem>
                                        <FormLabel>Select JSON Files</FormLabel>
                                        <FormControl>
                                            <Input 
                                                id="weekly-test-file-append"
                                                type="file" 
                                                accept=".json" 
                                                multiple
                                                onChange={(e) => onChange(e.target.files)}
                                                {...rest}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <FormField
                                control={appendForm.control}
                                name="pastedJson"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Paste JSON Content</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                rows={10} 
                                                placeholder='{ "questions": [ ... ] }'
                                                className="font-mono text-xs"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isAppending}>
                                {isAppending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Append Questions
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        {/* MANAGE INDIVIDUAL QUESTIONS DIALOG */}
        <Dialog open={!!managingTest} onOpenChange={(open) => !open && !isSavingQuestions && setManagingTest(null)}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage Questions: {managingTest?.title}</DialogTitle>
                    <DialogDescription>Edit or remove individual questions from this test.</DialogDescription>
                </DialogHeader>
                
                <div className="flex-grow min-h-0">
                    {isQuestionsLoading ? (
                        <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : (
                        <ScrollArea className="h-full border rounded-md p-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">Index</TableHead>
                                        <TableHead>Question Text</TableHead>
                                        <TableHead>Topic</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {testQuestions.map((q, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="text-muted-foreground font-mono">{String(idx + 1).padStart(3, '0')}</TableCell>
                                            <TableCell>
                                                <div className="line-clamp-2 text-sm" dangerouslySetInnerHTML={{ __html: q.question }} />
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{q.topic || 'N/A'}</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditQuestion(idx)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    )}
                </div>

                <DialogFooter className="pt-4 gap-2">
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isSavingQuestions}>Cancel Changes</Button>
                    </DialogClose>
                    <Button onClick={saveAllQuestionChanges} disabled={isSavingQuestions || isQuestionsLoading}>
                        {isSavingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save All Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* EDIT SINGLE MCQ DIALOG */}
        <Dialog open={editingQuestionIndex !== null} onOpenChange={(open) => !open && setEditingQuestionIndex(null)}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Question {editingQuestionIndex !== null ? editingQuestionIndex + 1 : ''}</DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="flex-grow pr-4">
                    <Form {...editQuestionForm}>
                        <form onSubmit={editQuestionForm.handleSubmit(onEditQuestionSubmit)} className="space-y-6 pb-4">
                            <FormField
                                control={editQuestionForm.control}
                                name="question"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Question Text (HTML allowed for images)</FormLabel>
                                        <FormControl><Textarea rows={3} {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[0, 1, 2, 3].map(i => (
                                    <FormField
                                        key={i}
                                        control={editQuestionForm.control}
                                        name={`options.${i}`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Option {i + 1}</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>

                            <FormField
                                control={editQuestionForm.control}
                                name="correctAnswer"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Correct Answer</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select correct answer" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {editQuestionForm.watch('options')?.map((opt, i) => (
                                                    <SelectItem key={i} value={opt || `Option ${i+1}`}>{opt || `Option ${i+1}`}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={editQuestionForm.control}
                                name="solution"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Step-by-Step Solution</FormLabel>
                                        <FormControl><Textarea rows={4} {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="border rounded-md p-4 bg-muted/10 space-y-4">
                                <h4 className="font-semibold text-sm">Translations (ta, hi, te, kn)</h4>
                                {['ta', 'hi', 'te', 'kn'].map(lang => (
                                    <div key={lang} className="p-3 border rounded bg-background space-y-3">
                                        <Badge variant="outline">{lang.toUpperCase()}</Badge>
                                        <div className="space-y-2">
                                            <Label className="text-[10px]">Translated Question</Label>
                                            <Input 
                                                className="text-xs h-8"
                                                defaultValue={editQuestionForm.watch(`translations.${lang}.question` as any)}
                                                onChange={(e) => editQuestionForm.setValue(`translations.${lang}.question` as any, e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[0, 1, 2, 3].map(i => (
                                                <Input 
                                                    key={i}
                                                    className="text-[10px] h-7"
                                                    placeholder={`Option ${i+1}`}
                                                    defaultValue={editQuestionForm.watch(`translations.${lang}.options.${i}` as any)}
                                                    onChange={(e) => {
                                                        const current = editQuestionForm.getValues(`translations.${lang}.options` as any) || ['', '', '', ''];
                                                        current[i] = e.target.value;
                                                        editQuestionForm.setValue(`translations.${lang}.options` as any, current);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px]">Translated Correct Answer</Label>
                                            <Input 
                                                className="text-xs h-8"
                                                defaultValue={editQuestionForm.watch(`translations.${lang}.correctAnswer` as any)}
                                                onChange={(e) => editQuestionForm.setValue(`translations.${lang}.correctAnswer` as any, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </form>
                    </Form>
                </ScrollArea>

                <DialogFooter className="pt-4">
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={editQuestionForm.handleSubmit(onEditQuestionSubmit)}>Apply Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}