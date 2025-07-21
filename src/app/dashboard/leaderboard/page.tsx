
import { getLeaderboardData } from '@/lib/firestore';
import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const [topicLeaderboard, mockTestLeaderboard] = await Promise.all([
    getLeaderboardData('topic'),
    getLeaderboardData('mock'),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          See how you stack up against other users in topic-wise and mock test performance.
        </p>
      </div>
      <LeaderboardClient
        initialTopicLeaderboard={topicLeaderboard}
        initialMockTestLeaderboard={mockTestLeaderboard}
      />
    </div>
  );
}
