
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generatePartWiseTest } from '@/ai/flows/generate-part-wise-test';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Gem } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { normalizeDate } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FREE_TOPIC_EXAM_LIMIT, ADMIN_EMAIL } from '@/lib/constants';
import Link from 'next/link';
import { useDashboard } from '@/app/dashboard/layout';

const formSchema = z.object({
  examType: z.string().min(1, 'Please select an exam type.'),
  part: z.string().min(1, 'Please select a part.'),
  numberOfQuestions: z.coerce.number().min(5).max(100),
});

type FormValues = z.infer<typeof formSchema>;
const parts = ["Part A", "Part B"] as const;
const examCategories = ["MTS", "POSTMAN", "PA"] as const;

export function PartWiseQuizForm() {
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
    },
  });
  
  const availableExams = useMemo(() => {
    if (!userData) return [];
    if (userData.email === ADMIN_EMAIL) return examCategories;
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

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);

    if (!user || !userData) {
        toast({ title: 'Not Authenticated', description: 'You must be logged in to create a quiz.', variant: 'destructive' });
        setIsGenerating(false);
        return;
    }
    
    try {
      const generationInput = {
          examCategory: values.examType,
          part: values.part,
          numberOfQuestions: values.numberOfQuestions,
          userId: user.uid,
      };

      const { mcqs } = await generatePartWiseTest(generationInput);

      if (!mcqs || mcqs.length === 0) {
        toast({
          title: 'Quiz Generation Failed',
          description: 'The AI could not generate a test for the selected criteria. Please try again.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }
      
      const timeLimit = values.numberOfQuestions * 45; // 45 seconds per question on average

      const testId = `part-wise-${values.examType}-${values.part}-${Date.now()}`;
      const quizData = {
        topic: {
          id: testId,
          title: `${values.examType} - ${values.part}`,
          description: 'A part-wise generated test.',
          icon: 'test',
          categoryId: 'part-wise',
          part: values.part as 'Part A' | 'Part B',
          examCategories: [values.examType as 'MTS' | 'POSTMAN' | 'PA'],
        },
        mcqs: mcqs,
        timeLimit,
      };

      localStorage.setItem(`quiz-${testId}`, JSON.stringify(quizData));
      router.push(`/quiz/${testId}`);

    } catch (error: any) {
      console.error('Error generating part-wise test:', error);
      toast({
          title: 'Error Generating Test',
          description: error.message || 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };
  
  const proValidUntilDate = normalizeDate(userData?.proValidUntil);
  const isPro = !!(userData?.isPro && proValidUntilDate && proValidUntilDate > new Date()) || (userData?.email === ADMIN_EMAIL);
  
  const hasExceededFreeLimit = !isPro && userData && userData.topicExamsTaken >= FREE_TOPIC_EXAM_LIMIT;
  
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
                              <SelectItem value="select" disabled>Select Exam</SelectItem>
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
                    name="part"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Part</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a part" />
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
                        <FormLabel>Number of Questions (5-100)</FormLabel>
                        <FormControl>
                            <Input type="number" min="5" max="100" {...field} />
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
                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate Test
                    </Button>
                </CardFooter>
            )}
        </form>
        </Form>
    </Card>
  );
}
