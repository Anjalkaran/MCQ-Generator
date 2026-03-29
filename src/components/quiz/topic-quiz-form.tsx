
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateMCQs } from '@/ai/flows/generate-mcqs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Gem } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useDashboard } from '@/app/dashboard/layout';
import { ADMIN_EMAILS } from '@/lib/constants';
import { normalizeDate } from '@/lib/utils';
import type { Topic, MCQ } from '@/lib/types';
import { getTopicMCQs, getExamHistoryForUser } from '@/lib/firestore';

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
  const [availableMCQs, setAvailableMCQs] = useState(0);
  const [attendedQuestions, setAttendedQuestions] = useState(0);
  
  useEffect(() => {
    async function fetchTopicData() {
        if (!user) return;
        
        // Fetch number of available questions
        const mcqDocs = await getTopicMCQs(topic.id);
        let totalMCQs = 0;
        mcqDocs.forEach(doc => {
            try {
                const data = JSON.parse(doc.content);
                if (data.mcqs && Array.isArray(data.mcqs)) {
                    totalMCQs += data.mcqs.length;
                }
            } catch (e) {
                console.warn(`Could not parse content of ${doc.fileName}`);
            }
        });
        setAvailableMCQs(totalMCQs);
        
        // Fetch number of unique attended questions
        const history = await getExamHistoryForUser(user.uid);
        const topicHistory = history.filter(h => h.topicId === topic.id);
        const uniqueQuestions = new Set<string>();
        topicHistory.forEach(item => {
            item.questions.forEach(q => uniqueQuestions.add(q));
        });
        setAttendedQuestions(uniqueQuestions.size);
    }
    fetchTopicData();
  }, [topic.id, user]);

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
      const res: any = await generateMCQs({
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

      if (!res || !res.quizId) {
        toast({
          title: 'Exam Generation Failed',
          description: res?.error || 'The AI could not generate an exam for this topic. This may be because no question file (.json or .docx) has been uploaded for it yet.',
          variant: 'destructive',
          duration: 7000,
        });
        setIsGenerating(false);
        return;
      }

      router.push(`/quiz/${res.quizId}`);

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
  
  return (
    <Card>
       <CardHeader>
          <CardTitle>
            Exam Setup
          </CardTitle>
        </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent>
                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <Card>
                        <CardHeader className="p-4">
                            <CardDescription>Total MCQs available</CardDescription>
                            <CardTitle className="text-2xl">{availableMCQs}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="p-4">
                            <CardDescription>Attempted</CardDescription>
                            <CardTitle className="text-2xl">{attendedQuestions}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
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
                        <FormLabel>Enter Questions per Exam (Max 25)</FormLabel>
                        <FormControl>
                            <Input type="number" min="3" max="25" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </fieldset>
             </CardContent>
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
        </form>
        </Form>
    </Card>
  );
}
