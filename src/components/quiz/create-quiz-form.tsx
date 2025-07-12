
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateMCQs } from '@/ai/flows/generate-mcqs';
import { summarizeTopicMaterial } from '@/ai/flows/summarize-topic-material';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters long.'),
  material: z.string().min(50, 'Material must be at least 50 characters long.'),
  numberOfQuestions: z.coerce.number().min(3).max(10),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateQuizForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      material: '',
      numberOfQuestions: 5,
    },
  });

  const handleSummarize = async () => {
    const material = form.getValues('material');
    if (material.length < 50) {
      form.setError('material', {
        type: 'manual',
        message: 'Please provide at least 50 characters of material to summarize.',
      });
      return;
    }
    setIsSummarizing(true);
    setSummary('');
    try {
      const result = await summarizeTopicMaterial({ topicMaterial: material });
      setSummary(result.summary);
    } catch (error) {
      console.error('Error summarizing material:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate summary. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    try {
      const { mcqs } = await generateMCQs({
        topic: values.topic,
        material: values.material,
        numberOfQuestions: values.numberOfQuestions,
      });

      if (!mcqs || mcqs.length === 0) {
        toast({
          title: 'Quiz Generation Failed',
          description: 'The AI could not generate a quiz from the provided material. Please try refining your input.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      const topicId = values.topic.toLowerCase().replace(/\s+/g, '-');
      const quizData = {
        topic: {
          id: topicId,
          title: values.topic,
          description: 'A custom generated quiz.'
        },
        mcqs: mcqs,
      };

      localStorage.setItem(`quiz-${topicId}`, JSON.stringify(quizData));
      router.push(`/quiz/${topicId}`);

    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate quiz. Please try again later.',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const isLoading = isSummarizing || isGenerating;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Quiz Details</CardTitle>
          <CardDescription>Fill in the details below to generate your quiz.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., The Solar System" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="material"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Study Material</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste your study material here. The more detailed, the better the quiz."
                        className="min-h-[200px]"
                        {...field}
                      />
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
                    <FormLabel>Number of Questions (3-10)</FormLabel>
                    <FormControl>
                      <Input type="number" min="3" max="10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={handleSummarize} disabled={isLoading}>
                  {isSummarizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Summarize Material
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate & Start Quiz
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="sticky top-6">
        <CardHeader>
          <CardTitle>Material Summary</CardTitle>
          <CardDescription>
            {isSummarizing ? 'Generating summary...' : 'Click "Summarize Material" to see a quick overview here.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSummarizing ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : summary ? (
            <ScrollArea className="h-[300px] w-full">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summary}</p>
            </ScrollArea>
          ) : (
            <div className="text-sm text-muted-foreground flex items-center justify-center h-[300px] bg-muted/50 rounded-md">
              <p>Your summary will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
