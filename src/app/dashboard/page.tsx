import { CreateQuizForm } from "@/components/quiz/create-quiz-form";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create Your Own Quiz</h1>
        <p className="text-muted-foreground">
          Select a topic to auto-fill the material, or paste your own. Our AI will generate a quiz for you.
        </p>
      </div>
      <CreateQuizForm />
    </div>
  );
}
