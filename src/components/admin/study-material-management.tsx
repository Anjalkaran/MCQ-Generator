
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
import { Loader2, Upload, Trash2, Eye, FileText, Check, ChevronsUpDown, Search } from 'lucide-react';
import { deleteStudyMaterial } from '@/lib/firestore';
import type { Topic, StudyMaterial } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const examCategories = ["MTS", "POSTMAN", "PA", "IP"] as const;

const formSchema = z.object({
  topicId: z.string().optional(),
  file: z
    .any()
    .refine((files) => files?.length === 1, 'File is required.')
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE_BYTES, `Max file size is ${MAX_FILE_SIZE_MB}MB.`)
    .refine(
      (files) => ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'].includes(files?.[0]?.type),
      '.pdf, .docx, and .txt files are accepted.'
    ),
  examCategories: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one exam category.",
  }),
});

interface StudyMaterialManagementProps {
    initialTopics: Topic[];
    initialMaterials: StudyMaterial[];
}

export function StudyMaterialManagement({ initialTopics, initialMaterials }: StudyMaterialManagementProps) {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [topics] = useState<Topic[]>(initialTopics);
    const [materials, setMaterials] = useState<StudyMaterial[]>(initialMaterials);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            topicId: 'new',
            examCategories: [],
        }
    });

    const { register, handleSubmit, control, formState: { errors }, setValue, watch } = form;

    const filteredMaterials = useMemo(() => {
        if (!searchTerm) {
          return materials;
        }
        const lowercasedFilter = searchTerm.toLowerCase();
        return materials.filter(material =>
          getTopicTitle(material.topicId).toLowerCase().includes(lowercasedFilter) ||
          material.fileName.toLowerCase().includes(lowercasedFilter)
        );
      }, [searchTerm, materials, topics]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', values.file[0]);
        if (values.topicId) {
            formData.append('topicId', values.topicId);
        }
        formData.append('examCategories', values.examCategories.join(','));

        try {
            const response = await fetch('/api/study-material/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload file.');
            }

            const { document: newDocument } = await response.json();
            setMaterials(prev => [newDocument, ...prev].sort((a,b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()));

            toast({ title: 'Success', description: 'Study material uploaded successfully.' });
            form.reset({ topicId: 'new', file: undefined, examCategories: [] });
            setIsUploadDialogOpen(false);
            
        } catch (error: any) {
            console.error("Study material upload error:", error);
            toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleDelete = async (materialId: string) => {
        try {
            await deleteStudyMaterial(materialId);
            setMaterials(prev => prev.filter(m => m.id !== materialId));
            toast({ title: 'Success', description: 'Study material deleted.' });
        } catch (error) {
            console.error("Failed to delete study material", error);
            toast({ title: 'Error', description: 'Could not delete the material.', variant: 'destructive' });
        }
    };
    
    const getTopicTitle = (topicId: string) => topics.find(t => t.id === topicId)?.title || 'N/A';

    return (
        <div className="space-y-6">
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload New Study Material
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Study Material</DialogTitle>
                        <DialogDescription>
                            Upload study material for a topic. You can link it to an existing topic or create a new topic based on the filename. Supported formats: .pdf, .docx, .txt
                        </DialogDescription>
                    </DialogHeader>
                     <Form {...form}>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={control}
                                name="topicId"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Topic (Optional)</FormLabel>
                                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                {field.value && field.value !== 'new'
                                                    ? topics.find(topic => topic.id === field.value)?.title
                                                    : "Create New Topic from Filename"}
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
                                                        <CommandItem key="new-topic" value="Create New Topic from Filename" onSelect={() => { setValue("topicId", "new"); setPopoverOpen(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", field.value === "new" ? "opacity-100" : "opacity-0")} />
                                                            Create New Topic from Filename
                                                        </CommandItem>
                                                        {topics.map((topic) => (
                                                            <CommandItem value={topic.title} key={topic.id} onSelect={() => { setValue("topicId", topic.id); setPopoverOpen(false); }}>
                                                                <Check className={cn("mr-2 h-4 w-4", topic.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                {topic.title}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>Select an existing topic or leave as is to auto-create a new one.</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                            control={control}
                            name="examCategories"
                            render={() => (
                                <FormItem>
                                <div className="mb-4">
                                    <FormLabel className="text-base">Exam Categories</FormLabel>
                                    <FormDescription>Select which courses this material should be available for.</FormDescription>
                                </div>
                                <div className="space-y-2">
                                {examCategories.map((item) => (
                                    <FormField
                                    key={item}
                                    control={control}
                                    name="examCategories"
                                    render={({ field }) => {
                                        return (
                                        <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(item)}
                                                onCheckedChange={(checked) => {
                                                return checked
                                                    ? field.onChange([...(field.value || []), item])
                                                    : field.onChange(
                                                        field.value?.filter(
                                                        (value) => value !== item
                                                        )
                                                    )
                                                }}
                                            />
                                            </FormControl>
                                            <FormLabel className="font-normal">{item}</FormLabel>
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
                            <FormItem>
                                <FormLabel>Material File</FormLabel>
                                <FormControl>
                                    <Input type="file" {...register("file")} />
                                </FormControl>
                                {errors.file && <p className="text-sm font-medium text-destructive">{`${errors.file.message}`}</p>}
                            </FormItem>

                            <Button type="submit" disabled={isUploading} className="w-full">
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Upload Material
                            </Button>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            
            <Card>
                <CardHeader>
                    <CardTitle>Manage Study Materials</CardTitle>
                    <CardDescription>View or delete existing study materials.</CardDescription>
                     <div className="relative pt-2">
                        <Search className="absolute left-2.5 top-4 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by title or file name..."
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
                                    <TableHead>Title</TableHead>
                                    <TableHead>File Name</TableHead>
                                    <TableHead>Uploaded At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMaterials.length > 0 ? (
                                    filteredMaterials.map(material => (
                                        <TableRow key={material.id}>
                                            <TableCell className="font-medium">{getTopicTitle(material.topicId)}</TableCell>
                                            <TableCell>{material.fileName}</TableCell>
                                            <TableCell>{format(new Date(material.uploadedAt), 'dd/MM/yyyy p')}</TableCell>
                                            <TableCell className="text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-3xl">
                                                        <DialogHeader>
                                                            <DialogTitle>{material.fileName}</DialogTitle>
                                                        </DialogHeader>
                                                        <ScrollArea className="h-96 w-full rounded-md border p-4">
                                                            <pre className="text-sm whitespace-pre-wrap">{material.content}</pre>
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
                                                            <AlertDialogDescription>This will permanently delete the material "{material.fileName}". This action cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(material.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No study materials found.</TableCell>
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

