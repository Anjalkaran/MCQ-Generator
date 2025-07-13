
"use client";

import { useState, useEffect, useCallback } from 'react';
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
import { getUserData, getMCQHistoryForTopic } from '@/lib/firestore';
import type { Category, Topic, UserData } from '@/lib/types';
import { getFirebaseAuth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { PaymentButton } from '@/components/payment/payment-button';
import { format } from 'date-fns';


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

const ADMIN_EMAIL = "admin@anjalkaran.com";
const FREE_TOPIC_EXAM_LIMIT = 1;

export function CreateQuizForm({ initialCategories, initialTopics }: CreateQuizFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: '',
      topicId: '',
      numberOfQuestions: 5,
      difficulty: 'Moderate',
    },
  });

  const fetchAndSetUserData = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
        setUserData(null);
        setCategories([]);
        setTopics([]);
        setIsLoading(false);
        return;
    }
    
    setIsLoading(true);
    const fetchedUserData = await getUserData(currentUser.uid);
    setUserData(fetchedUserData);

    if (currentUser.email === ADMIN_EMAIL) {
        setCategories(initialCategories);
        setTopics(initialTopics);
    } else if (fetchedUserData) {
        const userExamCategory = fetchedUserData.examCategory;
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
    setIsLoading(false);
  }, [initialCategories, initialTopics]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
        setIsLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      await fetchAndSetUserData(currentUser);
    });

    const handleFocus = async () => {
        if (auth.currentUser) {
            await fetchAndSetUserData(auth.currentUser);
        }
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
        unsubscribe();
        window.removeEventListener('focus', handleFocus);
    };
  }, [fetchAndSetUserData]);

  const selectedCategoryId = form.watch('categoryId');
  const selectedDifficulty = form.watch('difficulty');

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);

    if (!user || !userData) {
        toast({ title: 'Not Authenticated', description: 'You must be logged in to create a quiz.', variant: 'destructive' });
        setIsGenerating(false);
        return;
    }

    const allTopics = topics;
    const allCategories = categories;

    const selectedTopic = allTopics.find(t => t.id === values.topicId);
    const selectedCategory = allCategories.find(c => c.id === values.categoryId);

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
      if (error.message?.includes('You have used all your')) {
        toast({
            title: "Free Limit Reached",
            description: "Please upgrade to a paid plan for unlimited exam access.",
            variant: "destructive"
        });
      } else {
        toast({
            title: 'Error Generating Quiz',
            description: error.message || 'An unexpected error occurred. Please try again.',
            variant: 'destructive',
        });
      }
      setIsGenerating(false);
    }
  };

  const filteredTopics = selectedCategoryId ? topics.filter(topic => topic.categoryId === selectedCategoryId) : [];

  const handlePaymentSuccess = () => {
    if(user) fetchAndSetUserData(user);
  };
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader className="text-center">
                <CardTitle>Exam Details</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4">Loading your categories and topics...</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  const isAdmin = user?.email === ADMIN_EMAIL;
  const isPaid = userData?.paymentStatus === 'paid';
  const hasReachedFreeLimit = !isAdmin && !isPaid && userData && userData.topicExamsTaken >= FREE_TOPIC_EXAM_LIMIT;

  const getCardDescription = () => {
    if (isAdmin) return "Admin has unlimited access.";
    if (isPaid && userData?.paidUntil) {
      return `Your subscription is active until ${format(new Date(userData.paidUntil), 'PPP')}.`;
    }
    return "Create a practice exam based on your preferences.";
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Exam Details</CardTitle>
        <CardDescription>
            {getCardDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasReachedFreeLimit && userData ? (
            <PaymentButton user={userData} onPaymentSuccess={handlePaymentSuccess} />
        ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" disabled={isGenerating || !form.formState.isValid} className="flex-1">
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Start Exam
                </Button>
                </div>
            </form>
            </Form>
        )}
      </CardContent>
    </Card>
  );
}
