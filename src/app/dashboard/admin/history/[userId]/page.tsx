
import { getExamHistoryForUser, getUserData } from '@/lib/firestore';
import { HistoryClient } from '@/components/history/history-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UserHistoryPage({ params }: { params: { userId: string }}) {
  const { userId } = params;
  
  const [examHistory, userData] = await Promise.all([
    getExamHistoryForUser(userId),
    getUserData(userId)
  ]);

  if (!userData) {
    notFound();
  }

  return (
    <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/admin">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Admin Panel
          </Link>
         </Button>
      <h1 className="text-2xl font-bold mb-4">Exam History for: <span className="text-primary">{userData.name}</span></h1>
      <HistoryClient initialHistory={examHistory} />
    </div>
  );
}
