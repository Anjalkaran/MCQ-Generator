
"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { CreateQuizForm } from "@/components/quiz/create-quiz-form";
import { MockTestForm } from "@/components/quiz/mock-test-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Link from "next/link";

const ADMIN_EMAIL = "admin@anjalkaran.com";
const FREE_TOPIC_EXAM_LIMIT = 1;

export default function DashboardPage() {
  const { user, userData, categories, topics, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You must be logged in to access this page.</p>
        </CardContent>
      </Card>
    );
  }

  const isPaid = userData.paymentStatus === 'paid';
  const isAdmin = userData.email === ADMIN_EMAIL;
  const hasReachedFreeLimit = !isAdmin && !isPaid && (userData.topicExamsTaken || 0) >= FREE_TOPIC_EXAM_LIMIT;

  if (hasReachedFreeLimit) {
    return (
        <Card className="text-center">
            <CardHeader>
                <CardTitle className="text-2xl font-bold">Free Limit Reached</CardTitle>
                <CardDescription>You've used all your free exams. Upgrade your account for unlimited access.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild size="lg">
                    <Link href="/dashboard/upgrade">
                        <Zap className="mr-2 h-4 w-4"/>
                        Upgrade Now
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
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
