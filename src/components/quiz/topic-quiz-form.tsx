
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateMCQs } from '@/ai/flows/generate-mcqs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Gem } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useDashboard } from '@/app/dashboard/layout';
import { ADMIN_EMAILS, FREE_EXAM_LIMIT } from '@/lib/constants';
import { normalizeDate } from '@/lib/utils';
import type { Topic } from '@/lib/types';

const allLanguages = ["English", "Tamil", "Hindi", "Telugu", "Kannada"] as const;
const ipLanguages = ["English", "Hindi"] as const;

const formSchema = z.object({
  numberOfQuestions: z.coerce.number().min(3).max(25),
  language: z.enum(allLanguages).optional().default('English'),
});

type FormValues = z.infer<typeof formSchema>;

interface TopicQuizFormProps {
    topic: Topic;
}

export function TopicQuizForm({ topic }: TopicQuizFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData, isLoading } = useDashboard();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numberOfQuestions: 5,
      language: 'English',
    },
  });
  
  const isIPUser = userData?.examCategory === 'IP';
  const availableLanguages = isIPUser ? ipLanguages : allLanguages;

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);

    if (!user || !userData) {
        toast({ title: 'Not Authenticated', description: 'You must be logged in to create a quiz.', variant: 'destructive' });
        setIsGenerating(false);
        return;
    }

    try {
      const { quizId } = await generateMCQs({
          topic: topic.title,
          category: topic.categoryName,
          numberOfQuestions: values.numberOfQuestions,
          examCategory: userData.examCategory,
          part: topic.part,
          material: topic.material,
          userId: user.uid,
          topicId: topic.id,
          language: values.language,
      });

      if (!quizId) {
        toast({
          title: 'Exam Generation Failed',
          description: 'The AI could not generate an exam for this topic. This may be because no question file (.json or .docx) has been uploaded for it yet.',
          variant: 'destructive',
          duration: 7000,
        });
        setIsGenerating(false);
        return;
      }

      router.push(`/quiz/${quizId}`);

    } catch (error: any) {
      console.error('Error generating exam:', error);
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
                                        {availableLanguages.map((lang) => (
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
                    name="numberOfQuestions"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Number of Questions (3-25)</FormLabel>
                        <FormControl>
                            <Input type="number" min="3" max="25" {...field} />
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
                                Generating... Please wait.
                            </>
                        ) : (
                            "Start Exam"
                        )}
                    </Button>
                </CardFooter>
            )}
        </form>
        </Form>
    </Card>
  );
}
