
"use client";

import { useState, useMemo } from 'react';
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
import { deleteTopicMCQDocument } from '@/lib/firestore';
import type { Topic, TopicMCQ } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from '@/lib/utils';

const uploadSchema = z.object({
  topicId: z.string({
    required_error: 'You must select a topic.',
  }),
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, 'Please upload a file.')
    .refine(
        (file) => file.size <= 4 * 1024 * 1024,
        `File size must be less than 4MB.`
    ),
});

interface TopicMCQManagementProps {
    initialTopics: Topic[];
    initialTopicMCQs: TopicMCQ[];
}

export function TopicMCQManagement({ initialTopics, initialTopicMCQs }: TopicMCQManagementProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [topics] = useState<Topic[]>(initialTopics);
  const [topicMCQs, setTopicMCQs] = useState<TopicMCQ[]>(initialTopicMCQs);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
        topicId: undefined,
        file: undefined,
    }
  });

  const onSubmit = async (values: z.infer<typeof uploadSchema>) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('topicId', values.topicId);
    formData.append('file', values.file);

    try {
      const response = await fetch('/api/topic-mcq-bank/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file.');
      }

      const { newDocument } = await response.json();
      setTopicMCQs(prev => [newDocument, ...prev]);

      toast({ title: 'Success', description: 'Topic MCQ file uploaded successfully.' });
      form.reset();
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error("Topic MCQ upload error:", error);
      toast({ title: 'Upload Failed', description: error.message || 'Could not process the file.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
        await deleteTopicMCQDocument(docId);
        setTopicMCQs(prev => prev.filter(tm => tm.id !== docId));
        toast({ title: "Success", description: "Topic MCQ document deleted." });
    } catch (error) {
        console.error("Failed to delete topic MCQ document", error);
        toast({ title: "Error", description: "Could not delete the document.", variant: "destructive" });
    }
  }

  const getTopicTitle = (topicId: string) => {
    return topics.find(t => t.id === topicId)?.title || 'Unknown Topic';
  }

  return (
    <div className="space-y-6">
        <Card>
        <CardHeader>
            <CardTitle>Upload Topic-Specific MCQs</CardTitle>
            <CardDescription>Upload a DOCX file containing questions for a specific topic. These questions will be used for quizzes on that topic after being verified by AI.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                control={form.control}
                name="topicId"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Topic</FormLabel>
                     <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value
                                ? topics.find(
                                    (topic) => topic.id === field.value
                                )?.title
                                : "Select a topic"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" style={{minWidth: "var(--radix-popover-trigger-width)"}}>
                        <Command>
                            <CommandInput placeholder="Search topic..." />
                            <CommandList>
                                <CommandEmpty>No topic found.</CommandEmpty>
                                <CommandGroup>
                                {topics.map((topic) => (
                                    <CommandItem
                                    value={topic.title}
                                    key={topic.id}
                                    onSelect={() => {
                                        form.setValue("topicId", topic.id)
                                        setPopoverOpen(false)
                                    }}
                                    >
                                    <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        topic.id === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                    />
                                    {topic.title}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                    <FormLabel>MCQ Document (.docx)</FormLabel>
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
                Upload MCQs for Topic
                </Button>
            </form>
            </Form>
        </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Uploaded Topic MCQ Documents</CardTitle>
                <CardDescription>View and manage previously uploaded question documents for each topic.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Topic</TableHead>
                                <TableHead>File Name</TableHead>
                                <TableHead>Uploaded At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topicMCQs.length > 0 ? (
                                topicMCQs.map((tm) => (
                                    <TableRow key={tm.id}>
                                        <TableCell className="font-medium">{getTopicTitle(tm.topicId)}</TableCell>
                                        <TableCell>{tm.fileName}</TableCell>
                                        <TableCell>{format(new Date(tm.uploadedAt), "PPP p")}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-3xl">
                                                    <DialogHeader>
                                                        <DialogTitle>{tm.fileName}</DialogTitle>
                                                        <DialogDescription>Content for {getTopicTitle(tm.topicId)}</DialogDescription>
                                                    </DialogHeader>
                                                    <ScrollArea className="h-96 w-full rounded-md border p-4">
                                                        <pre className="text-sm whitespace-pre-wrap">{tm.content}</pre>
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
                                                        <AlertDialogDescription>This will permanently delete the MCQ document "{tm.fileName}". This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(tm.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No topic-specific MCQ documents uploaded yet.
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
