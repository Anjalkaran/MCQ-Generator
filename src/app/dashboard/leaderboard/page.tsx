
import { getUnifiedLeaderboardsAdmin } from '@/lib/firestore-admin';
import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const {
    topics,
    mocks,
    daily,
    pastWeeklyTests,
    pastDailyTests
  } = await getUnifiedLeaderboardsAdmin();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          See how you stack up against other users in topic-wise, mock test, and live test performance.
        </p>
      </div>
      <Suspense fallback={<div className="flex h-[50vh] w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
        <LeaderboardClient
          initialTopicLeaderboards={topics}
          initialMockTestLeaderboards={mocks}
          initialDailyTestLeaderboards={daily}
          pastWeeklyTests={pastWeeklyTests}
          pastDailyTests={pastDailyTests}
        />
      </Suspense>
    </div>
  );
}
