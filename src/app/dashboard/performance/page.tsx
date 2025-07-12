
import { getFirebaseAuth } from '@/lib/firebase';
import { getPerformanceByTopic } from '@/lib/firestore';
import { PerformanceClient } from '@/components/performance/performance-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

export default async function PerformancePage() {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;

  if (!currentUser) {
    // The layout's client-side check will handle the redirect.
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold mb-4">Your Performance</h1>
            <Card>
                <CardHeader>
                <CardTitle>Topic-wise Analysis</CardTitle>
                 <CardDescription>An overview of your scores across different topics.</CardDescription>
                </CardHeader>
                <CardContent>
                <p>Loading your performance data...</p>
                </CardContent>
            </Card>
      </div>
    );
  }

  const performanceData = await getPerformanceByTopic(currentUser.uid);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">Your Performance</h1>
      <PerformanceClient initialPerformanceData={performanceData} />
    </div>
  );
}
