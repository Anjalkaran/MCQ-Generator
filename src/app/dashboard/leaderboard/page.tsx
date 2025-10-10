
import { getLeaderboardData, getLiveTestsForLeaderboard } from '@/lib/firestore';
import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client';
import type { UserData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const examCategories: UserData['examCategory'][] = ['MTS', 'POSTMAN', 'PA', 'IP'];
  
  const [
    topicLeaderboard_MTS, topicLeaderboard_POSTMAN, topicLeaderboard_PA, topicLeaderboard_IP,
    mockTestLeaderboard_MTS, mockTestLeaderboard_POSTMAN, mockTestLeaderboard_PA, mockTestLeaderboard_IP,
    pastLiveTests,
  ] = await Promise.all([
    getLeaderboardData('topic', 'MTS'),
    getLeaderboardData('topic', 'POSTMAN'),
    getLeaderboardData('topic', 'PA'),
    getLeaderboardData('topic', 'IP'),
    getLeaderboardData('mock', 'MTS'),
    getLeaderboardData('mock', 'POSTMAN'),
    getLeaderboardData('mock', 'PA'),
    getLeaderboardData('mock', 'IP'),
    getLiveTestsForLeaderboard(),
  ]);

  const initialTopicLeaderboards = {
    MTS: topicLeaderboard_MTS,
    POSTMAN: topicLeaderboard_POSTMAN,
    PA: topicLeaderboard_PA,
    IP: topicLeaderboard_IP,
  };

  const initialMockTestLeaderboards = {
    MTS: mockTestLeaderboard_MTS,
    POSTMAN: mockTestLeaderboard_POSTMAN,
    PA: mockTestLeaderboard_PA,
    IP: mockTestLeaderboard_IP,
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          See how you stack up against other users in topic-wise, mock test, and live test performance.
        </p>
      </div>
      <LeaderboardClient
        initialTopicLeaderboards={initialTopicLeaderboards}
        initialMockTestLeaderboards={initialMockTestLeaderboards}
        pastLiveTests={pastLiveTests}
      />
    </div>
  );
}
