
"use client";

import { useState, useEffect, useMemo } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useDashboard } from '@/app/dashboard/layout';
import { generateMockTestFromBank } from '@/ai/flows/generate-mock-test-from-bank';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import { ADMIN_EMAILS } from '@/lib/constants';
import type { BankedQuestion } from '@/lib/types';

const examCategories = ["MTS", "POSTMAN", "PA"] as const;
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
};

export function PreviousYearMockTestForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData, isLoading, bankedQuestions: allBankedQuestions } = useDashboard();
  const [isGenerating, setIsGenerating] = useState(false);
  const [questionBank, setQuestionBank] = useState<BankedQuestion[]>([]);
  const [isBankLoading, setIsBankLoading] = useState(true);
  
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
    // This component is admin-only, but we keep the logic for robustness
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

  const selectedExamType = form.watch('examType');

  useEffect(() => {
    if (selectedExamType) {
        setIsBankLoading(true);
        const filtered = allBankedQuestions.filter(bq => bq.examCategory === selectedExamType);
        setQuestionBank(filtered);
        setIsBankLoading(false);
    } else {
        setQuestionBank([]);
        setIsBankLoading(false);
    }
  }, [selectedExamType, allBankedQuestions]);


  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    if (!user || !userData) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in.', variant: 'destructive' });
      setIsGenerating(false);
      return;
    }
    
    try {
      const { quizId } = await generateMockTestFromBank({
          examCategory: values.examType,
          userId: user.uid,
          language: values.language,
      });

      if (!quizId) {
        toast({ title: 'Generation Failed', description: 'Could not generate a mock test from the question bank.', variant: 'destructive' });
        setIsGenerating(false);
        return;
      }

      router.push(`/quiz/${quizId}`);

    } catch (error: any) {
      console.error('Error generating mock test from bank:', error);
      toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
      setIsGenerating(false);
    }
  };
  
  const hasQuestionPapers = questionBank.length > 0;

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent className="pt-6">
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
                    {selectedExamType && !isBankLoading && !hasQuestionPapers && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>No Question Papers Found</AlertTitle>
                            <AlertDescription>
                                No question papers have been uploaded for the {selectedExamType} category. Please go to the Admin panel to upload documents.
                            </AlertDescription>
                        </Alert>
                    )}
                </fieldset>
             </CardContent>
             <CardFooter>
                <Button type="submit" disabled={isGenerating || !form.formState.isValid || isLoading || isBankLoading || !hasQuestionPapers} className="w-full">
                    {isGenerating || isBankLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                             {isGenerating ? "Extracting Questions..." : "Loading..."}
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
