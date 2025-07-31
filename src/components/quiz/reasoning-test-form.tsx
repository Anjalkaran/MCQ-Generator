
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Gem } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { normalizeDate } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useDashboard } from '@/app/dashboard/layout';
import { getReasoningQuestions } from '@/lib/firestore';
import type { ReasoningQuestion, MCQ } from '@/lib/types';
import { ADMIN_EMAILS, FREE_EXAM_LIMIT } from '@/lib/constants';

const examCategories = ["MTS", "POSTMAN", "PA"] as const;

const formSchema = z.object({
  examType: z.enum(examCategories, {
    required_error: 'Please select an exam type.',
  }),
  topic: z.string().min(1, 'Please select a topic.'),
  numberOfQuestions: z.coerce.number().min(1).max(10),
});

type FormValues = z.infer<typeof formSchema>;

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
      topic: undefined,
      numberOfQuestions: 10,
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
    if (userData.email && ADMIN_EMAILS.includes(userData.email)) return ["POSTMAN", "PA"]; // Reasoning is not for MTS
    switch (userData.examCategory) {
        case 'PA':
            return ['PA', 'POSTMAN'];
        case 'POSTMAN':
            return ['POSTMAN'];
        default:
            return [];
    }
  }, [userData]);

  const selectedExamType = form.watch('examType');

  const availableTopics = useMemo(() => {
    if (allReasoningQuestions.length === 0) return [];
    const topicsForExam = allReasoningQuestions
        .filter(q => q.topic) // Ensure topic exists
        .map(q => q.topic);
    return [...new Set(topicsForExam)].sort();
  }, [allReasoningQuestions]);

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    if (!user || !userData) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in.', variant: 'destructive' });
      setIsGenerating(false);
      return;
    }

    try {
      const filteredQuestions = allReasoningQuestions.filter(q => q.topic === values.topic);
      
      if (filteredQuestions.length < values.numberOfQuestions) {
        toast({
            title: "Not Enough Questions",
            description: `We only have ${filteredQuestions.length} questions for the topic "${values.topic}". Please select a smaller number.`,
            variant: "destructive"
        });
        setIsGenerating(false);
        return;
      }

      const selectedQuestions = filteredQuestions.sort(() => 0.5 - Math.random()).slice(0, values.numberOfQuestions);

      const mcqs: MCQ[] = selectedQuestions.map((q: ReasoningQuestion) => ({
        question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
        options: q.options,
        correctAnswer: q.correctAnswer,
        solution: q.solutionText || (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : undefined),
        topic: q.topic,
      }));

      const quizId = `reasoning-test-${values.topic.replace(/\s+/g, '-')}-${Date.now()}`;
      const timeLimit = values.numberOfQuestions * 60; // 60 seconds per question

      const quizData = {
        mcqs: mcqs,
        timeLimit: timeLimit,
        isMockTest: true,
        topic: {
          id: quizId,
          title: `Reasoning: ${values.topic}`,
          description: `A practice test for ${values.topic}.`,
          icon: 'brain-circuit',
          categoryId: 'reasoning-test',
        },
      };

      localStorage.setItem(`quiz-${quizId}`, JSON.stringify(quizData));
      router.push(`/quiz/${quizId}`);

    } catch (error: any) {
      console.error('Error generating reasoning test:', error);
      toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
      setIsGenerating(false);
    }
  };
  
  const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
  const proValidUntilDate = normalizeDate(userData?.proValidUntil);
  const isPro = !!(userData?.isPro && proValidUntilDate && proValidUntilDate > new Date()) || isAdmin;
  
  const totalExamsTaken = userData?.totalExamsTaken || 0;
  const hasExceededFreeLimit = !isPro && userData && totalExamsTaken >= FREE_EXAM_LIMIT;

  if (hasExceededFreeLimit) {
     return (
        <Card>
            <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                    <Gem className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Free Limit Reached</CardTitle>
                <CardDescription>
                    You have used your free exam allocation. Please upgrade for unlimited access to all features, including Reasoning Tests.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild className="w-full">
                    <Link href="/dashboard/upgrade">
                        Upgrade to Pro
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
  }

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
                            <FormLabel>Reasoning Topic</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedExamType || availableTopics.length === 0}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={!selectedExamType ? "Select exam first" : "Select a topic"} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {availableTopics.map((topic) => (
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
                                {isGenerating ? "Preparing Test..." : "Loading Topics..."}
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
