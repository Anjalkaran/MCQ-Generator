
import { getLeaderboardData } from '@/lib/firestore';
import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client';
import type { UserData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const examCategories: UserData['examCategory'][] = ['MTS', 'POSTMAN', 'PA'];
  
  const [
    topicLeaderboard_MTS, topicLeaderboard_POSTMAN, topicLeaderboard_PA,
    mockTestLeaderboard_MTS, mockTestLeaderboard_POSTMAN, mockTestLeaderboard_PA,
  ] = await Promise.all([
    getLeaderboardData('topic', 'MTS'),
    getLeaderboardData('topic', 'POSTMAN'),
    getLeaderboardData('topic', 'PA'),
    getLeaderboardData('mock', 'MTS'),
    getLeaderboardData('mock', 'POSTMAN'),
    getLeaderboardData('mock', 'PA'),
  ]);

  const initialTopicLeaderboards = {
    MTS: topicLeaderboard_MTS,
    POSTMAN: topicLeaderboard_POSTMAN,
    PA: topicLeaderboard_PA,
  };

  const initialMockTestLeaderboards = {
    MTS: mockTestLeaderboard_MTS,
    POSTMAN: mockTestLeaderboard_POSTMAN,
    PA: mockTestLeaderboard_PA,
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          See how you stack up against other users in topic-wise and mock test performance.
        </p>
      </div>
      <LeaderboardClient
        initialTopicLeaderboards={initialTopicLeaderboards}
        initialMockTestLeaderboards={initialMockTestLeaderboards}
      />
    </div>
  );
}
