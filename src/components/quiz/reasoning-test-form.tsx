
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Gem } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { normalizeDate } from '@/lib/utils';
import Link from 'next/link';
import { useDashboard } from '@/app/dashboard/layout';
import { getReasoningQuestions } from '@/lib/firestore';
import type { ReasoningQuestion, MCQ } from '@/lib/types';
import { ADMIN_EMAILS, FREE_EXAM_LIMIT } from '@/lib/constants';
import { getFirebaseDb } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';


const examCategories = ["POSTMAN", "PA"] as const;

const formSchema = z.object({
  examType: z.enum(examCategories, {
    required_error: 'Please select an exam type.',
  }),
  topic: z.string().min(1, 'Please select a topic.'),
  numberOfQuestions: z.coerce.number().min(1).max(10),
});

type FormValues = z.infer<typeof formSchema>;

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function ReasoningTestForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData, isLoading } = useDashboard();
  const [isGenerating, setIsGenerating] = useState(false);
  const [allReasoningQuestions, setAllReasoningQuestions] = useState<ReasoningQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      examType: undefined,
      topic: '',
      numberOfQuestions: 5,
    },
  });

  useEffect(() => {
    const fetchQuestions = async () => {
        setIsLoadingQuestions(true);
        try {
            const questions = await getReasoningQuestions();
            setAllReasoningQuestions(questions);
        } catch (error) {
            console.error("Failed to fetch reasoning questions:", error);
            toast({ title: "Error", description: "Could not load reasoning questions.", variant: "destructive" });
        } finally {
            setIsLoadingQuestions(false);
        }
    };
    fetchQuestions();
  }, [toast]);

  const availableExams = useMemo(() => {
    if (!userData) return [];
    if (userData.email && ADMIN_EMAILS.includes(userData.email)) return ["POSTMAN", "PA"];
    switch (userData.examCategory) {
        case 'PA':
            return ['PA', 'POSTMAN'];
        case 'POSTMAN':
            return ['POSTMAN'];
        default:
            return [];
    }
  }, [userData]);
  
  const reasoningTopics = useMemo(() => {
    const topics = new Set(allReasoningQuestions.map(q => q.topic));
    return Array.from(topics).sort();
  }, [allReasoningQuestions]);


  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    if (!user || !userData) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in.', variant: 'destructive' });
      setIsGenerating(false);
      return;
    }

    try {
      const questionsForTopic = allReasoningQuestions.filter(q => q.topic === values.topic);

      if (questionsForTopic.length < values.numberOfQuestions) {
        toast({
            title: "Not Enough Questions",
            description: `We only have ${questionsForTopic.length} questions for "${values.topic}". Please select a smaller number.`,
            variant: "destructive"
        });
        setIsGenerating(false);
        return;
      }
      
      const selectedQuestions = shuffleArray(questionsForTopic).slice(0, values.numberOfQuestions);

      const mcqs: MCQ[] = selectedQuestions.map((q: ReasoningQuestion) => ({
        question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
        options: q.options,
        correctAnswer: q.correctAnswer,
        solution: q.solutionText || (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : ""),
        topic: q.topic,
      }));

      const quizId = `reasoning-${Date.now()}`;
      const timeLimit = values.numberOfQuestions * 60; // 60 seconds per question

      const quizData = {
        mcqs: mcqs,
        timeLimit: timeLimit,
        isMockTest: true, // Treat as mock to show topic breakdown in results
        topic: {
          id: quizId,
          title: `${values.topic} Test`,
          description: `A practice test for the reasoning topic: ${values.topic}.`,
          icon: 'brain-circuit',
          categoryId: 'reasoning-test',
        },
      };
      
      const db = getFirebaseDb();
      if (!db) throw new Error("Firestore is not initialized.");
      
      const docRef = await addDoc(collection(db, "generatedQuizzes"), quizData);

      router.push(`/quiz/${docRef.id}`);

    } catch (error: any) {
      console.error('Error generating reasoning test:', error);
      toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
      setIsGenerating(false);
    }
  };
  
  const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
  const proValidUntilDate = normalizeDate(userData?.proValidUntil);
  const isPro = !!(userData?.isPro && proValidUntilDate && proValidUntilDate > new Date()) || isAdmin;
  
  return (
     <Card>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <CardContent className="pt-6">
                    <fieldset disabled={isGenerating || isLoading || isLoadingQuestions} className="space-y-6">
                        <FormField
                        control={form.control}
                        name="examType"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Your Exam Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!user}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Exam Type" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {availableExams.map((exam) => (
                                    <SelectItem key={exam} value={exam}>{exam}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="topic"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Topic</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={reasoningTopics.length === 0}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a topic" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {reasoningTopics.map((topic) => (
                                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="numberOfQuestions"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Number of Questions (1-10)</FormLabel>
                            <FormControl>
                                <Input type="number" min="1" max="10" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </fieldset>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isGenerating || !form.formState.isValid || isLoading || isLoadingQuestions} className="w-full">
                        {isGenerating || isLoadingQuestions ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isGenerating ? "Preparing Test..." : "Loading Questions..."}
                            </>
                        ) : (
                            "Start Reasoning Test"
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Form>
    </Card>
  );
}
