

import { CreateQuizForm } from "@/components/quiz/create-quiz-form";
import { getCategories, getTopics } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { getAuth } from "firebase/auth";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // We can't reliably get the current user on the server without a session management library.
  // We will continue to fetch user-specific data on the client in create-quiz-form.
  // However, we can pre-load the generic categories and topics.
  const [categories, topics] = await Promise.all([
    getCategories(),
    getTopics(),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create Your Own Exam</h1>
        <p className="text-muted-foreground">
          Select a topic to generate an exam. Our AI will handle the rest.
        </p>
      </div>
      <CreateQuizForm initialCategories={categories} initialTopics={topics} />
    </div>
  );
}
