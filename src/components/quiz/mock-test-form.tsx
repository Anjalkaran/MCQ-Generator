
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDashboard } from '@/app/dashboard/layout';
import { generateMockTest } from '@/ai/flows/generate-mock-test';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT, IP_BLUEPRINT } from '@/lib/exam-blueprints';
import { ADMIN_EMAILS } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { normalizeDate } from '@/lib/utils';
import Link from 'next/link';

const examCategories = ["MTS", "POSTMAN", "PA", "IP"] as const;
const languages = ["English", "Tamil", "Hindi", "Telugu", "Kannada"] as const;

const formSchema = z.object({
  examType: z.enum(examCategories, {
    required_error: 'Please select an exam type.',
  }),
  language: z.enum(languages).optional().default('English'),
});

type FormValues = z.infer<typeof formSchema>;

const blueprintMap = {
    MTS: MTS_BLUEPRINT,
    POSTMAN: POSTMAN_BLUEPRINT,
    PA: PA_BLUEPRINT,
    IP: IP_BLUEPRINT,
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
      language: 'English',
    },
  });

  const availableExams = useMemo(() => {
    if (!userData) return [];
    if (userData.email && ADMIN_EMAILS.includes(userData.email)) return examCategories;
    switch (userData.examCategory) {
        case 'IP':
            return ['IP'];
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
    if (userData?.examCategory) {
        form.setValue('examType', userData.examCategory);
    }
  }, [userData?.examCategory, form]);


  const selectedExamType = form.watch('examType');

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    if (!user || !userData) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in.', variant: 'destructive' });
      setIsGenerating(false);
      return;
    }
    
    try {
      const { quizId } = await generateMockTest({
          examCategory: values.examType,
          userId: user.uid,
          language: values.language,
      });

      if (!quizId) {
        toast({ title: 'Generation Failed', description: 'The AI could not generate a mock test.', variant: 'destructive' });
        setIsGenerating(false);
        return;
      }
      
      router.push(`/quiz/${quizId}`);

    } catch (error: any) {
      console.error('Error generating mock test:', error);
      toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
      setIsGenerating(false);
    }
  };
  
  const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
  const proValidUntilDate = normalizeDate(userData?.proValidUntil);
  const isPro = !!(userData?.isPro && proValidUntilDate && proValidUntilDate > new Date()) || isAdmin;

  return (
    <Card>
        <CardHeader>
            <CardTitle>Mock Test Setup</CardTitle>
            <CardDescription>Select an exam to generate a full mock test based on the official syllabus.</CardDescription>
        </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent>
                 {!isPro ? (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Pro Feature</AlertTitle>
                        <AlertDescription>
                            Practice Mock Tests are available for Pro users only. Please upgrade for unlimited access.
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
                )}
             </CardContent>
             {isPro && (
                <CardFooter>
                    <Button type="submit" disabled={isGenerating || !form.formState.isValid || isLoading} className="w-full">
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating... Please wait a moment.
                            </>
                        ) : (
                            "Generate Mock Test"
                        )}
                    </Button>
                </CardFooter>
            )}
        </form>
        </Form>
    </Card>
  );
}
