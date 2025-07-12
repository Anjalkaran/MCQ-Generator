import { notFound } from "next/navigation";
import { topics } from "@/lib/data";
import { QuizResultsClient } from "@/components/quiz/quiz-results-client";
import { Topic } from "@/lib/types";

export default function ResultsPage({
  params,
}: {
  params: { topicId: string };
}) {
  const topic = topics.find((t) => t.id === params.topicId);

  if (!topic) {
    notFound();
  }

  const { icon, ...serializableTopic } = topic;

  return (
    <main className="flex-1 flex flex-col items-center p-4 md:p-6 bg-muted/40">
      <div className="w-full max-w-4xl">
        <QuizResultsClient topic={serializableTopic as Omit<Topic, 'icon'>} />
      </div>
    </main>
  );
}
