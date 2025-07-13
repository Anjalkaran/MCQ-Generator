
"use client";

import { useState, useEffect } from 'react';
import { getFirebaseAuth } from '@/lib/firebase';
import { getCategories, getTopics, getUserData } from '@/lib/firestore';
import type { UserData, Category, Topic } from "@/lib/types";
import { CreateQuizForm } from "@/components/quiz/create-quiz-form";
import { MockTestForm } from "@/components/quiz/mock-test-form";
import { PaymentButtonContainer } from "@/components/payment/payment-button-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from 'lucide-react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

const ADMIN_EMAIL = "admin@anjalkaran.com";
const FREE_TOPIC_EXAM_LIMIT = 1;

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setIsLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const [fetchedUserData, fetchedCategories, fetchedTopics] = await Promise.all([
          getUserData(currentUser.uid),
          getCategories(),
          getTopics()
        ]);
        setUserData(fetchedUserData);
        setCategories(fetchedCategories);
        setTopics(fetchedTopics);
      } else {
        // No user is logged in, layout should handle redirect
        setUserData(null);
        setCategories([]);
        setTopics([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create Your Own Exam</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading Your Dashboard...</CardTitle>
            <CardDescription>Please wait while we fetch your details.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || !userData) {
    // This case is a fallback, as the layout should have redirected to login
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create Your Own Exam</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You must be logged in to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = userData.paymentStatus === 'paid';
  const isAdmin = userData.email === ADMIN_EMAIL;
  const hasReachedFreeLimit = !isAdmin && !isPaid && userData.topicExamsTaken >= FREE_TOPIC_EXAM_LIMIT;

  if (hasReachedFreeLimit) {
    return <PaymentButtonContainer initialUserData={userData} />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Create Your Own Exam</h1>
      </div>
      <Tabs defaultValue="topic-wise" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="topic-wise">Topic-wise MCQ</TabsTrigger>
          <TabsTrigger value="mock-test">Mock Test</TabsTrigger>
        </TabsList>
        <TabsContent value="topic-wise">
          <CreateQuizForm initialCategories={categories} initialTopics={topics} />
        </TabsContent>
        <TabsContent value="mock-test">
          <MockTestForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
