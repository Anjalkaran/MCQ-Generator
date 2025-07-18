
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
import { normalizeDate, cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FREE_TOPIC_EXAM_LIMIT, ADMIN_EMAIL } from '@/lib/constants';
import Link from 'next/link';
import { useDashboard } from '@/app/dashboard/layout';
import { CardTitle } from '../ui/card';

const formSchema = z.object({
  examType: z.string().min(1, 'Please select an exam type.'),
  part: z.string().min(1, 'Please select a part.'),
  numberOfQuestions: z.coerce.number().min(5).max(100),
  difficulty: z.string().min(1, 'Please select a difficulty level.'),
});

type FormValues = z.infer<typeof formSchema>;
type DifficultyLevel = 'Easy' | 'Moderate' | 'Difficult';
const difficultyLevels: DifficultyLevel[] = ['Easy', 'Moderate', 'Difficult'];
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
      difficulty: 'Moderate',
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

  const selectedDifficulty = form.watch('difficulty');

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
          difficulty: values.difficulty,
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
      
      const timePerQuestion: Record<DifficultyLevel, number> = {
        Easy: 30,
        Moderate: 45,
        Difficult: 60,
      };
      const timeLimit = values.numberOfQuestions * timePerQuestion[values.difficulty as DifficultyLevel];

      const quizId = `part-wise-${values.examType}-${values.part}-${Date.now()}`;

      const quizData = {
        mcqs: mcqs,
        timeLimit: timeLimit,
        topic: {
          id: quizId,
          title: `Part ${values.part} Test (${values.examType})`,
          description: `A custom generated quiz covering all topics in Part ${values.part}.`,
          icon: 'scroll-text',
          categoryId: `part-wise-${values.part}`,
          part: values.part as 'Part A' | 'Part B',
          examCategories: [values.examType as 'MTS' | 'POSTMAN' | 'PA'],
        },
      };

      localStorage.setItem(`quiz-${quizId}`, JSON.stringify(quizData));
      router.push(`/quiz/${quizId}`);

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
                    name="difficulty"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Difficulty Level</FormLabel>
                        <FormControl>
                            <div className="grid grid-cols-3 gap-2">
                            {difficultyLevels.map((level) => (
                                <Card
                                key={level}
                                onClick={() => form.setValue('difficulty', level, { shouldValidate: true })}
                                className={cn(
                                    'cursor-pointer p-2 text-center transition-all',
                                    selectedDifficulty === level
                                    ? 'border-primary ring-2 ring-primary bg-accent'
                                    : 'hover:bg-muted/50'
                                )}
                                >
                                <CardTitle className="text-base font-medium">{level}</CardTitle>
                                </Card>
                            ))}
                            </div>
                        </FormControl>
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
