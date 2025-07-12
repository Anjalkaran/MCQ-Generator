
"use client";

import { useState, useEffect } from 'react';
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
import { getUserData } from '@/lib/firestore';
import type { Category, Topic, UserData } from '@/lib/types';
import { getFirebaseAuth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';

const formSchema = z.object({
  categoryId: z.string().min(1, 'Please select a category.'),
  topicId: z.string().min(1, 'Please select a topic.'),
  numberOfQuestions: z.coerce.number().min(3).max(50),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateQuizFormProps {
    initialCategories: Category[];
    initialTopics: Topic[];
}

export function CreateQuizForm({ initialCategories, initialTopics }: CreateQuizFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: '',
      topicId: '',
      numberOfQuestions: 5,
    },
  });

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
        setIsLoading(false);
        return;
    };
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        getUserData(currentUser.uid).then(data => {
            if(data) setUserData(data);
            setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const selectedCategoryId = form.watch('categoryId');

  useEffect(() => {
    if (userData) {
        const userCategories = initialCategories.filter(c => c.examCategory === userData.examCategory || c.examCategory === 'ALL');
        setCategories(userCategories);

        const userCategoryIds = userCategories.map(c => c.id);
        const userTopics = initialTopics.filter(t => userCategoryIds.includes(t.categoryId));
        setTopics(userTopics);
    }
  }, [userData, initialCategories, initialTopics]);
  

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    
    const selectedTopic = topics.find(t => t.id === values.topicId);

    if (!selectedTopic) {
        toast({
          title: 'Topic Not Found',
          description: 'The selected topic could not be found. Please try again.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
    }

    try {
      const { mcqs } = await generateMCQs({
        topic: selectedTopic.title,
        numberOfQuestions: values.numberOfQuestions,
      });

      if (!mcqs || mcqs.length === 0) {
        toast({
          title: 'Quiz Generation Failed',
          description: 'The AI could not generate a quiz for the selected topic. Please try again.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      const topicId = values.topicId;
      const quizData = {
        topic: {
          id: topicId,
          title: selectedTopic.title,
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

  const filteredTopics = selectedCategoryId ? topics.filter(topic => topic.categoryId === selectedCategoryId) : [];

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Quiz Details</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4">Loading user data...</p>
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz Details</CardTitle>
        <CardDescription>Select a category and topic to generate a quiz for your exam type: <span className='font-bold'>{userData?.examCategory || 'N/A'}</span>.</CardDescription>
      </CardHeader>
      <CardContent>
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
                   }} defaultValue={field.value} disabled={!userData}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!userData ? "Login to see categories" : "Select a category"} />
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
                   <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategoryId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a topic" />
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
                Generate & Start Quiz
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
