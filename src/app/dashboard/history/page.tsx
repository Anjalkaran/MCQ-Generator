import { getFirebaseAuth } from '@/lib/firebase';
import { getExamHistoryForUser } from '@/lib/firestore';
import { HistoryClient } from '@/components/history/history-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;

  if (!currentUser) {
    // The layout's client-side check will handle the redirect.
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold mb-4">Exam History</h1>
            <Card>
                <CardHeader>
                <CardTitle>Your Past Exams</CardTitle>
                 <CardDescription>A list of all the exams you have taken.</CardDescription>
                </CardHeader>
                <CardContent>
                <p>Loading your exam history...</p>
                </CardContent>
            </Card>
      </div>
    );
  }

  const examHistory = await getExamHistoryForUser(currentUser.uid);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">Exam History</h1>
      <HistoryClient initialHistory={examHistory} />
    </div>
  );
}
