
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateMCQs } from '@/ai/flows/generate-mcqs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Gem } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Category, Topic } from '@/lib/types';
import { normalizeDate } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FREE_EXAM_LIMIT, ADMIN_EMAILS } from '@/lib/constants';
import Link from 'next/link';
import { useDashboard } from '@/app/dashboard/layout';

const languages = ["English", "Tamil", "Hindi", "Telugu", "Kannada"] as const;

const formSchema = z.object({
  examType: z.string().min(1, 'Please select an exam type.'),
  part: z.string().min(1, 'Please select a part.'),
  categoryId: z.string().min(1, 'Please select a category.'),
  topicId: z.string().min(1, 'Please select a topic.'),
  numberOfQuestions: z.coerce.number().min(3).max(25),
  language: z.enum(languages).optional().default('English'),
});

type FormValues = z.infer<typeof formSchema>;
const parts = ["Part A", "Part B", "Paper-I", "Paper-III"] as const;
const examCategories = ["MTS", "POSTMAN", "PA", "IP"] as const;

export function CreateQuizForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData, isLoading, categories, topics } = useDashboard();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      examType: '',
      part: '',
      categoryId: '',
      topicId: '',
      numberOfQuestions: 5,
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
    } else {
        form.setValue('examType', '');
    }
  }, [userData?.examCategory, form]);


  const selectedExamType = form.watch('examType');
  const selectedPart = form.watch('part');
  const selectedCategoryId = form.watch('categoryId');
  const isIPUser = userData?.examCategory === 'IP';
  const availableParts = isIPUser ? ["Paper-I", "Paper-III"] : ["Part A", "Part B"];

  // Effect to reset dependent fields when a parent selection changes
  useEffect(() => {
    form.resetField('part', { defaultValue: '' });
    form.resetField('categoryId', { defaultValue: '' });
    form.resetField('topicId', { defaultValue: '' });
  }, [selectedExamType, form]);
  
  useEffect(() => {
    form.resetField('categoryId', { defaultValue: '' });
    form.resetField('topicId', { defaultValue: '' });
  }, [selectedPart, form]);

  useEffect(() => {
    form.resetField('topicId', { defaultValue: '' });
  }, [selectedCategoryId, form]);

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);

    if (!user || !userData) {
        toast({ title: 'Not Authenticated', description: 'You must be logged in to create a quiz.', variant: 'destructive' });
        setIsGenerating(false);
        return;
    }
    
    const selectedTopic = topics.find(t => t.id === values.topicId);
    const selectedCategory = categories.find(c => c.id === values.categoryId);

    if (!selectedTopic || !selectedCategory) {
        toast({
          title: 'Topic Not Found',
          description: 'The selected topic or category could not be found. Please try again.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
    }

    try {
      const generationInput: any = {
          topic: selectedTopic.title,
          category: selectedCategory.name,
          numberOfQuestions: values.numberOfQuestions,
          examCategory: values.examType,
          part: selectedTopic.part,
          material: selectedTopic.material,
          userId: user.uid,
          topicId: selectedTopic.id,
          language: values.language,
      };


      const { quizId } = await generateMCQs(generationInput);

      if (!quizId) {
        toast({
          title: 'Exam Generation Failed',
          description: 'The AI could not generate an exam for the selected topic. This may be because no question file (.json or .docx) has been uploaded for it yet.',
          variant: 'destructive',
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
  
  const filteredCategoriesByExam = useMemo(() => {
    if (!selectedExamType) return [];
    // Exclude reasoning and general awareness categories
    return categories.filter(c => 
        c.examCategories && 
        c.examCategories.includes(selectedExamType) &&
        !c.name.toLowerCase().includes("reasoning") &&
        !c.name.toLowerCase().includes("non-verbal") &&
        !c.name.toLowerCase().includes("non verbal") &&
        !c.name.toLowerCase().includes("general awareness")
    );
  }, [selectedExamType, categories]);
  
  const filteredTopics = useMemo(() => {
    if (!selectedCategoryId || !selectedPart || !selectedExamType) return [];
    
    let partTopics = topics.filter(topic => 
        topic.categoryId === selectedCategoryId && 
        topic.part === selectedPart &&
        topic.examCategories.includes(selectedExamType)
    );

    return partTopics;

  }, [selectedCategoryId, selectedPart, selectedExamType, topics]);
  
  const filteredCategoriesByPart = useMemo(() => {
    if (!selectedPart || !selectedExamType) return [];
    
    // Get all topics for the selected exam type and part
    const relevantTopics = topics.filter(t => t.part === selectedPart && t.examCategories.includes(selectedExamType));
    const relevantCategoryIds = new Set(relevantTopics.map(t => t.categoryId));

    const finalCategories = filteredCategoriesByExam.filter(c => relevantCategoryIds.has(c.id));

    return finalCategories;
    
  }, [selectedPart, selectedExamType, filteredCategoriesByExam, topics]);

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
                    {!isIPUser && (
                        <FormField
                            control={form.control}
                            name="examType"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Select Exam</FormLabel>
                                <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value} 
                                    disabled={!user}
                                >
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Exam" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {availableExams.map((exam) => (
                                        <SelectItem key={exam} value={exam}>
                                        {exam}
                                        </SelectItem>
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
                    name="part"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{isIPUser ? 'Paper' : 'Part'}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedExamType}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={!selectedExamType ? "Select an exam first" : (isIPUser ? "Select a paper" : "Select a part")} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {availableParts.map((part) => (
                                <SelectItem key={part} value={part}>
                                {part}
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
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPart || filteredCategoriesByPart.length === 0}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={!selectedPart ? "Select a part/paper first" : (filteredCategoriesByPart.length === 0 ? "No categories in this part" : "Select a category")} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {filteredCategoriesByPart.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                {category.name}
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
                    name="topicId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Topic</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategoryId || filteredTopics.length === 0}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={!selectedCategoryId ? "Select a category first" : (filteredTopics.length === 0 ? "No topics in this category" : "Select a topic")} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {filteredTopics.map(topic => (
                                <SelectItem key={topic.id} value={topic.id}>
                                {topic.title}
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
