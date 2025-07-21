
"use client";

import { useState } from 'react';
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
import { normalizeDate } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useDashboard } from '@/app/dashboard/layout';
import { generateMockTestFromBank } from '@/ai/flows/generate-mock-test-from-bank';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import { ADMIN_EMAILS } from '@/lib/constants';

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

export function PreviousYearMockTestForm() {
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
    
    try {
      const { mcqs } = await generateMockTestFromBank({
          examCategory: values.examType,
          userId: user.uid,
      });

      if (!mcqs || mcqs.length === 0) {
        toast({ title: 'Generation Failed', description: 'Could not extract a mock test from the question bank. Please ensure relevant documents are uploaded.', variant: 'destructive' });
        setIsGenerating(false);
        return;
      }

      const quizId = `mock-test-bank-${values.examType}-${Date.now()}`;
      
      const quizData = {
        mcqs: mcqs,
        timeLimit: blueprint.totalDurationMinutes * 60,
        isMockTest: true,
        topic: {
          id: quizId,
          title: `${blueprint.examName} Mock Test (Previous Year)`,
          description: `A mock test extracted from the question bank for the ${values.examType} blueprint.`,
          icon: 'scroll-text',
          categoryId: 'mock-test-bank',
        },
      };

      localStorage.setItem(`quiz-${quizId}`, JSON.stringify(quizData));
      router.push(`/quiz/${quizId}`);

    } catch (error: any) {
      console.error('Error generating mock test from bank:', error);
      toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
      setIsGenerating(false);
    }
  };
  
  const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
  const proValidUntilDate = normalizeDate(userData?.proValidUntil);
  const isPro = !!(userData?.isPro && proValidUntilDate && proValidUntilDate > new Date()) || isAdmin;

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
            <CardTitle>Mock Test from Question Bank</CardTitle>
            <CardDescription>Select an exam to generate a mock test using questions from the uploaded previous year papers.</CardDescription>
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
