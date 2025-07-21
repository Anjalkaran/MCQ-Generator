"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDashboard } from '@/app/dashboard/layout';
import { answerQuestion } from '@/ai/flows/answer-question';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, AlertTriangle, Check, ChevronsUpDown } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { Topic } from '@/lib/types';

const formSchema = z.object({
  topicId: z.string({
    required_error: 'Please select a topic.',
  }),
  question: z.string().min(10, 'Your question must be at least 10 characters long.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function QAPage() {
  const { toast } = useToast();
  const { user, userData, topics, isLoading: isDashboardLoading } = useDashboard();
  const [isGenerating, setIsGenerating] = useState(false);
  const [answer, setAnswer] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topicId: '',
      question: '',
    },
  });

  const availableTopics = useMemo(() => {
    if (!userData) return [];
    return topics.filter(topic => topic.examCategories.includes(userData.examCategory));
  }, [topics, userData]);

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    setAnswer('');

    if (!user) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in.', variant: 'destructive' });
      setIsGenerating(false);
      return;
    }

    const selectedTopic = topics.find(t => t.id === values.topicId);
    if (!selectedTopic) {
      toast({ title: 'Error', description: 'Selected topic not found.', variant: 'destructive' });
      setIsGenerating(false);
      return;
    }

    try {
      const { answer } = await answerQuestion({
        material: selectedTopic.material,
        question: values.question,
        topic: selectedTopic.title,
      });
      setAnswer(answer);
    } catch (error: any) {
      console.error('Error getting answer:', error);
      toast({ title: 'Error', description: error.message || 'Failed to get an answer.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Q &amp; A</h1>
        <p className="text-muted-foreground">
          Ask a question about a specific topic and get an answer based on the uploaded study material or the AI's knowledge.
        </p>
      </div>
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="pt-6 space-y-4">
              <fieldset disabled={isGenerating || isDashboardLoading} className="space-y-4">
                <FormField
                  control={form.control}
                  name="topicId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Topic</FormLabel>
                      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? availableTopics.find(
                                    (topic) => topic.id === field.value
                                  )?.title
                                : "Select topic"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" style={{minWidth: "var(--radix-popover-trigger-width)"}}>
                          <Command>
                            <CommandInput placeholder="Search topic..." />
                            <CommandList>
                                <CommandEmpty>No topic found.</CommandEmpty>
                                <CommandGroup>
                                {availableTopics.map((topic) => (
                                    <CommandItem
                                    value={topic.title}
                                    key={topic.id}
                                    onSelect={() => {
                                        form.setValue("topicId", topic.id)
                                        setPopoverOpen(false)
                                    }}
                                    >
                                    <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        topic.id === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                    />
                                    {topic.title}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Question</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., What are the business hours for post offices on Saturdays?" rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isGenerating || isDashboardLoading}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Get Answer
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {isGenerating && (
         <Card>
            <CardContent className="pt-6 flex items-center justify-center">
                 <Loader2 className="mr-4 h-6 w-6 animate-spin" />
                 <p className="text-muted-foreground">Finding the answer...</p>
            </CardContent>
        </Card>
      )}

      {answer && !isGenerating && (
        <Card>
            <CardHeader>
                <CardTitle>Answer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Disclaimer</AlertTitle>
                    <AlertDescription>
                        This answer is generated by an AI. Always verify with official sources.
                    </AlertDescription>
                </Alert>
                <div className="p-4 bg-muted/50 rounded-lg border prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {answer}
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
