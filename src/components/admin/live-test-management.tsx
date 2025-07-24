
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
import { deleteLiveTestBankDocument } from '@/lib/firestore';
import type { BankedQuestion } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const examCategories = ["MTS", "POSTMAN", "PA"] as const;

const liveTestBankSchema = z.object({
  examCategory: z.enum(examCategories, {
    required_error: 'You must select an exam category.',
  }),
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, 'Please upload a file.')
    .refine(
        (file) => file.size <= 4 * 1024 * 1024,
        `File size must be less than 4MB.`
    ),
});

interface LiveTestManagementProps {
    initialLiveTestBank: BankedQuestion[];
}

export function LiveTestManagement({ initialLiveTestBank }: LiveTestManagementProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [liveTestBank, setLiveTestBank] = useState<BankedQuestion[]>(initialLiveTestBank);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof liveTestBankSchema>>({
    resolver: zodResolver(liveTestBankSchema),
    defaultValues: {
        examCategory: undefined,
        file: undefined,
    }
  });

  const onSubmit = async (values: z.infer<typeof liveTestBankSchema>) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('examCategory', values.examCategory);
    formData.append('file', values.file);

    try {
      const response = await fetch('/api/live-test-bank/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file.');
      }

      const { newDocument } = await response.json();
      setLiveTestBank(prev => [newDocument, ...prev]);

      toast({ title: 'Success', description: 'Live test paper uploaded successfully.' });
      form.reset();
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error("Live test upload error:", error);
      toast({ title: 'Upload Failed', description: error.message || 'Could not process the file.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
        await deleteLiveTestBankDocument(docId);
        setLiveTestBank(prev => prev.filter(bq => bq.id !== docId));
        toast({ title: "Success", description: "Live test paper deleted." });
    } catch (error) {
        console.error("Failed to delete live test paper", error);
        toast({ title: "Error", description: "Could not delete the live test paper.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
        <Card>
        <CardHeader>
            <CardTitle>Upload Live Test Question Paper</CardTitle>
            <CardDescription>Upload a single DOCX file for an upcoming live test. This will be stored in a separate collection from the general question bank.</CardDescription>
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
                name="file"
                render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                    <FormLabel>Question Paper File (.docx)</FormLabel>
                    <FormControl>
                        <Input 
                        type="file" 
                        accept=".docx"
                        onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
                        {...rest}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="submit" disabled={isUploading}>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Live Test Paper
                </Button>
            </form>
            </Form>
        </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Uploaded Live Test Papers</CardTitle>
                <CardDescription>View and manage previously uploaded papers. You will use the Document ID from this table to schedule a live test.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File Name</TableHead>
                                <TableHead>Document ID</TableHead>
                                <TableHead>Exam</TableHead>
                                <TableHead>Uploaded At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {liveTestBank.length > 0 ? (
                                liveTestBank.map((bq) => (
                                    <TableRow key={bq.id}>
                                        <TableCell className="font-medium">{bq.fileName}</TableCell>
                                        <TableCell><code className="text-xs">{bq.id}</code></TableCell>
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
                                                        <AlertDialogDescription>This will permanently delete the live test paper "{bq.fileName}". This action cannot be undone.</AlertDialogDescription>
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
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No live test papers uploaded yet.
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
