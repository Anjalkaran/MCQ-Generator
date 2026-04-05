"use client";

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, Trash2, Edit, CalendarIcon, Upload, Eye, FileDown } from 'lucide-react';
import { addLiveTest, updateLiveTest, deleteLiveTest, deleteLiveTestBankDocument, updateQuestionBankDocument } from '@/lib/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MCQ } from '@/lib/types';
import { MCQStructuredEditor } from './mcq-structured-editor';
import type { BankedQuestion, LiveTest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, normalizeDate } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const examCategories = ["MTS", "POSTMAN", "PA", "IP", "GROUP B"] as const;

const uploadSchema = z.object({
  examCategory: z.enum(examCategories),
  files: z
    .array(z.instanceof(File))
    .min(1, 'Please upload at least one file.')
    .refine(
        (files) => files.every(file => file.type === 'application/json'),
        'All files must be JSON documents.'
    ),
});


const scheduleSchema = z.object({
  title: z.string().min(3, "Title is required."),
  questionPaperId: z.string().min(1, "You must select a question paper."),
  examCategory: z.enum(examCategories),
  price: z.coerce.number().min(0, "Price must be a positive number.").optional().default(0),
  startTime: z.date({ required_error: "A start date and time is required." }),
  endTime: z.date({ required_error: "An end date and time is required." }),
}).refine(data => data.endTime > data.startTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
});

interface LiveTestManagementProps {
    initialLiveTestBank: BankedQuestion[];
    initialLiveTests: LiveTest[];
}

