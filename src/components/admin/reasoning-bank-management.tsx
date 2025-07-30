
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Trash2, PlusCircle, Eye, Edit } from 'lucide-react';
import { deleteReasoningQuestion } from '@/lib/firestore';
import type { ReasoningQuestion } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Image from 'next/image';
import { format } from 'date-fns';
import { useDashboard } from '@/app/dashboard/layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const fileSchema = z.union([
    z.instanceof(File),
    z.string().url()
])
.refine(file => {
    if (file instanceof File) {
        return file.size <= MAX_FILE_SIZE_BYTES;
    }
    return true; // Assume URL is valid
}, `File size must be less than ${MAX_FILE_SIZE_MB}MB.`)
.optional()
.nullable();

const formSchema = z.object({
  id: z.string().optional(),
  topic: z.string().min(1, 'Please select a topic.'),
  questionText: z.string().min(1, 'Question text is required.'),
  questionImage: fileSchema,
  option1: z.string().min(1, 'Option 1 is required.'),
  option2: z.string().min(1, 'Option 2 is required.'),
  option3: z.string().min(1, 'Option 3 is required.'),
  option4: z.string().min(1, 'Option 4 is required.'),
  correctAnswer: z.string({ required_error: 'You must select a correct answer.'}),
  solutionImage: fileSchema,
  solutionText: z.string().optional(),
  isForLiveTest: z.boolean().default(false).optional(),
}).refine(data => data.id || data.questionImage instanceof File, {
    message: "Question image is required.",
    path: ["questionImage"],
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ReasoningQuestion | null>(null);
  const { toast } = useToast();
  const { topics, categories } = useDashboard();

  const reasoningTopics = useMemo(() => {
    const reasoningCategory = categories.find(c => c.name === "Reasoning and Analytical Ability");
    if (!reasoningCategory) return [];
    
    return topics.filter(t => 
        t.categoryId === reasoningCategory.id && 
        t.part === 'Part B' &&
        (t.examCategories.includes('POSTMAN') || t.examCategories.includes('PA'))
    );
  }, [topics, categories]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (editingQuestion) {
        form.reset({
            id: editingQuestion.id,
            topic: editingQuestion.topic,
            questionText: editingQuestion.questionText,
            option1: editingQuestion.options[0],
            option2: editingQuestion.options[1],
            option3: editingQuestion.options[2],
            option4: editingQuestion.options[3],
            correctAnswer: editingQuestion.correctAnswer,
            solutionText: editingQuestion.solutionText || '',
            isForLiveTest: editingQuestion.isForLiveTest,
            questionImage: editingQuestion.questionImage,
            solutionImage: editingQuestion.solutionImage,
        });
    } else {
        form.reset({
            id: undefined,
            topic: '',
            questionText: '',
            option1: '',
            option2: '',
            option3: '',
            option4: '',
            correctAnswer: undefined,
            solutionText: '',
            isForLiveTest: false,
            questionImage: undefined,
            solutionImage: undefined,
        });
    }
  }, [editingQuestion, form]);
  
  const handleOpenDialog = (question: ReasoningQuestion | null) => {
    setEditingQuestion(question);
    setIsDialogOpen(true);
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsUploading(true);

    try {
        const questionImageUri = values.questionImage instanceof File ? await fileToDataUri(values.questionImage) : values.questionImage;
        const solutionImageUri = values.solutionImage instanceof File ? await fileToDataUri(values.solutionImage) : values.solutionImage;
        
        const options = [values.option1, values.option2, values.option3, values.option4];
        
        const payload: any = {
            topic: values.topic,
            questionText: values.questionText,
            questionImage: questionImageUri,
            options,
            correctAnswer: values.correctAnswer,
            solutionImage: solutionImageUri,
            solutionText: values.solutionText,
            isForLiveTest: values.isForLiveTest,
        };
        if (values.id) {
            payload.id = values.id;
        }
        
        const response = await fetch('/api/reasoning-bank/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save question.');
        }

        const { document: savedDocument } = await response.json();
        
        if (values.id) {
            // Update existing question in state
            setQuestions(prev => prev.map(q => q.id === values.id ? { ...q, ...savedDocument } : q));
            toast({ title: 'Success', description: 'Question updated successfully.' });
        } else {
            // Add new question to state
            setQuestions(prev => [savedDocument, ...prev]);
            toast({ title: 'Success', description: 'Question uploaded successfully.' });
        }
        
        form.reset();
        setIsDialogOpen(false);

    } catch (error: any) {
        console.error("Reasoning upload error:", error);
        toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
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
       <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { setIsDialogOpen(isOpen); if (!isOpen) setEditingQuestion(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Upload New Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
              <DialogHeader>
                  <DialogTitle>{editingQuestion ? 'Edit Reasoning Question' : 'Upload Reasoning Question'}</DialogTitle>
                  <DialogDescription>Create or update an image-based reasoning question. Images are saved directly in the database.</DialogDescription>
              </DialogHeader>
               <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto pr-4">
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
                                    {typeof value === 'string' && <Image src={value} alt="Current Question Image" width={100} height={100} className="mt-2 rounded-md" />}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="correctAnswer"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Options &amp; Correct Answer*</FormLabel>
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
                                         {typeof value === 'string' && <Image src={value} alt="Current Solution Image" width={100} height={100} className="mt-2 rounded-md" />}
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
                        
                        <DialogFooter className="sticky bottom-0 bg-background pt-4">
                          <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button type="submit" disabled={isUploading}>
                              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                              {editingQuestion ? 'Save Changes' : 'Upload Question'}
                          </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        
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
                                                    <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
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
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(q)}><Edit className="h-4 w-4" /></Button>
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
