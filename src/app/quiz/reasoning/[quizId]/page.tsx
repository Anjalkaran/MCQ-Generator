
import { ReasoningTestClient } from "@/components/mcq/reasoning-test-client";

export default function ReasoningQuizPage({ params }: { params: { quizId: string }}) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 bg-muted/40">
       <div className="w-full max-w-2xl">
        <ReasoningTestClient quizId={params.quizId} />
      </div>
    </main>
  );
}
