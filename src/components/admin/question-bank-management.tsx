
"use client";

import { useState, useEffect, useMemo } from 'react';
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
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Eye, Trash2, Edit, FileJson, Search, FileText } from 'lucide-react';
import { deleteQuestionBankDocument, updateQuestionBankDocument } from '@/lib/firestore';
import { MCQStructuredEditor } from './mcq-structured-editor';
import { getFirebaseAuth } from '@/lib/firebase';
import type { BankedQuestion } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { JsonFormatGuide } from './json-format-guide';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MCQ } from '@/lib/types';

const examCategories = ["MTS", "POSTMAN", "PA", "IP", "GROUP B"] as const;

const questionBankSchema = z.object({
  examCategory: z.enum(examCategories, {
    required_error: 'You must select an exam category.',
  }),
  examYear: z.string().min(4, 'Please enter a valid year (e.g. 2024)').max(4, 'Year must be 4 digits'),
  files: z
    .array(z.instanceof(File))

    .min(1, 'Please upload at least one file.')
    .refine(
        (files) => files.every((file) => file.size <= 5 * 1024 * 1024),
        `File size must be less than 5MB.`
    )
    .refine(
        (files) => files.every((file) => file.type === 'application/json'),
        'All uploaded files must be in JSON format.'
    ),
});

interface QuestionBankManagementProps {
    initialBankedQuestions: BankedQuestion[];
}

