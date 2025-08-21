
"use client";

import { useState, useMemo } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useDashboard } from '@/app/dashboard/layout';
import { ADMIN_EMAILS, FREE_EXAM_LIMIT } from '@/lib/constants';
import { normalizeDate } from '@/lib/utils';
import { generateKnowledgeMCQs } from '@/ai/flows/generate-knowledge-mcqs';
import { getFirebaseDb } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';

const languages = ["English", "Tamil", "Hindi", "Telugu", "Kannada"] as const;

const gkTopics = [
    "Indian Geography", 
    "Civics", 
    "General knowledge", 
    "Indian culture & freedom struggle", 
    "Ethics and morale study", 
    "Current affairs"
] as const;

const formSchema = z.object({
  topic: z.enum(gkTopics, { required_error: 'Please select a topic.' }),
  numberOfQuestions: z.coerce.number().min(3).max(25),
  language: z.enum(languages).optional().default('English'),
});

type FormValues = z.infer<typeof formSchema>;

export function GeneralAwarenessForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData, isLoading } = useDashboard();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: undefined,
      numberOfQuestions: 5,
      language: 'English',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);

    if (!user || !userData) {
        toast({ title: 'Not Authenticated', description: 'You must be logged in to create a quiz.', variant: 'destructive' });
        setIsGenerating(false);
        return;
    }

    try {
      const { quizId } = await generateKnowledgeMCQs({
          topicName: values.topic,
          numberOfQuestions: values.numberOfQuestions,
          language: values.language,
          userId: user.uid,
      });

      if (!quizId) {
        toast({
          title: 'Exam Generation Failed',
          description: 'The AI could not generate an exam for the selected topic. Please try again later.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }
      
      router.push(`/quiz/${quizId}`);

    } catch (error: any) {
      console.error('Error generating G.K. exam:', error);
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
                        name="topic"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Topic</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a General Knowledge topic" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {gkTopics.map((topic) => (
                                    <SelectItem key={topic} value={topic}>
                                    {topic}
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
                                Generating... Please wait a moment.
                            </>
                        ) : (
                            "Start G.K. Test"
                        )}
                    </Button>
                </CardFooter>
            )}
        </form>
        </Form>
    </Card>
  );
}
