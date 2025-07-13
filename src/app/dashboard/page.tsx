
"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { CreateQuizForm } from "@/components/quiz/create-quiz-form";
import { MockTestForm } from "@/components/quiz/mock-test-form";
import { PaymentButtonContainer } from "@/components/payment/payment-button-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from 'lucide-react';

const ADMIN_EMAIL = "admin@anjalkaran.com";
const FREE_TOPIC_EXAM_LIMIT = 1;

export default function DashboardPage() {
  const { user, userData, categories, topics, isLoading } = useDashboard();

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
  const hasReachedFreeLimit = !isAdmin && !isPaid && (userData.topicExamsTaken || 0) >= FREE_TOPIC_EXAM_LIMIT;

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
