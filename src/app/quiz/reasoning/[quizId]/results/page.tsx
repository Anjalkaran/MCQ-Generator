
import { ReasoningTestResultsClient } from "@/components/mcq/reasoning-test-results-client";

export default function ReasoningResultsPage({ params }: { params: { quizId: string }}) {
  return (
    <main className="flex-1 flex flex-col items-center p-4 md:p-6 bg-muted/40">
      <div className="w-full max-w-4xl">
        <ReasoningTestResultsClient quizId={params.quizId} />
      </div>
    </main>
  );
}
