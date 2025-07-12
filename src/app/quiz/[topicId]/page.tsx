import { notFound } from "next/navigation";
import { topics } from "@/lib/data";
import { QuizClient } from "@/components/quiz/quiz-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import type { Topic } from "@/lib/types";

export default function QuizPage({
  params,
  searchParams,
}: {
  params: { topicId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const topic = topics.find((t) => t.id === params.topicId);

  if (!topic) {
    notFound();
  }
  
  const numberOfQuestions = parseInt(searchParams.questions as string, 10) || 10;
  const { icon, ...serializableTopic } = topic;

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
       <div className="w-full max-w-2xl">
         <Button variant="ghost" asChild className="mb-4">
          <Link href="/">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Topics
          </Link>
         </Button>
        <QuizClient topic={serializableTopic as Omit<Topic, 'icon'>} numberOfQuestions={numberOfQuestions} />
      </div>
    </main>
  );
}