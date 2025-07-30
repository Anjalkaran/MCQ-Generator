
"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Trash2, PlusCircle, Eye } from 'lucide-react';
import { deleteReasoningQuestion } from '@/lib/firestore';
import type { ReasoningQuestion } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Image from 'next/image';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '@/app/dashboard/layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const examCategories = ["MTS", "POSTMAN", "PA"] as const;

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const fileSchema = z.instanceof(File)
    .refine(file => file.size <= MAX_FILE_SIZE_BYTES, `File size must be less than ${MAX_FILE_SIZE_MB}MB.`)
    .optional()
    .nullable();

const formSchema = z.object({
  topic: z.string().min(1, 'Please select a topic.'),
  questionText: z.string().min(1, 'Question text is required.'),
  questionImage: z.instanceof(File, { message: 'Question image is required.' }).refine(file => file.size > 0, 'Question image is required.').refine(file => file.size <= MAX_FILE_SIZE_BYTES, `File size must be less than ${MAX_FILE_SIZE_MB}MB.`),
  option1: z.string().min(1, 'Option 1 is required.'),
  option2: z.string().min(1, 'Option 2 is required.'),
  option3: z.string().min(1, 'Option 3 is required.'),
  option4: z.string().min(1, 'Option 4 is required.'),
  correctAnswer: z.string({ required_error: 'You must select a correct answer.'}),
  solutionImage: fileSchema,
  solutionText: z.string().optional(),
  examCategories: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one exam category.",
  }),
  isForLiveTest: z.boolean().default(false).optional(),
});

interface ReasoningBankManagementProps {
    initialQuestions: ReasoningQuestion[];
}

