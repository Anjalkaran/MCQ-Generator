
import { CreateQuizForm } from "@/components/quiz/create-quiz-form";
import { getCategories, getTopics } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MockTestForm } from "@/components/quiz/mock-test-form";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [categories, topics] = await Promise.all([
    getCategories(),
    getTopics(),
  ]);

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
