
"use client";

import { useState, useMemo, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Topic, Category } from '@/lib/types';

const parts = ["Part A", "Part B"] as const;

const formSchema = z.object({
  part: z.enum(parts, { required_error: 'Please select a syllabus part.'}),
  contextId: z.string({ required_error: 'Please select a topic or category.' }),
  question: z.string().min(10, 'Your question must be at least 10 characters long.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function QAPage() {
  const { toast } = useToast();
  const { user, userData, topics, categories, isLoading: isDashboardLoading } = useDashboard();
  const [isGenerating, setIsGenerating] = useState(false);
  const [answer, setAnswer] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      part: undefined,
      contextId: '',
      question: '',
    },
  });

  const selectedPart = form.watch('part');

  useEffect(() => {
    form.resetField('contextId');
  }, [selectedPart, form]);

  const partA_Topics = useMemo(() => {
    if (!userData || selectedPart !== 'Part A') return [];
    return topics.filter(topic => 
        topic.part === 'Part A' &&
        topic.examCategories.includes(userData.examCategory)
    );
  }, [topics, userData, selectedPart]);
  
  const partB_Categories = useMemo(() => {
    if (!userData || selectedPart !== 'Part B') return [];
    
    // Get all topic IDs for the user in Part B
    const partBTopicIds = new Set(
        topics
            .filter(t => t.part === 'Part B' && t.examCategories.includes(userData.examCategory))
            .map(t => t.id)
    );
    
    // Find all categories that contain at least one of these topics
    const relevantCategoryIds = new Set(
        topics
            .filter(t => partBTopicIds.has(t.id))
            .map(t => t.categoryId)
    );

    return categories.filter(c => relevantCategoryIds.has(c.id));
  }, [topics, categories, userData, selectedPart]);


  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    setAnswer('');

    if (!user) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in.', variant: 'destructive' });
      setIsGenerating(false);
      return;
    }

    let material: string | undefined;
    let topicTitle: string;

    if (values.part === 'Part A') {
        const selectedTopic = topics.find(t => t.id === values.contextId);
        if (!selectedTopic) {
            toast({ title: 'Error', description: 'Selected topic not found.', variant: 'destructive' });
            setIsGenerating(false);
            return;
        }
        material = selectedTopic.material;
        topicTitle = selectedTopic.title;
    } else { // Part B
        const selectedCategory = categories.find(c => c.id === values.contextId);
         if (!selectedCategory) {
            toast({ title: 'Error', description: 'Selected category not found.', variant: 'destructive' });
            setIsGenerating(false);
            return;
        }
        material = undefined; // No material for Part B categories
        topicTitle = selectedCategory.name;
    }


    try {
      const { answer } = await answerQuestion({
        material: material,
        question: values.question,
        topic: topicTitle,
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
                  name="part"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Syllabus Part</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Select a syllabus part" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                          {parts.map((part) => (
                              <SelectItem key={part} value={part}>{part}</SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
                />

                {selectedPart === 'Part A' && (
                    <FormField
                    control={form.control}
                    name="contextId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Topic</FormLabel>
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant="outline"
                                role="combobox"
                                disabled={!selectedPart}
                                className={cn(
                                    "w-full justify-between",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value
                                    ? partA_Topics.find(
                                        (topic) => topic.id === field.value
                                    )?.title
                                    : "Select a topic"}
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
                                    {partA_Topics.map((topic) => (
                                        <CommandItem
                                        value={topic.title}
                                        key={topic.id}
                                        onSelect={() => {
                                            form.setValue("contextId", topic.id)
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
                )}
                
                {selectedPart === 'Part B' && (
                     <FormField
                        control={form.control}
                        name="contextId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPart || partB_Categories.length === 0}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={partB_Categories.length === 0 ? "No categories in this part" : "Select a category"} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {partB_Categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

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
              <Button type="submit" disabled={isGenerating || isDashboardLoading || !form.formState.isValid}>
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
