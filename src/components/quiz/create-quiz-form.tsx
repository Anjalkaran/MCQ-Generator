
"use client";

import { useState, useEffect } from 'react';
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
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FREE_TOPIC_EXAM_LIMIT } from '@/lib/constants';
import Link from 'next/link';
import { useDashboard } from '@/app/dashboard/layout';


const formSchema = z.object({
  categoryId: z.string().min(1, 'Please select a category.'),
  topicId: z.string().min(1, 'Please select a topic.'),
  numberOfQuestions: z.coerce.number().min(3).max(50),
  difficulty: z.string().min(1, 'Please select a difficulty level.'),
});

type FormValues = z.infer<typeof formSchema>;
type DifficultyLevel = 'Easy' | 'Moderate' | 'Difficult';
const difficultyLevels: DifficultyLevel[] = ['Easy', 'Moderate', 'Difficult'];


interface CreateQuizFormProps {
    initialCategories: Category[];
    initialTopics: Topic[];
}

export function CreateQuizForm({ initialCategories, initialTopics }: CreateQuizFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData, isLoading } = useDashboard();
  const [isGenerating, setIsGenerating] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: '',
      topicId: '',
      numberOfQuestions: 5,
      difficulty: 'Moderate',
    },
  });

  useEffect(() => {
    if (user && userData) {
        // All users see all categories for their exam type
        const userExamCategory = userData.examCategory;
        const userCategories = initialCategories.filter(c => 
          c.examCategories && c.examCategories.includes(userExamCategory)
        );
        setCategories(userCategories);

        const userCategoryIds = userCategories.map(c => c.id);
        const userTopics = initialTopics.filter(t => userCategoryIds.includes(t.categoryId));
        setTopics(userTopics);
    } else {
        setCategories([]);
        setTopics([]);
    }
  }, [initialCategories, initialTopics, user, userData]);

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

    try {
      const previousQuestions = await getMCQHistoryForTopic(user.uid, values.topicId);

      const generationInput = {
          topic: selectedTopic.title,
          category: selectedCategory.name,
          numberOfQuestions: values.numberOfQuestions,
          difficulty: values.difficulty,
          material: (selectedTopic.material && !excludedCategories.includes(selectedCategory.name)) ? selectedTopic.material : undefined,
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
          material: selectedTopic.material,
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

  const filteredTopics = selectedCategoryId ? topics.filter(topic => topic.categoryId === selectedCategoryId) : [];
  
  const isPro = userData?.isPro && userData.proValidUntil && new Date(userData.proValidUntil) > new Date();
  
  const hasExceededFreeLimit = !isPro && userData && userData.topicExamsTaken >= FREE_TOPIC_EXAM_LIMIT;

  const getCardDescription = () => {
    if (isLoading || !userData) return "Loading your details...";

    if (isPro) {
        return `Welcome, ${userData.name}! Enjoy your unlimited exam access.`;
    }
    
    const examsRemaining = FREE_TOPIC_EXAM_LIMIT - userData.topicExamsTaken;
    return `Welcome, ${userData.name}! You have ${examsRemaining > 0 ? examsRemaining : 0} free exam(s) remaining.`;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz Details</CardTitle>
        <CardDescription>
            {getCardDescription()}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent>
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
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('topicId', '');
                        }} value={field.value} disabled={!user || categories.length === 0}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={!user ? "Login to see categories" : (categories.length === 0 ? "No categories available for your exam type" : "Select a category")} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {categories.map((category) => (
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
