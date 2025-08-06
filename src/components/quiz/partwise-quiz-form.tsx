
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Gem } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { normalizeDate } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useDashboard } from '@/app/dashboard/layout';
import { ADMIN_EMAILS, FREE_EXAM_LIMIT } from '@/lib/constants';
import { generatePartwiseMCQs } from '@/ai/flows/generate-partwise-mcqs';

const languages = ["English", "Tamil", "Hindi", "Telugu", "Kannada"] as const;

const formSchema = z.object({
  examType: z.string().min(1, 'Please select an exam type.'),
  part: z.string().min(1, 'Please select a part.'),
  numberOfQuestions: z.coerce.number().min(5).max(50),
  language: z.enum(languages).optional().default('English'),
});

type FormValues = z.infer<typeof formSchema>;
const parts = ["Part A", "Part B"] as const;
const examCategories = ["MTS", "POSTMAN", "PA"] as const;

export function PartwiseQuizForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData, isLoading } = useDashboard();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      examType: '',
      part: '',
      numberOfQuestions: 10,
      language: 'English',
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

  useEffect(() => {
    if (userData?.examCategory === 'MTS') {
        form.setValue('examType', 'MTS');
    } else {
        form.setValue('examType', '');
    }
  }, [userData?.examCategory, form]);

  const selectedExamType = form.watch('examType');

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);

    if (!user || !userData) {
        toast({ title: 'Not Authenticated', description: 'You must be logged in to create an exam.', variant: 'destructive' });
        setIsGenerating(false);
        return;
    }

    try {
      const { mcqs } = await generatePartwiseMCQs({
          examCategory: values.examType,
          part: values.part as 'Part A' | 'Part B',
          numberOfQuestions: values.numberOfQuestions,
          userId: user.uid,
          language: values.language,
      });

      if (!mcqs || mcqs.length === 0) {
        toast({
          title: 'Exam Generation Failed',
          description: 'Could not find enough questions in the MCQ Bank for the selected part.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }
      
      const quizId = `partwise-${values.examType}-${values.part.replace(' ', '')}-${Date.now()}`;
      const timeLimit = values.numberOfQuestions * 45; // 45 seconds per question on average

      const quizData = {
        topic: {
          id: quizId,
          title: `${values.examType} - ${values.part} Practice`,
          description: `An exam covering all topics in ${values.part}.`,
          icon: 'scroll-text',
          categoryId: 'partwise-quiz',
        },
        mcqs: mcqs,
        timeLimit,
        isMockTest: true, // Treat as mock test for results display to show topics
      };

      localStorage.setItem(`quiz-${quizId}`, JSON.stringify(quizData));
      router.push(`/quiz/${quizId}`);

    } catch (error: any) {
      console.error('Error generating part-wise exam:', error);
      toast({
          title: 'Error Generating Exam',
          description: error.message || 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };
  
  const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
  const proValidUntilDate = normalizeDate(userData?.proValidUntil);
  const isPro = !!(userData?.isPro && proValidUntilDate && proValidUntilDate > new Date()) || isAdmin;
  
  const totalExamsTaken = userData?.totalExamsTaken || 0;
  const hasExceededFreeLimit = !isPro && userData && totalExamsTaken >= FREE_EXAM_LIMIT;
  
  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent className="pt-6">
                {hasExceededFreeLimit ? (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Free Limit Reached</AlertTitle>
                        <AlertDescription>
                            You have used your free exam allocation. Please upgrade for unlimited access.
                        </AlertDescription>
                        <Button asChild className="mt-4">
                            <Link href="/dashboard/upgrade">
                                Upgrade Now <Gem className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </Alert>
                ) : (
                <fieldset disabled={isGenerating || isLoading} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="examType"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Select Exam</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value} 
                            disabled={!user}
                           >
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Select Exam" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              {availableExams.map((exam) => (
                                  <SelectItem key={exam} value={exam}>
                                  {exam}
                                  </SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                    />
                     <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Language</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a language" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {languages.map((lang) => (
                                            <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                    control={form.control}
                    name="part"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Part</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedExamType}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={!selectedExamType ? "Select an exam first" : "Select a part"} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {parts.map((part) => (
                                <SelectItem key={part} value={part}>
                                {part}
                                </SelectItem>
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
                        <FormLabel>Number of Questions (5-50)</FormLabel>
                        <FormControl>
                            <Input type="number" min="5" max="50" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </fieldset>
                )}
             </CardContent>
            {!hasExceededFreeLimit && (
                 <CardFooter>
                    <Button type="submit" disabled={isGenerating || !form.formState.isValid || isLoading} className="w-full">
                         {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating... Please wait a moment.
                            </>
                        ) : (
                            "Start Part-wise Exam"
                        )}
                    </Button>
                </CardFooter>
            )}
        </form>
        </Form>
    </Card>
  );
}
