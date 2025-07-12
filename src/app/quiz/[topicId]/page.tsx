import { notFound } from "next/navigation";
import { topics } from "@/lib/data";
import { QuizClient } from "@/components/quiz/quiz-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function QuizPage({
  params,
}: {
  params: { topicId: string };
}) {
  const topic = topics.find((t) => t.id === params.topicId);

  if (!topic) {
    notFound();
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
       <div className="w-full max-w-2xl">
         <Button variant="ghost" asChild className="mb-4">
          <Link href="/">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Topics
          </Link>
         </Button>
        <QuizClient topic={topic} />
      </div>
    </main>
  );
}