export function LiveTestManagement({ initialLiveTestBank, initialLiveTests }: LiveTestManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [liveTestBank, setLiveTestBank] = useState<BankedQuestion[]>(initialLiveTestBank);
  const [liveTests, setLiveTests] = useState<LiveTest[]>(initialLiveTests);
  const [editingTest, setEditingTest] = useState<LiveTest | null>(null);
  const [editingPaper, setEditingPaper] = useState<BankedQuestion | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isPaperEditDialogOpen, setIsPaperEditDialogOpen] = useState(false);
  const [isSavingPaper, setIsSavingPaper] = useState(false);
  const { toast } = useToast();

  const scheduleForm = useForm<z.infer<typeof scheduleSchema>>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
        title: '',
        questionPaperId: '',
        examCategory: undefined,
        price: 0,
        startTime: undefined,
        endTime: undefined,
    }
  });

  const uploadForm = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
  });
  
  useEffect(() => {
    if (editingTest) {
        scheduleForm.reset({
            title: editingTest.title,
            questionPaperId: editingTest.questionPaperId,
            examCategory: editingTest.examCategory as any,
            price: editingTest.price,
            startTime: normalizeDate(editingTest.startTime)!,
            endTime: normalizeDate(editingTest.endTime)!,
        });
    } else {
        scheduleForm.reset({
          title: '',
          questionPaperId: '',
          examCategory: undefined,
          price: 0,
          startTime: undefined,
          endTime: undefined,
        });
    }
  }, [editingTest, scheduleForm]);

  const onScheduleSubmit = async (values: z.infer<typeof scheduleSchema>) => {
    setIsLoading(true);
    try {
        const liveTestData = {
            ...values,
            startTime: Timestamp.fromDate(values.startTime),
            endTime: Timestamp.fromDate(values.endTime),
        };
        
        if (editingTest) {
            await updateLiveTest(editingTest.id, liveTestData);
            setLiveTests(prev => prev.map(t => t.id === editingTest.id ? { id: editingTest.id, ...liveTestData } : t));
            toast({ title: 'Success', description: 'Weekly test updated successfully.' });
        } else {
            const newDocRef = await addLiveTest(liveTestData);
            const newLiveTest: LiveTest = {
                id: newDocRef.id,
                ...liveTestData,
            }
            setLiveTests(prev => [newLiveTest, ...prev].sort((a,b) => normalizeDate(b.startTime)!.getTime() - normalizeDate(a.startTime)!.getTime()));
            toast({ title: 'Success', description: 'Weekly test scheduled successfully.' });
        }
        scheduleForm.reset();
        setIsScheduleDialogOpen(false);
        setEditingTest(null);
    } catch (error: any) {
      console.error("Scheduling error:", error);
      toast({ title: 'Operation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const onUploadSubmit = async (values: z.infer<typeof uploadSchema>) => {
    setIsUploading(true);
    const formData = new FormData();
    values.files.forEach(file => {
        formData.append('files', file);
    });
    formData.append('examCategory', values.examCategory);

    try {
        const response = await fetch('/api/live-test-bank/upload', {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload.');
        }
        const { newDocument } = await response.json();
        setLiveTestBank(prev => [newDocument, ...prev]);
        toast({ title: 'Success', description: 'Question paper uploaded successfully.' });
        uploadForm.reset();
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
    } catch (error: any) {
        toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsUploading(false);
    }
  }

  const handleDeleteTest = async (testId: string) => {
    try {
        await deleteLiveTest(testId);
        setLiveTests(prev => prev.filter(t => t.id !== testId));
        toast({ title: "Success", description: "Weekly test deleted successfully." });
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete weekly test.", variant: "destructive" });
    }
  }
  
  const handleDeletePaper = async (paperId: string) => {
    try {
        await deleteLiveTestBankDocument(paperId);
        setLiveTestBank(prev => prev.filter(p => p.id !== paperId));
        toast({ title: "Success", description: "Question paper deleted." });
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete question paper.", variant: "destructive" });
    }
  }

  const handleOpenPaperEditDialog = (paper: BankedQuestion) => {
    setEditingPaper(paper);
    setIsPaperEditDialogOpen(true);
  };

  const handleSavePaperEdit = async (newContent: string) => {
    if (!editingPaper) return;
    setIsSavingPaper(true);
    try {
        await updateQuestionBankDocument(editingPaper.id, newContent);
        setLiveTestBank(prev => prev.map(p => p.id === editingPaper.id ? { ...p, content: newContent } : p));
        setIsPaperEditDialogOpen(false);
        setEditingPaper(null);
        toast({ title: "Success", description: "Question paper updated successfully." });
    } catch (error: any) {
        console.error("Failed to update question paper", error);
        throw error;
    } finally {
        setIsSavingPaper(false);
    }
  };

  const handleDownloadPdf = (paper: BankedQuestion) => {
    try {
        const data = JSON.parse(paper.content);
        const questions: MCQ[] = data.questions || [];
        
        if (questions.length === 0) {
            toast({ title: "No Questions", description: "This paper is empty.", variant: "destructive" });
            return;
        }

        const doc = new jsPDF();
        
        // Add Header
        doc.setFontSize(20);
        doc.setTextColor(44, 62, 80);
        doc.text("Anjalkaran MCQ Bank", 105, 15, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setTextColor(127, 140, 141);
        doc.text(`${paper.examCategory} Live Test Paper`, 105, 22, { align: 'center' });
        
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

        doc.save(`${paper.examCategory}_LiveTest_${format(new Date(paper.uploadedAt), "dd_MM_yyyy")}.pdf`);
        toast({ title: "PDF Generated", description: "Your MCQ bank has been exported." });
    } catch (e) {
        toast({ title: "Export Failed", description: "There was an error parsing the question paper.", variant: "destructive" });
    }
  };

  const handleOpenScheduleDialog = (test: LiveTest | null) => {
    setEditingTest(test);
    setIsScheduleDialogOpen(true);
  }
  
  const getFormattedContent = (content: string) => {
    try {
      const jsonContent = JSON.parse(content);
      return JSON.stringify(jsonContent, null, 2);
    } catch (error) {
      return content;
    }
  };

  const selectedCategory = scheduleForm.watch('examCategory');
  const filteredPapers = selectedCategory 
    ? liveTestBank.filter(p => p.examCategory === selectedCategory) 
    : [];
    
  const getStatus = (test: LiveTest) => {
    const now = new Date();
    const startTime = normalizeDate(test.startTime)!;
    const endTime = normalizeDate(test.endTime)!;

    if (now > endTime) return <Badge variant="secondary">Completed</Badge>;
    if (now >= startTime && now <= endTime) return <Badge className="bg-green-600 hover:bg-green-700">Live</Badge>;
    return <Badge variant="outline">Upcoming</Badge>;
  };
  
  const getQuestionPaperName = (id: string) => {
    return liveTestBank.find(p => p.id === id)?.fileName || 'Unknown Paper';
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Upload Weekly Test Papers</CardTitle>
                    <CardDescription>
                        Upload question papers in JSON format to be used for the weekly test module.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...uploadForm}>
                        <form onSubmit={uploadForm.handleSubmit(onUploadSubmit)} className="space-y-4">
                             <FormField
                                control={uploadForm.control}
                                name="examCategory"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Exam Category</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {examCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <FormField
                                control={uploadForm.control}
                                name="files"
                                render={({ field: { onChange, value, ...rest } }) => (
                                    <FormItem>
                                    <FormLabel>Question Paper Files (.json)</FormLabel>
                                    <FormControl>
                                        <Input 
                                        type="file" 
                                        accept=".json"
                                        multiple
                                        onChange={(e) => onChange(e.target.files ? Array.from(e.target.files) : [])}
                                        {...rest}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <Button type="submit" disabled={isUploading}>
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Upload Paper(s)
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Available Papers</CardTitle>
                    <CardDescription>Manage your uploaded weekly test question papers.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-md h-64 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow><TableHead>File Name</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {liveTestBank.length > 0 ? (
                                    liveTestBank.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell>{p.fileName}</TableCell>
                                            <TableCell className="text-right">
                                                 <Dialog>
    <DialogTrigger asChild>
        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
    </DialogTrigger>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Question Paper Content</DialogTitle>
            <DialogDescription>{p.fileName}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 w-full rounded-md border p-4">
            <pre className="text-sm whitespace-pre-wrap">{getFormattedContent(p.content)}</pre>
        </ScrollArea>
    </DialogContent>
</Dialog>
                                                 <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(p)} title="Download PDF">
                                                    <FileDown className="h-4 w-4 text-blue-600" />
                                                 </Button>
                                                 <Button variant="ghost" size="icon" onClick={() => handleOpenPaperEditDialog(p)} title="Edit Questions">
                                                    <Edit className="h-4 w-4 text-amber-600" />
                                                 </Button>
                                                 <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete "{p.fileName}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePaper(p.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={2} className="h-24 text-center">No papers uploaded.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
        <Dialog open={isScheduleDialogOpen} onOpenChange={(isOpen) => { setIsScheduleDialogOpen(isOpen); if (!isOpen) setEditingTest(null); }}>
             <DialogTrigger asChild>
                <Button onClick={() => handleOpenScheduleDialog(null)}>
                    <Clock className="mr-2 h-4 w-4" />
                    Schedule New Weekly Test
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingTest ? 'Edit Weekly Test' : 'Schedule a New Weekly Test'}</DialogTitle>
                    <DialogDescription>Select a question paper and set the schedule for the weekly challenge.</DialogDescription>
                </DialogHeader>
                <Form {...scheduleForm}>
                    <form onSubmit={scheduleForm.handleSubmit(onScheduleSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={scheduleForm.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Test Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Weekly MTS Challenge - Week 1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={scheduleForm.control}
                                name="examCategory"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Exam Category</FormLabel>
                                    <Select onValueChange={(value) => {
                                        field.onChange(value);
                                        scheduleForm.resetField('questionPaperId');
                                    }} value={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an exam category" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {examCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <FormField
                                control={scheduleForm.control}
                                name="questionPaperId"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Question Paper</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategory}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={!selectedCategory ? "Select category first" : "Select a paper"} />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {filteredPapers.map(p => <SelectItem key={p.id} value={p.id}>{p.fileName}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <FormField
                                control={scheduleForm.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Price (INR)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <FormField
                            control={scheduleForm.control}
                            name="startTime"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Start Date & Time</FormLabel>
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
                                            format(field.value, "dd/MM/yyyy HH:mm")
                                        ) : (
                                            <span>Pick a date and time</span>
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
                                        disabled={(date) => date < new Date("1900-01-01")}
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
                            <FormField
                            control={scheduleForm.control}
                            name="endTime"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>End Date & Time</FormLabel>
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
                                            format(field.value, "dd/MM/yyyy HH:mm")
                                        ) : (
                                            <span>Pick a date and time</span>
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
                                        disabled={(date) => date < (scheduleForm.getValues('startTime') || new Date())}
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
                        </div>
                        <DialogFooter>
                             <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                                {editingTest ? 'Update Test' : 'Schedule Test'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <Dialog open={isPaperEditDialogOpen} onOpenChange={setIsPaperEditDialogOpen}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-6">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-2xl font-bold">Edit Weekly Test Paper: {editingPaper?.fileName}</DialogTitle>
                    <DialogDescription>
                        Modify questions for {editingPaper?.examCategory}.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-hidden pt-4">
                    {editingPaper && (
                        <MCQStructuredEditor 
                            initialContent={editingPaper.content} 
                            onSave={handleSavePaperEdit}
                            onCancel={() => setIsPaperEditDialogOpen(false)}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
        <Card>
            <CardHeader>
                <CardTitle>All Scheduled Weekly Tests</CardTitle>
                <CardDescription>A complete list of upcoming, active, and completed tests.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Start Time</TableHead>
                                <TableHead>End Time</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {liveTests.length > 0 ? (
                                liveTests.map((test) => (
                                    <TableRow key={test.id}>
                                        <TableCell className="font-medium">{test.title}<br/><span className="text-xs text-muted-foreground">{getQuestionPaperName(test.questionPaperId)}</span></TableCell>
                                        <TableCell>{format(normalizeDate(test.startTime)!, "dd/MM/yyyy hh:mm a")}</TableCell>
                                        <TableCell>{format(normalizeDate(test.endTime)!, "dd/MM/yyyy hh:mm a")}</TableCell>
                                        <TableCell>{getStatus(test)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenScheduleDialog(test)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This action will permanently delete the weekly test "{test.title}".</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteTest(test.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No weekly tests scheduled yet.</TableCell>
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