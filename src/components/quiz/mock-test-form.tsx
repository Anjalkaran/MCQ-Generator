
"use client";

import { useState, useMemo } from 'react';
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
import { cn, normalizeDate } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useDashboard } from '@/app/dashboard/layout';
import { generateMockTest } from '@/ai/flows/generate-mock-test';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import { ADMIN_EMAIL } from '@/lib/constants';

const examCategories = ["MTS", "POSTMAN", "PA"] as const;

const formSchema = z.object({
  examType: z.enum(examCategories, {
    required_error: 'Please select an exam type.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

const blueprintMap = {
    MTS: MTS_BLUEPRINT,
    POSTMAN: POSTMAN_BLUEPRINT,
    PA: PA_BLUEPRINT,
};

export function MockTestForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData, isLoading } = useDashboard();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      examType: undefined,
    },
  });

  const selectedExamType = form.watch('examType');

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    if (!user || !userData) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in.', variant: 'destructive' });
      setIsGenerating(false);
      return;
    }
    
    const blueprint = blueprintMap[values.examType];
    const numberOfQuestions = blueprint.parts.reduce((sum, part) => sum + part.totalQuestions, 0);

    try {
      const { mcqs } = await generateMockTest({
          examCategory: values.examType,
          numberOfQuestions: numberOfQuestions,
          userId: user.uid,
      });

      if (!mcqs || mcqs.length === 0) {
        toast({ title: 'Generation Failed', description: 'The AI could not generate a mock test.', variant: 'destructive' });
        return;
      }

      const quizId = `mock-test-${values.examType}-${Date.now()}`;
      
      const quizData = {
        mcqs: mcqs,
        timeLimit: blueprint.totalDurationMinutes * 60,
        topic: {
          id: quizId,
          title: `${blueprint.examName} Mock Test`,
          description: `A full-length mock test based on the official ${values.examType} blueprint.`,
          icon: 'scroll-text',
          categoryId: 'mock-test',
          part: 'Part A', // Placeholder, not directly relevant for mock tests
          examCategories: [values.examType],
        },
      };

      localStorage.setItem(`quiz-${quizId}`, JSON.stringify(quizData));
      router.push(`/quiz/${quizId}`);

    } catch (error: any) {
      console.error('Error generating mock test:', error);
      toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsGenerating(isGenerating);
    }
  };
  
  const proValidUntilDate = normalizeDate(userData?.proValidUntil);
  const isPro = !!(userData?.isPro && proValidUntilDate && proValidUntilDate > new Date()) || (userData?.email === ADMIN_EMAIL);

  if (!isPro && userData) {
     return (
        <Card>
            <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                    <Gem className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Pro Feature</CardTitle>
                <CardDescription>
                    Mock tests are available for pro users. Upgrade your plan to access full-length exams.
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
            <CardTitle>Mock Test Setup</CardTitle>
            <CardDescription>Select an exam to generate a full mock test based on the official blueprint.</CardDescription>
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
                              {examCategories.map((exam) => (
                                  <SelectItem key={exam} value={exam}>{exam}</SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                    />
                    {selectedExamType && (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>{blueprintMap[selectedExamType].examName}</AlertTitle>
                            <AlertDescription>
                                This test will have {blueprintMap[selectedExamType].parts.reduce((sum, p) => sum + p.totalQuestions, 0)} questions and a time limit of {blueprintMap[selectedExamType].totalDurationMinutes} minutes.
                            </AlertDescription>
                        </Alert>
                    )}
                </fieldset>
             </CardContent>
             <CardFooter>
                <Button type="submit" disabled={isGenerating || !form.formState.isValid || isLoading} className="w-full">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Mock Test"}
                </Button>
            </CardFooter>
        </form>
        </Form>
    </Card>
  );
}
