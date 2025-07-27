
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
import type { ReasoningQuestion } from '@/lib/types';
import { ADMIN_EMAILS, FREE_EXAM_LIMIT } from '@/lib/constants';

const examCategories = ["MTS", "POSTMAN", "PA"] as const;

const formSchema = z.object({
  examType: z.enum(examCategories, {
    required_error: 'Please select an exam type.',
  }),
  numberOfQuestions: z.coerce.number().min(5).max(25),
});

type FormValues = z.infer<typeof formSchema>;

export function ReasoningTestForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData, isLoading } = useDashboard();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      examType: undefined,
      numberOfQuestions: 10,
    },
  });

  const availableExams = useMemo(() => {
    if (!userData) return [];
    if (userData.email && ADMIN_EMAILS.includes(userData.email)) return examCategories;
    switch (userData.examCategory) {
        case 'PA':
            return ['PA', 'POSTMAN', 'MTS'];
        case 'POSTMAN':
            return ['POSTMAN', 'MTS'];
        case 'MTS':
            return ['MTS'];
        default:
            return [];
    }
  }, [userData]);

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    if (!user || !userData) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in.', variant: 'destructive' });
      setIsGenerating(false);
      return;
    }

    try {
      const allQuestions = await getReasoningQuestions();
      const filteredQuestions = allQuestions.filter(q => q.examCategories.includes(values.examType));
      
      if (filteredQuestions.length < values.numberOfQuestions) {
        toast({
            title: "Not Enough Questions",
            description: `We only have ${filteredQuestions.length} questions for ${values.examType}. Please select a smaller number.`,
            variant: "destructive"
        });
        setIsGenerating(false);
        return;
      }

      // Shuffle and slice questions
      const selectedQuestions = filteredQuestions.sort(() => 0.5 - Math.random()).slice(0, values.numberOfQuestions);

      const mcqs = selectedQuestions.map((q: ReasoningQuestion) => ({
        question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
        options: q.options,
        correctAnswer: q.correctAnswer,
        solution: q.solutionText || (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : undefined),
        topic: 'Reasoning',
      }));

      const quizId = `reasoning-test-${values.examType}-${Date.now()}`;
      const timeLimit = values.numberOfQuestions * 60; // 60 seconds per question

      const quizData = {
        mcqs: mcqs,
        timeLimit: timeLimit,
        isMockTest: true, // Treat as mock test for results display
        topic: {
          id: quizId,
          title: `Reasoning Test (${values.examType})`,
          description: 'A practice test for reasoning and analytical ability.',
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
  
  const totalExamsTaken = (userData?.topicExamsTaken || 0) + (userData?.mockTestsTaken || 0);
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
        <CardHeader>
            <CardTitle>Reasoning Test Setup</CardTitle>
            <CardDescription>Select your exam type and the number of questions to start the test.</CardDescription>
        </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent>
                <fieldset disabled={isGenerating || isLoading} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="examType"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Select Exam</FormLabel>
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
                    name="numberOfQuestions"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Number of Questions (5-25)</FormLabel>
                        <FormControl>
                            <Input type="number" min="5" max="25" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </fieldset>
             </CardContent>
             <CardFooter>
                <Button type="submit" disabled={isGenerating || !form.formState.isValid || isLoading} className="w-full">
                    {isGenerating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Preparing Test...
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
