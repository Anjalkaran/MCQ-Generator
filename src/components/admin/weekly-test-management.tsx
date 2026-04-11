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
import { Loader2, PlusCircle, Trash2, Search, Upload, FilePlus, List, Edit, Save, FileCode, ClipboardPaste, Calendar as CalendarIcon, FileText, FileJson } from 'lucide-react';
import { deleteWeeklyTest, getLiveTestQuestionPaper, updateLiveTestBankDocument, updateWeeklyTest } from '@/lib/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getFirebaseAuth } from '@/lib/firebase';
import type { BankedQuestion, WeeklyTest, MCQ } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { normalizeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { JsonFormatGuide } from './json-format-guide';
import { cn } from '@/lib/utils';

const categoriesList = ["MTS", "POSTMAN", "PA", "IP", "GROUP B"] as const;

const formSchema = z.object({
  title: z.string().min(3, "Title is required."),
  duration: z.string().optional(),
  examCategories: z.array(z.string()).min(1, "Select at least one category."),
  method: z.enum(["file", "paste"]).default("file"),
  file: z.any().optional(),
  pastedJson: z.string().optional(),
  scheduledAt: z.date().optional(),
});

const appendSchema = z.object({
  method: z.enum(["file", "paste"]).default("file"),
  file: z.any().optional(),
  pastedJson: z.string().optional()
});

const editInfoSchema = z.object({
  title: z.string().min(3, "Title is required."),
  duration: z.string().optional(),
  examCategories: z.array(z.string()).min(1, "Select at least one category."),
  scheduledAt: z.date().optional(),
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
  const [editingTestInfo, setEditingTestInfo] = useState<WeeklyTest | null>(null);
  const [isUpdatingInfo, setIsUpdatingInfo] = useState(false);
  
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', duration: '', examCategories: [], method: 'file', pastedJson: '' }
  });

  const appendForm = useForm<z.infer<typeof appendSchema>>({
    resolver: zodResolver(appendSchema),
    defaultValues: { method: 'file', pastedJson: '' }
  });

  const editQuestionForm = useForm<z.infer<typeof mcqSchema>>();

  const editInfoForm = useForm<z.infer<typeof editInfoSchema>>({
    resolver: zodResolver(editInfoSchema),
    defaultValues: { title: '', duration: '', examCategories: [] }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('title', values.title);
    if (values.duration) formData.append('duration', values.duration);
    if (values.scheduledAt) formData.append('scheduledAt', values.scheduledAt.toISOString());
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
            JSON.parse(values.pastedJson);
            const blob = new Blob([values.pastedJson], { type: 'application/json' });
            formData.append('file', blob, 'pasted_questions.json');
        } catch (e) {
            toast({ title: "Invalid JSON", description: "The content you pasted is not valid JSON.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
    }

    try {
        const auth = getFirebaseAuth();
        const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : null;

        const response = await fetch('/api/weekly-test/upload', {
            method: 'POST',
            body: formData,
            headers: idToken ? { 'Authorization': `Bearer ${idToken}` } : {},
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create weekly test.');
        }

        const { newTest } = await response.json();
        setWeeklyTests(prev => [newTest, ...prev]);
        toast({ title: "Success", description: "Weekly test created successfully." });
        form.reset();
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
        const auth = getFirebaseAuth();
        const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : null;

        const response = await fetch('/api/weekly-test/append', {
            method: 'POST',
            body: formData,
            headers: idToken ? { 'Authorization': `Bearer ${idToken}` } : {},
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

  const onEditQuestionSubmit = (values: z.infer<typeof mcqSchema>) => {
    if (editingQuestionIndex === null) return;
    const updatedQuestions = [...testQuestions];
    updatedQuestions[editingQuestionIndex] = { ...updatedQuestions[editingQuestionIndex], ...values } as any;
    setQuestions(updatedQuestions);
    setEditingQuestionIndex(null);
    toast({ title: "Updated Locally", description: "Save all changes to sync with database." });
  };

  const saveAllQuestionChanges = async () => {
    if (!managingTest) return;
    setIsSavingQuestions(true);
    try {
        const content = JSON.stringify({ questions: testQuestions });
        await updateLiveTestBankDocument(managingTest.questionPaperId, content);
        toast({ title: "Success", description: "Question paper updated." });
        setManagingTest(null);
    } catch (error) {
        toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
    } finally {
        setIsSavingQuestions(false);
    }
  };

  const handleDownloadPdf = (testTitle: string, questions: MCQ[]) => {
    const doc = new jsPDF();
    
    // Add Header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text("Anjalkaran MCQ Bank", 105, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(127, 140, 141);
    doc.text(testTitle, 105, 22, { align: 'center' });
    
    doc.setDrawColor(52, 152, 219);
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);

    const toEnglish = (text: string) => {
        if (!text) return "";
        // Strip HTML
        let res = text.replace(/<[^>]*>?/gm, '');
        // Filter out Tamil characters if present
        res = res.replace(/[\u0B80-\u0BFF]+/g, '');
        return res.trim().replace(/\s\s+/g, ' ');
    };

    const tableData = questions.map((q, index) => {
      const qText = q.translations?.en?.question || q.question;
      const opts = q.translations?.en?.options || q.options;
      const ans = q.translations?.en?.correctAnswer || q.correctAnswer;
      const sol = q.translations?.en?.solution || q.solution;

      return [
        index + 1,
        toEnglish(qText),
        opts.map(o => toEnglish(o)).join('\n'),
        toEnglish(ans),
        sol ? toEnglish(sol) : 'N/A'
      ];
    });

    autoTable(doc, {
      head: [['#', 'Question', 'Options', 'Ans', 'Solution']],
      body: tableData,
      startY: 30,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 80 },
        2: { cellWidth: 50 },
        3: { cellWidth: 15 },
        4: { cellWidth: 'auto' }
      },
      alternateRowStyles: { fillColor: [245, 247, 249] },
    });

    doc.save(`${testTitle.replace(/\s+/g, '_')}_MCQs.pdf`);
    toast({ title: "PDF Generated", description: "Your MCQ bank has been exported." });
  };

  const handleUpdateTestInfo = async (values: z.infer<typeof editInfoSchema>) => {
    if (!editingTestInfo) return;
    setIsUpdatingInfo(true);
    try {
        const updateData = {
            ...values,
            duration: values.duration ? parseInt(values.duration) : undefined,
            scheduledAt: values.scheduledAt
        };
        await updateWeeklyTest(editingTestInfo.id, updateData as any);
        setWeeklyTests(prev => prev.map(t => t.id === editingTestInfo.id ? { ...t, ...updateData } : t));
        toast({ title: "Updated", description: "Weekly test information updated successfully." });
        setEditingTestInfo(null);
    } catch (error) {
        toast({ title: "Error", description: "Failed to update test info.", variant: "destructive" });
    } finally {
        setIsUpdatingInfo(false);
    }
  };

  const filteredTests = useMemo(() => 
    weeklyTests.filter(t => 
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.examCategories?.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t as any).examCategory?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [weeklyTests, searchTerm]
  );

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Add New Weekly Test</CardTitle>
                    <CardDescription>Upload a JSON file or paste content directly.</CardDescription>
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
                                            <FormControl><Input placeholder="e.g. Week 1 MTS Challenge" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="duration"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Duration (Minutes)</FormLabel>
                                            <FormControl><Input type="number" placeholder="Leave empty for no limit" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="scheduledAt"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Schedule Release (Optional)</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP HH:mm")
                                                            ) : (
                                                                <span>Pick release date</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) => date < new Date("2024-01-01")}
                                                        initialFocus
                                                    />
                                                    <div className="p-2 border-t border-border">
                                                        <Input 
                                                            type="time" 
                                                            onChange={(e) => {
                                                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                                                const newDate = new Date(field.value || new Date());
                                                                newDate.setHours(hours, minutes);
                                                                field.onChange(newDate);
                                                            }}
                                                        />
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="space-y-2">
                                    <Label>Method</Label>
                                    <Tabs value={form.watch('method')} onValueChange={(v) => form.setValue('method', v as any)}>
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="file"><Upload className="mr-2 h-4 w-4" /> File</TabsTrigger>
                                            <TabsTrigger value="paste"><ClipboardPaste className="mr-2 h-4 w-4" /> Paste</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>
                            </div>

                            {form.watch('method') === 'file' ? (
                                <FormField
                                    control={form.control}
                                    name="file"
                                    render={({ field: { onChange, value, ...rest } }) => (
                                        <FormItem>
                                            <FormLabel>JSON Files</FormLabel>
                                            <FormControl><Input type="file" accept=".json" multiple onChange={(e) => onChange(e.target.files)} {...rest} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="pastedJson"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Paste JSON Content</FormLabel>
                                                <FormControl><Textarea rows={8} placeholder='{ "questions": [ ... ] }' className="font-mono text-xs" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="pt-2 pb-4">
                                        <JsonFormatGuide type="weekly-test" />
                                    </div>
                                </>
                            )}

                            <FormField
                                control={form.control}
                                name="examCategories"
                                render={() => (
                                    <FormItem>
                                        <div className="mb-2"><FormLabel>Target Exam Categories</FormLabel></div>
                                        <div className="flex flex-wrap gap-6 p-4 border rounded-md bg-muted/20">
                                            {categoriesList.map((item) => (
                                                <FormField
                                                    key={item}
                                                    control={form.control}
                                                    name="examCategories"
                                                    render={({ field }) => (
                                                        <FormItem key={item} className="flex flex-row items-center space-x-2 space-y-0">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(item)}
                                                                    onCheckedChange={(checked) => checked ? field.onChange([...(field.value || []), item]) : field.onChange(field.value?.filter((v: string) => v !== item))}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal cursor-pointer">{item}</FormLabel>
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                Add Weekly Test
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><FileCode className="h-4 w-4" /> JSON Model Structure</CardTitle></CardHeader>
                <CardContent>
                    <pre className="text-[10px] font-mono bg-background p-3 border rounded-md overflow-x-auto">
{`{
  "questions": [
    {
      "question": "Which city is known as the Gateway of India?",
      "options": ["Chennai", "Delhi", "Mumbai", "Kolkata"],
      "correctAnswer": "Mumbai",
      "solution": "Mumbai is known as the Gateway of India.",
      "topic": "GK",
      "translations": {
        "ta": { 
          "question": "இந்தியாவின் நுழைவாயில் எது?", 
          "options": ["சென்னை", "டெல்லி", "மும்பை", "கொல்கத்தா"], 
          "correctAnswer": "மும்பை" 
        }
      }
    }
  ]
}`}
                    </pre>
                    <p className="text-[10px] text-muted-foreground mt-3">Keys: ta (Tamil), hi (Hindi), te (Telugu), kn (Kannada).</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div><CardTitle>Existing Weekly Tests</CardTitle><CardDescription>Permanent tests for selected courses.</CardDescription></div>
                    <div className="relative w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Duration</TableHead><TableHead>Categories</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredTests.length > 0 ? filteredTests.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell className="font-medium">{t.title}</TableCell>
                                    <TableCell className="text-xs font-mono">{t.duration ? `${t.duration}m` : 'None'}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {t.examCategories?.map(cat => <Badge key={cat} variant="secondary" className="text-[10px]">{cat}</Badge>)}
                                            {!t.examCategories?.length && (t as any).examCategory && (
                                                <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700">
                                                    Legacy: {(t as any).examCategory}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {t.scheduledAt ? (
                                            <div className="flex flex-col">
                                                <span className="text-amber-600 font-bold">Scheduled:</span>
                                                <span>{format(normalizeDate(t.scheduledAt) || new Date(), 'dd/MM/yyyy HH:mm')}</span>
                                            </div>
                                        ) : t.createdAt ? format(normalizeDate(t.createdAt) || new Date(), 'dd/MM/yyyy') : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleManageQuestions(t)} title="Edit Questions"><List className="h-4 w-4 text-primary" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => { 
                                            setEditingTestInfo(t); 
                                            editInfoForm.reset({ 
                                                title: t.title, 
                                                duration: t.duration?.toString() || '',
                                                examCategories: t.examCategories || ((t as any).examCategory ? [(t as any).examCategory] : []),
                                                scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : undefined
                                            }); 
                                        }} title="Edit Info"><Edit className="h-4 w-4 text-amber-600" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => setSelectedTestToAppend(t)} title="Append"><FilePlus className="h-4 w-4 text-blue-600" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Delete Weekly Test?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(t.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No tests found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        {/* APPEND DIALOG */}
        <Dialog open={!!selectedTestToAppend} onOpenChange={(open) => !open && setSelectedTestToAppend(null)}>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Append Questions</DialogTitle></DialogHeader>
                <Form {...appendForm}>
                    <form onSubmit={appendForm.handleSubmit(onAppendSubmit)} className="space-y-4">
                        <Tabs value={appendForm.watch('method')} onValueChange={(v) => appendForm.setValue('method', v as any)}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="file"><Upload className="mr-2 h-4 w-4" /> File</TabsTrigger>
                                <TabsTrigger value="paste"><ClipboardPaste className="mr-2 h-4 w-4" /> Paste</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        {appendForm.watch('method') === 'file' ? (
                            <FormField control={appendForm.control} name="file" render={({ field: { onChange, value, ...rest } }) => (<FormItem><FormControl><Input type="file" accept=".json" multiple onChange={(e) => onChange(e.target.files)} {...rest} /></FormControl></FormItem>)} />
                        ) : (
                            <FormField control={appendForm.control} name="pastedJson" render={({ field }) => (<FormItem><FormControl><Textarea rows={10} className="font-mono text-xs" {...field} /></FormControl></FormItem>)} />
                        )}
                        <DialogFooter><Button type="submit" disabled={isAppending}>{isAppending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Append</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        {/* MANAGE QUESTIONS DIALOG */}
        <Dialog open={!!managingTest} onOpenChange={(open) => !open && !isSavingQuestions && setManagingTest(null)}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
                <DialogHeader><DialogTitle>Edit Questions: {managingTest?.title}</DialogTitle></DialogHeader>
                <ScrollArea className="flex-grow border rounded-md p-4">
                    {isQuestionsLoading ? <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div> : (
                        <Table>
                            <TableBody>
                                {testQuestions.map((q, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="w-16 font-mono text-xs">{idx + 1}</TableCell>
                                        <TableCell className="text-sm"><div className="line-clamp-2" dangerouslySetInnerHTML={{ __html: q.question }} /></TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingQuestionIndex(idx); editQuestionForm.reset(q as any); }}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => { const u = [...testQuestions]; u.splice(idx, 1); setQuestions(u); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </ScrollArea>
                <DialogFooter className="pt-4 flex items-center justify-between">
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                const content = JSON.stringify({ questions: testQuestions }, null, 2);
                                const blob = new Blob([content], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `${managingTest?.title.replace(/\s+/g, '_')}_questions.json`;
                                link.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                            <FileJson className="mr-2 h-4 w-4" /> Download JSON
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => handleDownloadPdf(managingTest?.title || "Weekly Test", testQuestions)}
                            disabled={testQuestions.length === 0}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <FileText className="mr-2 h-4 w-4" /> Download English PDF
                        </Button>
                    </div>
                    <Button onClick={saveAllQuestionChanges} disabled={isSavingQuestions}>
                        {isSavingQuestions && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save All Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* EDIT SINGLE DIALOG */}
        <Dialog open={editingQuestionIndex !== null} onOpenChange={() => setEditingQuestionIndex(null)}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader><DialogTitle>Edit Question {editingQuestionIndex! + 1}</DialogTitle></DialogHeader>
                <ScrollArea className="flex-grow pr-4">
                    <Form {...editQuestionForm}><form onSubmit={editQuestionForm.handleSubmit(onEditQuestionSubmit)} className="space-y-4">
                        <FormField control={editQuestionForm.control} name="question" render={({ field }) => (<FormItem><FormLabel>Question</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                        <div className="grid grid-cols-2 gap-4">{[0,1,2,3].map(i => (<FormField key={i} control={editQuestionForm.control} name={`options.${i}`} render={({ field }) => (<FormItem><FormLabel>Opt {i+1}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />))}</div>
                        <FormField control={editQuestionForm.control} name="correctAnswer" render={({ field }) => (<FormItem><FormLabel>Correct Answer</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        <FormField control={editQuestionForm.control} name="solution" render={({ field }) => (<FormItem><FormLabel>Solution</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                        <Button type="submit" className="w-full">Update locally</Button>
                    </form></Form>
                </ScrollArea>
                </DialogContent>
            </Dialog>

        {/* EDIT TEST INFO DIALOG */}
        <Dialog open={!!editingTestInfo} onOpenChange={(open) => !open && setEditingTestInfo(null)}>
            <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Edit Test Information</DialogTitle></DialogHeader>
                <Form {...editInfoForm}>
                    <form onSubmit={editInfoForm.handleSubmit(handleUpdateTestInfo)} className="space-y-4">
                        <FormField control={editInfoForm.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Test Title</FormLabel><FormControl><Input placeholder="e.g. MCQ on Postal History" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <FormField control={editInfoForm.control} name="duration" render={({ field }) => (
                            <FormItem><FormLabel>Duration (Minutes)</FormLabel><FormControl><Input type="number" placeholder="Leave empty for no limit" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <FormField
                            control={editInfoForm.control}
                            name="scheduledAt"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Scheduled Release</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? format(field.value, "PPP HH:mm") : <span>Pick release date</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) => date < new Date("2024-01-01")}
                                            />
                                            <div className="p-2 border-t border-border">
                                                <Input 
                                                    type="time" 
                                                    value={field.value ? format(field.value, "HH:mm") : ""}
                                                    onChange={(e) => {
                                                        const [hours, minutes] = e.target.value.split(':').map(Number);
                                                        const newDate = new Date(field.value || new Date());
                                                        newDate.setHours(hours, minutes);
                                                        field.onChange(newDate);
                                                    }}
                                                />
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField control={editInfoForm.control} name="examCategories" render={() => (
                            <FormItem>
                                <FormLabel>Exam Categories</FormLabel>
                                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                                    {categoriesList.map((category) => (
                                        <FormField key={category} control={editInfoForm.control} name="examCategories" render={({ field }) => (
                                            <FormItem key={category} className="flex flex-row items-start space-x-3 space-y-0">
                                                <FormControl><Checkbox checked={field.value?.includes(category)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, category]) : field.onChange(field.value?.filter((value) => value !== category))} /></FormControl>
                                                <FormLabel className="text-sm font-normal cursor-pointer">{category}</FormLabel>
                                            </FormItem>
                                        )} />
                                    ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setEditingTestInfo(null)}>Cancel</Button>
                            <Button type="submit" disabled={isUpdatingInfo}>{isUpdatingInfo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </div>
  );
}