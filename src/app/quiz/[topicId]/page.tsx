import { notFound } from "next/navigation";
import { MCQClient } from "@/components/mcq/mcq-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function MCQPage({
  params,
}: {
  params: { topicId: string };
}) {

  // This page now relies on quiz data being passed via localStorage
  // after being generated on the dashboard.

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 bg-muted/40">
       <div className="w-full max-w-2xl">
         <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
         </Button>
        <MCQClient topicId={params.topicId} />
      </div>
    </main>
  );
}