export function QuestionBankManagement({ initialBankedQuestions }: QuestionBankManagementProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [bankedQuestions, setBankedQuestions] = useState<BankedQuestion[]>(initialBankedQuestions);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingQuestionBank, setEditingQuestionBank] = useState<BankedQuestion | null>(null);
  const [editingFileName, setEditingFileName] = useState('');
  const [editingYear, setEditingYear] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof questionBankSchema>>({
    resolver: zodResolver(questionBankSchema),
    defaultValues: {
        examCategory: undefined,
        examYear: new Date().getFullYear().toString(),
        files: [],
    }
  });

  const filteredQuestions = useMemo(() => {
    if (!searchTerm) {
      return bankedQuestions;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return bankedQuestions.filter(question =>
      question.fileName.toLowerCase().includes(lowercasedFilter) ||
      question.examCategory.toLowerCase().includes(lowercasedFilter) ||
      (question.examYear && question.examYear.toLowerCase().includes(lowercasedFilter)) ||
      question.content.toLowerCase().includes(lowercasedFilter)
    );
  }, [searchTerm, bankedQuestions]);

  const onSubmit = async (values: z.infer<typeof questionBankSchema>) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('examCategory', values.examCategory);
    formData.append('examYear', values.examYear);
    values.files.forEach(file => {
        formData.append('files', file);
    })

    try {
      const auth = getFirebaseAuth();
      const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : null;

      const response = await fetch('/api/question-bank/upload', {
        method: 'POST',
        headers: {
          'Authorization': idToken ? `Bearer ${idToken}` : '',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload files.');
      }

      const { newDocuments } = await response.json();
      setBankedQuestions(prev => [...newDocuments, ...prev]);

      toast({ title: 'Success', description: 'Question bank updated successfully.' });
      form.reset();
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error("Question bank upload error:", error);
      toast({ title: 'Upload Failed', description: error.message || 'Could not process the files.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
        await deleteQuestionBankDocument(docId);
        setBankedQuestions(prev => prev.filter(bq => bq.id !== docId));
        toast({ title: "Success", description: "Question paper deleted." });
    } catch (error) {
        console.error("Failed to delete question paper", error);
        toast({ title: "Error", description: "Could not delete the question paper.", variant: "destructive" });
    }
  }

  const handleOpenEditDialog = (bq: BankedQuestion) => {
    setEditingQuestionBank(bq);
    setEditingFileName(bq.fileName);
    setEditingYear(bq.examYear || '');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (newContent: string) => {
    if (!editingQuestionBank) return;
    setIsSaving(true);
    try {
        await updateQuestionBankDocument(editingQuestionBank.id, newContent, editingFileName, editingYear);
        setBankedQuestions(prev => prev.map(bq => bq.id === editingQuestionBank.id ? { ...bq, content: newContent, fileName: editingFileName, examYear: editingYear } : bq));
        setIsEditDialogOpen(false);
        setEditingQuestionBank(null);
        setEditingFileName('');
        setEditingYear('');
        toast({ title: "Success", description: "Question bank updated successfully." });
    } catch (error: any) {
        console.error("Failed to update question bank document", error);
        throw error;
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleDownload = (question: BankedQuestion) => {
    const blob = new Blob([question.content], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const safeFileName = question.fileName.replace(/\.[^/.]+$/, '.json');
    link.setAttribute("download", safeFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleDownloadPdf = (question: BankedQuestion) => {
    try {
        const mcqs: MCQ[] = JSON.parse(question.content).mcqs || JSON.parse(question.content);
        if (!Array.isArray(mcqs)) throw new Error("Invalid MCQ format");

        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.text("Anjalkaran Exam Portal", 14, 22);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Question Bank: ${question.examCategory}${question.examYear ? ` (${question.examYear})` : ''}`, 14, 32);
        doc.text(`File: ${question.fileName}`, 14, 38);
        doc.text(`Exported on: ${format(new Date(), "dd/MM/yyyy")}`, 14, 44);

        const toEnglish = (text: string) => {
            if (!text) return "";
            // Strip HTML
            let res = text.replace(/<[^>]*>?/gm, '');
            // Filter out Tamil characters if present
            res = res.replace(/[\u0B80-\u0BFF]+/g, '');
            return res.trim().replace(/\s\s+/g, ' ');
        };

        const tableData = mcqs.map((mcq, idx) => {
            const q = mcq.translations?.en?.question || mcq.question;
            const opts = mcq.translations?.en?.options || mcq.options;
            const ans = mcq.translations?.en?.correctAnswer || mcq.correctAnswer;
            const sol = mcq.translations?.en?.solution || mcq.solution;

            return [
                `${idx + 1}`,
                toEnglish(q),
                opts.map(o => toEnglish(o)).join("\n"),
                toEnglish(ans),
                toEnglish(sol || "-")
            ];
        });

        autoTable(doc, {
            startY: 50,
            head: [['#', 'Question', 'Options', 'Answer', 'Solution']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [180, 0, 0] },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 60 },
                2: { cellWidth: 40 },
                3: { cellWidth: 30 },
                4: { cellWidth: 40 },
            },
            styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        });

        doc.save(`${question.fileName.replace(/\.[^a-z0-9]/gi, '_')}.pdf`);
        toast({ title: "Success", description: "PDF generated and downloading." });
    } catch (error: any) {
        console.error("PDF generation error:", error);
        toast({ title: "Error", description: "Failed to generate PDF. Is the JSON valid?", variant: "destructive" });
    }
  }
  
  const getFormattedContent = (content: string) => {
    try {
      const jsonContent = JSON.parse(content);
      return JSON.stringify(jsonContent, null, 2);
    } catch (error) {
      return content;
    }
  };

  return (
    <div className="space-y-6">
        <Card>
        <CardHeader>
            <CardTitle>Upload Question Papers</CardTitle>
            <CardDescription>Upload JSON files containing previous years' questions. These will be used to generate new mock tests.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="examCategory"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Exam Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                    control={form.control}
                    name="examYear"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Exam Year</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. 2024" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <FormField
                control={form.control}
                name="files"
                render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                    <FormLabel>Previous Questions Files (.json only)</FormLabel>
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
                <JsonFormatGuide type="question-bank" />

                <Button type="submit" disabled={isUploading}>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Questions
                </Button>
            </form>
            </Form>
        </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Uploaded Question Papers</CardTitle>
                <CardDescription>View, edit, and manage previously uploaded question papers.</CardDescription>
                 <div className="relative pt-2">
                    <Search className="absolute left-2.5 top-4 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by file name, category, or content..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-full"
                    />
                </div>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File Name</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Exam Category</TableHead>
                                <TableHead>Uploaded At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredQuestions.length > 0 ? (
                                filteredQuestions.map((bq) => (
                                    <TableRow key={bq.id}>
                                        <TableCell className="font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">{bq.fileName}</TableCell>
                                        <TableCell>{bq.examYear || '-'}</TableCell>
                                        <TableCell>{bq.examCategory}</TableCell>
                                        <TableCell>{format(new Date(bq.uploadedAt), "dd/MM/yyyy p")}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-3xl">
                                                    <DialogHeader>
                                                        <DialogTitle>{bq.fileName}</DialogTitle>
                                                        <DialogDescription>Content for {bq.examCategory}</DialogDescription>
                                                    </DialogHeader>
                                                    <ScrollArea className="h-96 w-full rounded-md border p-4">
                                                        <pre className="text-sm whitespace-pre-wrap">{getFormattedContent(bq.content)}</pre>
                                                    </ScrollArea>
                                                </DialogContent>
                                            </Dialog>
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(bq)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDownload(bq)} title="Download JSON">
                                                <FileJson className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(bq)} title="Download PDF" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                <FileText className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This will permanently delete the question paper "{bq.fileName}". This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(bq.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No question papers found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                 </div>
            </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-6">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-2xl font-bold">Edit Question Bank</DialogTitle>
                    <DialogDescription>
                        Modify questions and file name for {editingQuestionBank?.examCategory}.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">File Name</Label>
                            <Input 
                                value={editingFileName} 
                                onChange={(e) => setEditingFileName(e.target.value)}
                                placeholder="Enter file name (e.g., Chennai Circle 2024 PA.json)"
                                className="bg-slate-50 border-slate-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Exam Year</Label>
                            <Input 
                                value={editingYear} 
                                onChange={(e) => setEditingYear(e.target.value)}
                                placeholder="e.g. 2024"
                                className="bg-slate-50 border-slate-200"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-hidden pt-4">
                    {editingQuestionBank && (
                        <MCQStructuredEditor 
                            initialContent={editingQuestionBank.content} 
                            onSave={handleSaveEdit}
                            onCancel={() => setIsEditDialogOpen(false)}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}

    