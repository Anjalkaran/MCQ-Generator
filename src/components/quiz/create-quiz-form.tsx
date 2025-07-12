
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateMCQs } from '@/ai/flows/generate-mcqs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { topics } from '@/lib/data';

const formSchema = z.object({
  topic: z.string().min(1, 'Please enter a topic or select one.'),
  numberOfQuestions: z.coerce.number().min(3).max(10),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateQuizForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      numberOfQuestions: 5,
    },
  });

  const handleTopicChange = (topicId: string) => {
    const selectedTopic = topics.find(t => t.id === topicId);
    if (selectedTopic) {
      form.setValue('topic', selectedTopic.title, { shouldValidate: true });
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    
    const selectedTopic = topics.find(t => t.title.toLowerCase() === values.topic.toLowerCase());

    if (!selectedTopic || !selectedTopic.material) {
        toast({
          title: 'Material Not Found',
          description: 'Cannot generate a quiz for a custom topic. Please select one from the list.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
    }

    try {
      const { mcqs } = await generateMCQs({
        topic: values.topic,
        material: selectedTopic.material,
        numberOfQuestions: values.numberOfQuestions,
      });

      if (!mcqs || mcqs.length === 0) {
        toast({
          title: 'Quiz Generation Failed',
          description: 'The AI could not generate a quiz from the provided material. Please try again.',
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz Details</CardTitle>
        <CardDescription>Select a topic to generate a quiz.</CardDescription>
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
                   <Select onValueChange={handleTopicChange} defaultValue="">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a pre-defined topic" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {topics.map(topic => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   <FormControl>
                     <Input {...field} placeholder="Or enter your own topic title" className="mt-2"/>
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
              <Button type="submit" disabled={isGenerating} className="flex-1">
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate & Start Quiz
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
