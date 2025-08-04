
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
import { Loader2, Upload, Eye, Trash2, Search, Edit, Download } from 'lucide-react';
import { deleteTopicMCQDocument, updateTopicMCQDocument } from '@/lib/firestore';
import type { Topic, TopicMCQ, MCQ } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const uploadSchema = z.object({
  topicId: z.string({
    required_error: 'You must select a topic.',
  }),
  files: z
    .array(z.instanceof(File))
    .min(1, 'Please upload at least one file.')
    .refine(
        (files) => files.every((file) => file.size <= 4 * 1024 * 1024),
        `Each file size must be less than 4MB.`
    ),
});

interface TopicMCQManagementProps {
    initialTopics: Topic[];
    initialTopicMCQs: TopicMCQ[];
}

export function TopicMCQManagement({ initialTopics, initialTopicMCQs }: TopicMCQManagementProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [topics] = useState<Topic[]>(initialTopics);
  const [topicMCQs, setTopicMCQs] = useState<TopicMCQ[]>(initialTopicMCQs || []);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMCQ, setEditingMCQ] = useState<TopicMCQ | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
        topicId: undefined,
        files: [],
    }
  });

  const onSubmit = async (values: z.infer<typeof uploadSchema>) => {
    setIsUploading(true);
    const formData = new FormData();
    const selectedTopic = topics.find(t => t.id === values.topicId);
    if (!selectedTopic) {
        toast({ title: 'Error', description: 'Selected topic not found.', variant: 'destructive'});
        setIsUploading(false);
        return;
    }

    formData.append('topicId', values.topicId);
    formData.append('topicTitle', selectedTopic.title);
    values.files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/topic-mcq-bank/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload files.');
      }

      const { newDocument } = await response.json();
      setTopicMCQs(prev => {
        const existingDocIndex = prev.findIndex(doc => doc.topicId === newDocument.topicId);
        if (existingDocIndex > -1) {
            const updatedDocs = [...prev];
            updatedDocs[existingDocIndex] = newDocument;
            return updatedDocs;
        } else {
            return [newDocument, ...prev];
        }
      });

      toast({ title: 'Success', description: 'Topic MCQ file(s) uploaded and processed successfully.' });
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

  const handleOpenEditDialog = (mcqDoc: TopicMCQ) => {
    setEditingMCQ(mcqDoc);
    setEditedContent(mcqDoc.content);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingMCQ) return;
    setIsSaving(true);
    try {
        // Validate JSON content before saving
        JSON.parse(editedContent);
        await updateTopicMCQDocument(editingMCQ.id, editedContent);
        setTopicMCQs(prev => prev.map(q => q.id === editingMCQ.id ? { ...q, content: editedContent } : q));
        toast({ title: "Success", description: "Document updated successfully." });
        setIsEditDialogOpen(false);
        setEditingMCQ(null);
    } catch (error: any) {
        console.error("Failed to update document", error);
        const errorMessage = error instanceof SyntaxError ? "Invalid JSON format. Please check your syntax." : "Could not update the document.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleDownload = (mcqDoc: TopicMCQ) => {
    const blob = new Blob([mcqDoc.content], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const safeFileName = mcqDoc.fileName.replace(/\.[^/.]+$/, '.json');
    link.setAttribute("download", safeFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const getTopicTitle = (topicId: string) => {
    return topics.find(t => t.id === topicId)?.title || 'Unknown Topic';
  }
  
  const getFormattedContent = (content: string) => {
    try {
      const jsonContent = JSON.parse(content);
      return JSON.stringify(jsonContent, null, 2);
    } catch (error) {
      return content;
    }
  };

  const filteredTopicMCQs = useMemo(() => {
    if (!searchTerm) {
        return topicMCQs;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return topicMCQs.filter(tm => 
        getTopicTitle(tm.topicId).toLowerCase().includes(lowercasedFilter) ||
        tm.fileName.toLowerCase().includes(lowercasedFilter) ||
        tm.content.toLowerCase().includes(lowercasedFilter)
    );
  }, [searchTerm, topicMCQs, topics]);


  return (
    <div className="space-y-6">
        <Card>
        <CardHeader>
            <CardTitle>Upload Topic-Specific MCQs</CardTitle>
            <CardDescription>Upload one or more JSON or DOCX files for a specific topic. New questions will be added to the existing ones for that topic.</CardDescription>
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
                name="files"
                render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                    <FormLabel>MCQ Documents (.json, .docx)</FormLabel>
                    <FormControl>
                        <Input 
                        type="file" 
                        accept=".json,.docx"
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
                Upload & Process MCQs
                </Button>
            </form>
            </Form>
        </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Uploaded Topic MCQ Documents</CardTitle>
                <CardDescription>View and manage previously uploaded question documents for each topic.</CardDescription>
                 <div className="relative pt-2">
                    <Search className="absolute left-2.5 top-4 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by topic, file name, or content..."
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
                                <TableHead>Topic</TableHead>
                                <TableHead>File Name</TableHead>
                                <TableHead>Uploaded At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTopicMCQs && filteredTopicMCQs.length > 0 ? (
                                filteredTopicMCQs.map((tm) => (
                                    <TableRow key={tm.id}>
                                        <TableCell className="font-medium">{getTopicTitle(tm.topicId)}</TableCell>
                                        <TableCell>{tm.fileName}</TableCell>
                                        <TableCell>{format(new Date(tm.uploadedAt), "dd/MM/yyyy p")}</TableCell>
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
                                                        <pre className="text-sm whitespace-pre-wrap">{getFormattedContent(tm.content)}</pre>
                                                    </ScrollArea>
                                                </DialogContent>
                                            </Dialog>
                                            <Button variant="ghost" size="icon" onClick={() => handleDownload(tm)}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(tm)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
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
                                        No topic-specific MCQ documents found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                 </div>
            </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Edit: {editingMCQ?.fileName}</DialogTitle>
                    <DialogDescription>
                        Make changes to the JSON content below. Ensure the format remains valid.
                    </DialogDescription>
                </DialogHeader>
                <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="h-96 text-sm font-mono"
                    placeholder='{ "mcqs": [ { "question": "...", "options": [...], ... } ] }'
                />
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSaveEdit} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
