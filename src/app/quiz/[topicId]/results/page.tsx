import { QuizResultsClient } from "@/components/quiz/quiz-results-client";

export default function ResultsPage({
  params,
}: {
  params: { topicId:string };
}) {
  return (
    <main className="flex-1 flex flex-col items-center p-4 md:p-6 bg-muted/40">
      <div className="w-full max-w-4xl">
        <QuizResultsClient topicId={params.topicId} />
      </div>
    </main>
  );
}
