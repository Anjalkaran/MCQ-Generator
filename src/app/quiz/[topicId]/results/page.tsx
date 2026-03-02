import { MCQResultsClient } from "@/components/mcq/mcq-results-client";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ topicId:string }>;
}) {
  const { topicId } = await params;

  return (
    <main className="flex-1 flex flex-col items-center p-4 md:p-6 bg-muted/40">
      <div className="w-full max-w-4xl">
        <MCQResultsClient topicId={topicId} />
      </div>
    </main>
  );
}