
"use client";

import { useState } from 'react';
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
import { Loader2, Upload, Eye, Trash2 } from 'lucide-react';
import { addQuestionBankDocument, deleteQuestionBankDocument } from '@/lib/firestore';
import type { BankedQuestion } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const examCategories = ["MTS", "POSTMAN", "PA"] as const;

const questionBankSchema = z.object({
  examCategory: z.enum(examCategories, {
    required_error: 'You must select an exam category.',
  }),
  files: z
    .array(z.instanceof(File))
    .min(1, 'Please upload at least one file.')
    .refine(
        (files) => files.every((file) => file.size <= 4 * 1024 * 1024),
        `File size must be less than 4MB.`
    ),
});

interface QuestionBankManagementProps {
    initialBankedQuestions: BankedQuestion[];
}

export function QuestionBankManagement({ initialBankedQuestions }: QuestionBankManagementProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [bankedQuestions, setBankedQuestions] = useState<BankedQuestion[]>(initialBankedQuestions);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof questionBankSchema>>({
    resolver: zodResolver(questionBankSchema),
    defaultValues: {
        examCategory: undefined,
        files: [],
    }
  });

  const onSubmit = async (values: z.infer<typeof questionBankSchema>) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('examCategory', values.examCategory);
    values.files.forEach(file => {
        formData.append('files', file);
    })

    try {
      const response = await fetch('/api/question-bank/upload', {
        method: 'POST',
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

  return (
    <div className="space-y-6">
        <Card>
        <CardHeader>
            <CardTitle>Upload Question Papers</CardTitle>
            <CardDescription>Upload DOCX files containing previous years' questions. These will be used as a reference to generate new MCQs.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                name="files"
                render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                    <FormLabel>Previous Questions Files</FormLabel>
                    <FormControl>
                        <Input 
                        type="file" 
                        accept=".docx"
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
                Upload Questions
                </Button>
            </form>
            </Form>
        </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Uploaded Question Papers</CardTitle>
                <CardDescription>View and manage previously uploaded question papers.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File Name</TableHead>
                                <TableHead>Exam Category</TableHead>
                                <TableHead>Uploaded At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bankedQuestions.length > 0 ? (
                                bankedQuestions.map((bq) => (
                                    <TableRow key={bq.id}>
                                        <TableCell className="font-medium">{bq.fileName}</TableCell>
                                        <TableCell>{bq.examCategory}</TableCell>
                                        <TableCell>{format(new Date(bq.uploadedAt), "PPP p")}</TableCell>
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
                                                        <pre className="text-sm whitespace-pre-wrap">{bq.content}</pre>
                                                    </ScrollArea>
                                                </DialogContent>
                                            </Dialog>
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
                                        No question papers uploaded yet.
                                    </TableCell>
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
