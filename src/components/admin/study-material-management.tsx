
"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { StudyMaterial } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, Upload, Edit, Search, Eye } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { deleteStudyMaterial } from '@/lib/firestore';
import { ScrollArea } from '../ui/scroll-area';

const examCategories = ["MTS", "POSTMAN", "PA"] as const;

const materialSchema = z.object({
  title: z.string().min(3, 'Title is required and must be at least 3 characters.'),
  examCategories: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one exam category.",
  }),
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, 'Please upload a file.')
    .refine((file) => file.size <= 4 * 1024 * 1024, `File size must be less than 4MB.`)
    .refine((file) => file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'File must be a .docx document.'),
});

interface StudyMaterialManagementProps {
    initialMaterials: StudyMaterial[];
}

export function StudyMaterialManagement({ initialMaterials }: StudyMaterialManagementProps) {
    const [materials, setMaterials] = useState<StudyMaterial[]>(initialMaterials);
    const [isUploading, setIsUploading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    const materialForm = useForm<z.infer<typeof materialSchema>>({
        resolver: zodResolver(materialSchema),
        defaultValues: {
            title: '',
            examCategories: [],
            file: undefined,
        },
    });

    const onMaterialSubmit = async (values: z.infer<typeof materialSchema>) => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', values.file);
        formData.append('title', values.title);
        values.examCategories.forEach(cat => formData.append('examCategories', cat));

        try {
            const response = await fetch('/api/study-material/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload file.');
            }

            const { newDocument } = await response.json();
            setMaterials(prev => [newDocument, ...prev].sort((a,b) => a.title.localeCompare(b.title)));
            
            toast({ title: 'Success', description: 'Study material uploaded successfully.' });
            materialForm.reset();
            setIsDialogOpen(false);

        } catch (error: any) {
            console.error("Material upload error:", error);
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
            toast({ title: 'Error', description: 'Failed to delete study material.', variant: 'destructive' });
        }
    };
    
    const filteredMaterials = useMemo(() => {
        if (!searchTerm) {
          return materials;
        }
        const lowercasedFilter = searchTerm.toLowerCase();
        return materials.filter(material =>
          material.title.toLowerCase().includes(lowercasedFilter) ||
          material.fileName.toLowerCase().includes(lowercasedFilter)
        );
    }, [searchTerm, materials]);

    return (
        <div className="space-y-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload New Study Material
                    </Button>
                </DialogTrigger>
                <DialogContent>
                     <DialogHeader>
                        <DialogTitle>Add New Study Material</DialogTitle>
                    </DialogHeader>
                    <Form {...materialForm}>
                        <form onSubmit={materialForm.handleSubmit(onMaterialSubmit)} className="space-y-4">
                            <FormField
                                control={materialForm.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl><Input placeholder="e.g., Post Office Guide Part I" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={materialForm.control}
                                name="examCategories"
                                render={() => (
                                    <FormItem>
                                        <div className="mb-2">
                                            <FormLabel>Exam Categories</FormLabel>
                                        </div>
                                        <div className="space-y-2">
                                        {examCategories.map((item) => (
                                            <FormField
                                                key={item}
                                                control={materialForm.control}
                                                name="examCategories"
                                                render={({ field }) => (
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(item)}
                                                                onCheckedChange={(checked) => (
                                                                    checked
                                                                        ? field.onChange([...(field.value || []), item])
                                                                        : field.onChange(field.value?.filter((value) => value !== item))
                                                                )}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">{item}</FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={materialForm.control}
                                name="file"
                                render={({ field: { onChange, ...fieldProps } }) => (
                                    <FormItem>
                                        <FormLabel>Material File (.docx)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="file" 
                                                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isUploading}>
                                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Upload"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Study Materials</CardTitle>
                    <CardDescription>View, edit, or delete existing study materials.</CardDescription>
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
                                    filteredMaterials.map((material) => (
                                        <TableRow key={material.id}>
                                            <TableCell className="font-medium">{material.title}</TableCell>
                                            <TableCell>{material.fileName}</TableCell>
                                            <TableCell>{format(material.uploadedAt, "dd/MM/yyyy p")}</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Dialog>
                                                    <DialogTrigger asChild><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></DialogTrigger>
                                                    <DialogContent className="max-w-4xl h-[90vh]">
                                                        <DialogHeader><DialogTitle>{material.title}</DialogTitle></DialogHeader>
                                                        <ScrollArea className="h-full w-full rounded-md border p-4">
                                                            <pre className="text-sm whitespace-pre-wrap font-sans">{material.content}</pre>
                                                        </ScrollArea>
                                                    </DialogContent>
                                                </Dialog>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete: {material.title}?</AlertDialogTitle>
                                                            <AlertDialogDescription>This action is permanent and cannot be undone.</AlertDialogDescription>
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