// Helper to convert file to Base64 Data URI
const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export function ReasoningBankManagement({ initialQuestions }: ReasoningBankManagementProps) {
  const [questions, setQuestions] = useState<ReasoningQuestion[]>(initialQuestions);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { topics, categories } = useDashboard();

  const reasoningTopics = useMemo(() => {
    const reasoningCategory = categories.find(c => c.name === "Reasoning and Analytical Ability");
    if (!reasoningCategory) return [];
    return topics.filter(t => t.categoryId === reasoningCategory.id && t.part === 'Part B');
  }, [topics, categories]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        topic: '',
        questionText: '',
        option1: '',
        option2: '',
        option3: '',
        option4: '',
        solutionText: '',
        examCategories: [],
        isForLiveTest: false,
        questionImage: undefined,
        solutionImage: undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsUploading(true);

    try {
        const questionImageUri = await fileToDataUri(values.questionImage);
        const solutionImageUri = values.solutionImage ? await fileToDataUri(values.solutionImage) : undefined;
        
        const options = [values.option1, values.option2, values.option3, values.option4];
        
        const payload = {
            topic: values.topic,
            questionText: values.questionText,
            questionImage: questionImageUri,
            options,
            correctAnswer: values.correctAnswer,
            solutionImage: solutionImageUri,
            solutionText: values.solutionText,
            examCategories: values.examCategories,
            isForLiveTest: values.isForLiveTest,
        };
        
        const response = await fetch('/api/reasoning-bank/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload question.');
        }

        const { newDocument } = await response.json();
        setQuestions(prev => [newDocument, ...prev]);
        toast({ title: 'Success', description: 'Reasoning question uploaded successfully.' });
        
        form.reset();

    } catch (error: any) {
        console.error("Reasoning upload error:", error);
        toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsUploading(false);
    }
  };
  
  const handleDelete = async (docId: string) => {
    try {
        await deleteReasoningQuestion(docId);
        setQuestions(prev => prev.filter(q => q.id !== docId));
        toast({ title: "Success", description: "Question deleted." });
    } catch (error) {
        console.error("Failed to delete question", error);
        toast({ title: "Error", description: "Could not delete the question.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Upload Reasoning Question</CardTitle>
                <CardDescription>Create a new image-based reasoning question. Images are saved directly in the database.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="topic"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Topic*</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a reasoning topic" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {reasoningTopics.map(topic => (
                                                <SelectItem key={topic.id} value={topic.title}>{topic.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="questionText"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Question Text*</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Enter the question text here..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="questionImage"
                            render={({ field: { value, onChange, ...rest } }) => (
                                <FormItem>
                                    <FormLabel>Question Image*</FormLabel>
                                    <FormControl>
                                        <Input 
                                            id="questionImage"
                                            type="file" 
                                            accept="image/png, image/jpeg, image/webp"
                                            onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
                                            {...rest}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="correctAnswer"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Options & Correct Answer*</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                    >
                                        {[1, 2, 3, 4].map(i => (
                                            <FormField
                                                key={i}
                                                control={form.control}
                                                name={`option${i}` as 'option1' | 'option2' | 'option3' | 'option4'}
                                                render={({ field: optionField }) => (
                                                    <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md">
                                                        <FormControl>
                                                            <RadioGroupItem value={optionField.value} />
                                                        </FormControl>
                                                        <Input placeholder={`Option ${i}`} {...optionField} className="flex-1" />
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField
                                control={form.control}
                                name="solutionImage"
                                render={({ field: { value, onChange, ...rest } }) => (
                                    <FormItem>
                                        <FormLabel>Solution Image (Optional)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                id="solutionImage"
                                                type="file" 
                                                accept="image/png, image/jpeg, image/webp"
                                                onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
                                                {...rest}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="solutionText"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Solution Text (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Explain the solution..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="examCategories"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Exam Categories*</FormLabel>
                                    <div className="flex flex-wrap gap-4">
                                        {examCategories.map((item) => (
                                            <FormField
                                                key={item}
                                                control={form.control}
                                                name="examCategories"
                                                render={({ field }) => (
                                                    <FormItem key={item} className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(item)}
                                                                onCheckedChange={(checked) => (
                                                                    checked
                                                                        ? field.onChange([...(field.value || []), item])
                                                                        : field.onChange(field.value?.filter(v => v !== item))
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
                            control={form.control}
                            name="isForLiveTest"
                            render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <FormLabel>Mark for Live Test</FormLabel>
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
                <CardDescription>View and manage previously uploaded questions.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Question</TableHead>
                                <TableHead>Topic</TableHead>
                                <TableHead>Categories</TableHead>
                                <TableHead>Uploaded</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {questions.length > 0 ? (
                                questions.map((q) => (
                                    <TableRow key={q.id}>
                                        <TableCell>
                                            <Image src={q.questionImage} alt="Question" width={60} height={60} className="rounded-md object-cover" />
                                        </TableCell>
                                        <TableCell>{q.topic}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {q.examCategories.map(cat => <Badge key={cat} variant="secondary">{cat}</Badge>)}
                                            </div>
                                        </TableCell>
                                        <TableCell>{format(new Date(q.uploadedAt), "dd/MM/yyyy")}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl">
                                                    <DialogHeader>
                                                        <DialogTitle>Question Details</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <h3 className="font-semibold mb-2">Topic:</h3>
                                                            <p className="text-sm text-muted-foreground p-2 border rounded-md">{q.topic}</p>
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold mb-2">Question Text:</h3>
                                                            <p className="text-sm text-muted-foreground p-2 border rounded-md">{q.questionText}</p>
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold mb-2">Question Image:</h3>
                                                            <Image src={q.questionImage} alt="Question" width={400} height={400} className="rounded-md object-contain mx-auto" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold mb-2">Options:</h3>
                                                            <ul className="list-disc list-inside">
                                                                {q.options.map(opt => <li key={opt} className={opt === q.correctAnswer ? 'font-bold text-primary' : ''}>{opt}</li>)}
                                                            </ul>
                                                        </div>
                                                        {q.solutionImage && (
                                                             <div>
                                                                <h3 className="font-semibold mb-2">Solution Image:</h3>
                                                                <Image src={q.solutionImage} alt="Solution" width={400} height={400} className="rounded-md object-contain mx-auto" />
                                                            </div>
                                                        )}
                                                        {q.solutionText && (
                                                            <div>
                                                                <h3 className="font-semibold mb-2">Solution Text:</h3>
                                                                <p className="text-sm text-muted-foreground p-2 border rounded-md">{q.solutionText}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This will permanently delete this question. This action cannot be undone.</AlertDialogDescription>
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
                                    <TableCell colSpan={5} className="h-24 text-center">
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
