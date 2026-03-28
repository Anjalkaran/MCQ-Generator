
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
const allLanguages = ["English", "Tamil", "Hindi", "Telugu", "Kannada"] as const;
const ipLanguages = ["English", "Hindi"] as const;


const formSchema = z.object({
  examType: z.enum(examCategories, {
    required_error: 'Please select an exam type.',
  }),
  language: z.enum(allLanguages).optional().default('English'),
  paper: z.string().optional(),
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
      paper: 'Paper-I',
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
  const isIPUser = userData?.examCategory === 'IP';
  const availableLanguages = isIPUser ? ipLanguages : allLanguages;

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
          paper: values.examType === 'IP' ? values.paper : undefined,
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

  return (
    <Card>
        <CardHeader>
            <CardTitle>Mock Test Setup</CardTitle>
            <CardDescription>Select an exam to generate a full mock test based on the official syllabus.</CardDescription>
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
                    {selectedExamType === 'IP' && (
                        <FormField
                            control={form.control}
                            name="paper"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select Paper</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a paper" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Paper-I">Paper-I (Departmental Rules & Acts)</SelectItem>
                                            <SelectItem value="Paper-III">Paper-III (Rules, Management & Accounts)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    
                    {selectedExamType && (
                        <Alert className="border-red-100 bg-red-50/50">
                            <Gem className="h-4 w-4 text-red-600" />
                            <AlertTitle className="text-red-900">
                                {blueprintMap[selectedExamType].examName} 
                                {selectedExamType === 'IP' && ` (${form.watch('paper')})`}
                            </AlertTitle>
                            <AlertDescription className="text-red-700">
                                {selectedExamType === 'IP' ? (
                                    <>
                                        This {form.watch('paper')} test will have {
                                            blueprintMap.IP.parts.find(p => p.partName === form.watch('paper'))?.totalQuestions
                                        } questions and a specialized time limit.
                                    </>
                                ) : (
                                    <>
                                        This test will have {blueprintMap[selectedExamType].parts.reduce((sum, p) => sum + p.totalQuestions, 0)} questions and a time limit of {blueprintMap[selectedExamType].totalDurationMinutes} minutes.
                                    </>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                </fieldset>
             </CardContent>
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
        </form>
        </Form>
    </Card>
  );
}
