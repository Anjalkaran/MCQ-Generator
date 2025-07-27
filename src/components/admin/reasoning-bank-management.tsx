
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Image as ImageIcon, Check, Trash2, Edit } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Image from 'next/image';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import type { ReasoningQuestion } from '@/lib/types';
import { deleteReasoningQuestion } from '@/lib/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const examCategories = ["MTS", "POSTMAN", "PA"] as const;

const fileSchema = z.instanceof(File).refine(file => file.size > 0, 'File is required.').refine(
    (file) => file.size <= 2 * 1024 * 1024,
    `Max image size is 2MB.`
).refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Only .jpg, .jpeg, .png and .webp formats are supported."
);

const optionalFileSchema = z.instanceof(File).optional().refine(
    (file) => !file || file.size <= 2 * 1024 * 1024,
    `Max image size is 2MB.`
).refine(
    (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Only .jpg, .jpeg, .png and .webp formats are supported."
);

const reasoningBankSchema = z.object({
  questionImage: fileSchema,
  questionText: z.string().optional(),
  optionImage1: fileSchema,
  optionImage2: fileSchema,
  optionImage3: fileSchema,
  optionImage4: fileSchema,
  solutionImage: optionalFileSchema,
  correctAnswerIndex: z.string({ required_error: "Please select the correct answer."}),
  examCategories: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one exam category.",
  }),
});

function ImagePreview({ file, src: srcProp }: { file?: File, src?: string }) {
    const src = file ? URL.createObjectURL(file) : srcProp;
    if (!src) return null;

    return (
        <div className="mt-2 relative w-32 h-32 border rounded-md overflow-hidden">
            <Image src={src} alt="Preview" layout="fill" objectFit="contain" />
        </div>
    );
}

interface ReasoningBankManagementProps {
    initialQuestions: ReasoningQuestion[];
}

export function ReasoningBankManagement({ initialQuestions }: ReasoningBankManagementProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [questions, setQuestions] = useState(initialQuestions);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof reasoningBankSchema>>({
    resolver: zodResolver(reasoningBankSchema),
    defaultValues: {
        examCategories: [],
    }
  });
  
  const watchedFiles = form.watch(["questionImage", "optionImage1", "optionImage2", "optionImage3", "optionImage4", "solutionImage"]);

  const onSubmit = async (values: z.infer<typeof reasoningBankSchema>) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('questionImage', values.questionImage);
    if (values.questionText) {
        formData.append('questionText', values.questionText);
    }
    formData.append('optionImage1', values.optionImage1);
    formData.append('optionImage2', values.optionImage2);
    formData.append('optionImage3', values.optionImage3);
    formData.append('optionImage4', values.optionImage4);
    if (values.solutionImage) {
        formData.append('solutionImage', values.solutionImage);
    }
    formData.append('correctAnswerIndex', values.correctAnswerIndex);
    values.examCategories.forEach(cat => formData.append('examCategories', cat));

    try {
        const response = await fetch('/api/reasoning-bank/upload', {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload.');
        }
        const { newQuestion } = await response.json();
        setQuestions(prev => [newQuestion, ...prev]);
        toast({ title: 'Success', description: 'Reasoning question uploaded successfully.' });
        form.reset();

    } catch (error: any) {
        toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsUploading(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    // Note: This only deletes the Firestore document. The images in Storage remain.
    // A more advanced implementation would use a Cloud Function to delete associated images.
    try {
        await deleteReasoningQuestion(questionId);
        setQuestions(prev => prev.filter(q => q.id !== questionId));
        toast({ title: "Success", description: "Question deleted from the database."});
    } catch(err) {
        toast({ title: "Error", description: "Failed to delete question.", variant: "destructive"});
    }
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Upload Reasoning Question</CardTitle>
                <CardDescription>Upload image-based questions and options for the reasoning test.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="questionImage"
                            render={({ field: { onChange, ...rest } }) => (
                                <FormItem>
                                    <FormLabel>Question Image</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0])} {...rest} />
                                    </FormControl>
                                    <ImagePreview file={watchedFiles[0]} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="questionText"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Question Text (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="If the question is text-based and refers to the image above, enter it here." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="correctAnswerIndex"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Options (Upload 4 images and select the correct answer)</FormLabel>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    {[1, 2, 3, 4].map((i) => (
                                        <FormItem key={i} className="flex flex-col space-y-2 p-4 border rounded-md">
                                             <div className="flex items-center space-x-3">
                                                <FormControl>
                                                    <RadioGroupItem value={`${i - 1}`} />
                                                </FormControl>
                                                <FormLabel className="font-normal">Option {i} (Correct Answer)</FormLabel>
                                             </div>
                                            <FormField
                                                control={form.control}
                                                name={`optionImage${i}` as any}
                                                render={({ field: { onChange, ...rest } }) => (
                                                     <FormItem>
                                                        <FormControl>
                                                            <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0])} {...rest} />
                                                        </FormControl>
                                                        <ImagePreview file={watchedFiles[i]} />
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </FormItem>
                                    ))}
                                </RadioGroup>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                         <FormField
                            control={form.control}
                            name="examCategories"
                            render={() => (
                                <FormItem>
                                <div className="mb-4">
                                    <FormLabel className="text-base">Exam Categories</FormLabel>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                {examCategories.map((item) => (
                                    <FormField
                                    key={item}
                                    control={form.control}
                                    name="examCategories"
                                    render={({ field }) => {
                                        return (
                                        <FormItem key={item} className="flex flex-row items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes(item)}
                                                    onCheckedChange={(checked) => {
                                                    return checked
                                                        ? field.onChange([...(field.value || []), item])
                                                        : field.onChange(field.value?.filter((value) => value !== item))
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

                        <FormField
                            control={form.control}
                            name="solutionImage"
                            render={({ field: { onChange, ...rest } }) => (
                                <FormItem>
                                    <FormLabel>Solution Image (Optional)</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0])} {...rest} />
                                    </FormControl>
                                    <ImagePreview file={watchedFiles[5]} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <Button type="submit" disabled={isUploading}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Upload Question
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Uploaded Reasoning Questions</CardTitle>
                <CardDescription>Manage the existing questions in the reasoning bank.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Question</TableHead>
                                <TableHead>Categories</TableHead>
                                <TableHead>Uploaded At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {questions.length > 0 ? (
                                questions.map((q) => (
                                    <TableRow key={q.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <ImagePreview src={q.questionImageUrl} />
                                                <span className="truncate max-w-xs">{q.questionText || "Image-based question"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1 flex-wrap">
                                                {q.examCategories.map(cat => <Badge key={cat} variant="secondary">{cat}</Badge>)}
                                            </div>
                                        </TableCell>
                                        <TableCell>{format(new Date(q.uploadedAt.seconds * 1000), "PPP")}</TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This will delete the question from the database. The images will remain in storage. This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(q.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No reasoning questions uploaded yet.
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
