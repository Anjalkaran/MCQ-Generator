
"use client";

import { useState, useMemo } from 'react';
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
import { getMCQHistoryForTopic } from '@/lib/firestore';
import type { Category, Topic } from '@/lib/types';
import { cn, normalizeDate } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FREE_TOPIC_EXAM_LIMIT, ADMIN_EMAIL } from '@/lib/constants';
import Link from 'next/link';
import { useDashboard } from '@/app/dashboard/layout';

const formSchema = z.object({
  examType: z.string().min(1, 'Please select an exam type.'),
  part: z.string().min(1, 'Please select a part.'),
  categoryId: z.string().min(1, 'Please select a category.'),
  topicId: z.string().min(1, 'Please select a topic.'),
  numberOfQuestions: z.coerce.number().min(3).max(50),
  difficulty: z.string().min(1, 'Please select a difficulty level.'),
});

type FormValues = z.infer<typeof formSchema>;
type DifficultyLevel = 'Easy' | 'Moderate' | 'Difficult';
const difficultyLevels: DifficultyLevel[] = ['Easy', 'Moderate', 'Difficult'];
const parts = ["Part A", "Part B"] as const;
const examCategories = ["MTS", "POSTMAN", "PA"] as const;

interface CreateQuizFormProps {
    initialCategories: Category[];
    initialTopics: Topic[];
}

export function CreateQuizForm({ initialCategories, initialTopics }: CreateQuizFormProps) {
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
      difficulty: 'Moderate',
    },
  });
  
  const availableExams = useMemo(() => {
    if (!userData) return [];
    if (userData.email === ADMIN_EMAIL) return examCategories;
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

  useMemo(() => {
    if (userData?.examCategory) {
        form.setValue('examType', userData.examCategory);
    }
  }, [userData, form]);


  const selectedExamType = form.watch('examType');
  const selectedPart = form.watch('part');
  const selectedCategoryId = form.watch('categoryId');
  const selectedDifficulty = form.watch('difficulty');

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
    
    const excludedCategories = ["Basic Arithmetics", "General Awareness"];
    const combinedMaterial = selectedTopic.materials && selectedTopic.materials.length > 0
        ? selectedTopic.materials.map(m => `Source: ${m.name}\n${m.content}`).join('\n\n---\n\n')
        : undefined;

    try {
      const previousQuestions = await getMCQHistoryForTopic(user.uid, values.topicId);

      const generationInput = {
          topic: selectedTopic.title,
          category: selectedCategory.name,
          numberOfQuestions: values.numberOfQuestions,
          difficulty: values.difficulty,
          examCategory: values.examType,
          material: (combinedMaterial && !excludedCategories.includes(selectedCategory.name)) ? combinedMaterial : undefined,
          previousQuestions: previousQuestions,
          userId: user.uid,
      };

      const { mcqs } = await generateMCQs(generationInput);

      if (!mcqs || mcqs.length === 0) {
        toast({
          title: 'Quiz Generation Failed',
          description: 'The AI could not generate a quiz for the selected topic. Please try again.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      const timePerQuestion: Record<DifficultyLevel, number> = {
        Easy: 30,
        Moderate: 45,
        Difficult: 60,
      };
      const timeLimit = values.numberOfQuestions * timePerQuestion[values.difficulty as DifficultyLevel];


      const topicId = values.topicId;
      const quizData = {
        topic: {
          id: topicId,
          title: selectedTopic.title,
          description: 'A custom generated quiz.',
          icon: selectedTopic.icon,
          categoryId: selectedTopic.categoryId,
        },
        mcqs: mcqs,
        timeLimit,
      };

      localStorage.setItem(`quiz-${topicId}`, JSON.stringify(quizData));
      router.push(`/quiz/${topicId}`);

    } catch (error: any) {
      console.error('Error generating quiz:', error);
      toast({
          title: 'Error Generating Quiz',
          description: error.message || 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };
  
  const filteredCategoriesByExam = useMemo(() => {
    if (!selectedExamType) return [];
    return categories.filter(c => c.examCategories && c.examCategories.includes(selectedExamType));
  }, [selectedExamType, categories]);

  const filteredCategoriesByPart = selectedPart ? filteredCategoriesByExam.filter(c => c.part === selectedPart) : [];
  const filteredTopics = selectedCategoryId ? topics.filter(topic => topic.categoryId === selectedCategoryId) : [];
  
  const proValidUntilDate = normalizeDate(userData?.proValidUntil);
  const isPro = !!(userData?.isPro && proValidUntilDate && proValidUntilDate > new Date()) || (userData?.email === ADMIN_EMAIL);
  
  const hasExceededFreeLimit = !isPro && userData && userData.topicExamsTaken >= FREE_TOPIC_EXAM_LIMIT;
  
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
                      name="examType"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Select Exam</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                                field.onChange(value);
                                form.reset({
                                    ...form.getValues(),
                                    examType: value,
                                    part: '',
                                    categoryId: '',
                                    topicId: '',
                                });
                            }} 
                            value={field.value} 
                            disabled={!user || availableExams.length <= 1}
                           >
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder={!user ? "Login to see exams" : "Select Exam"} />
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
                    <FormField
                    control={form.control}
                    name="part"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Part</FormLabel>
                        <Select onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('categoryId', '');
                            form.setValue('topicId', '');
                        }} value={field.value} disabled={!selectedExamType}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={!selectedExamType ? "Select an exam first" : "Select a part"} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {parts.map((part) => (
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
                        <Select onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('topicId', '');
                        }} value={field.value} disabled={!selectedPart || filteredCategoriesByPart.length === 0}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={!selectedPart ? "Select a part first" : (filteredCategoriesByPart.length === 0 ? "No categories in this part" : "Select a category")} />
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
                    name="difficulty"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Difficulty Level</FormLabel>
                        <FormControl>
                            <div className="grid grid-cols-3 gap-2">
                            {difficultyLevels.map((level) => (
                                <Card
                                key={level}
                                onClick={() => form.setValue('difficulty', level, { shouldValidate: true })}
                                className={cn(
                                    'cursor-pointer p-2 text-center transition-all',
                                    selectedDifficulty === level
                                    ? 'border-primary ring-2 ring-primary bg-accent'
                                    : 'hover:bg-muted/50'
                                )}
                                >
                                <CardTitle className="text-base font-medium">{level}</CardTitle>
                                </Card>
                            ))}
                            </div>
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
                        <FormLabel>Number of Questions (3-50)</FormLabel>
                        <FormControl>
                            <Input type="number" min="3" max="50" {...field} />
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
                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Start Exam
                    </Button>
                </CardFooter>
            )}
        </form>
        </Form>
    </Card>
  );
}
