
"use client";

import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LeaderboardEntry, UserData, LiveTest } from '@/lib/types';
import { Trophy, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { getLiveTestLeaderboardData } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle } from '@/components/ui/alert';

interface LeaderboardClientProps {
  initialTopicLeaderboards: Record<UserData['examCategory'], LeaderboardEntry[]>;
  initialMockTestLeaderboards: Record<UserData['examCategory'], LeaderboardEntry[]>;
  initialLiveTestLeaderboard: LeaderboardEntry[];
  pastLiveTests: LiveTest[];
}

type ExamCategory = UserData['examCategory'];

function LeaderboardTable({ data }: { data: LeaderboardEntry[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        No data available yet. Be the first one on the leaderboard!
      </div>
    );
  }

  const getRankClass = (rank: number) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-yellow-700";
    return "";
  }
  
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-center">Rank</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="text-center">Score</TableHead>
            <TableHead className="text-right">Percentage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entry) => (
            <TableRow key={entry.userId}>
              <TableCell className="font-bold text-center text-lg">
                <div className="flex items-center justify-center gap-2">
                  <span className={cn(getRankClass(entry.rank))}>{entry.rank}</span>
                  {entry.rank <= 3 && <Trophy className={cn("h-5 w-5", getRankClass(entry.rank))} />}
                </div>
              </TableCell>
              <TableCell className="font-medium">{entry.userName}</TableCell>
              <TableCell className="text-center">{entry.totalExams ? `${entry.totalExams} exams` : `${entry.score}/${entry.totalQuestions}`}</TableCell>
              <TableCell className="text-right font-semibold">{entry.averageScore.toFixed(2)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CategorySelector({ selectedCategory, setSelectedCategory }: { selectedCategory: ExamCategory, setSelectedCategory: (category: ExamCategory) => void }) {
  const categories: ExamCategory[] = ['MTS', 'POSTMAN', 'PA'];
  return (
    <RadioGroup
      value={selectedCategory}
      onValueChange={(value) => setSelectedCategory(value as ExamCategory)}
      className="flex items-center space-x-4 mb-4"
    >
      <Label>Exam Category:</Label>
      {categories.map(cat => (
        <div key={cat} className="flex items-center space-x-2">
          <RadioGroupItem value={cat} id={`cat-${cat}`} />
          <Label htmlFor={`cat-${cat}`}>{cat}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}

export function LeaderboardClient({ initialTopicLeaderboards, initialMockTestLeaderboards, initialLiveTestLeaderboard, pastLiveTests }: LeaderboardClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExamCategory>('MTS');
  const [liveTestLeaderboard, setLiveTestLeaderboard] = useState<LeaderboardEntry[]>(initialLiveTestLeaderboard);
  const [selectedLiveTest, setSelectedLiveTest] = useState<string>(pastLiveTests[0]?.id || '');
  const [isLoadingLiveLeaderboard, setIsLoadingLiveLeaderboard] = useState(false);
  const { toast } = useToast();

  const handleLiveTestChange = useCallback(async (liveTestId: string) => {
    if (!liveTestId) return;
    setSelectedLiveTest(liveTestId);
    setIsLoadingLiveLeaderboard(true);
    try {
        const data = await getLiveTestLeaderboardData(liveTestId);
        setLiveTestLeaderboard(data);
    } catch (error) {
        console.error("Failed to fetch live test leaderboard:", error);
        toast({ title: "Error", description: "Could not load leaderboard data for this event.", variant: "destructive" });
    } finally {
        setIsLoadingLiveLeaderboard(false);
    }
  }, [toast]);


  return (
    <Tabs defaultValue="live" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="live">Live Test</TabsTrigger>
        <TabsTrigger value="topic">Topic-wise</TabsTrigger>
        <TabsTrigger value="mock">Mock Test</TabsTrigger>
      </TabsList>
      <TabsContent value="live">
        <Card>
          <CardHeader>
            <CardTitle>Live Test Leaderboard</CardTitle>
            <CardDescription>Ranking based on scores from live test events. See who comes out on top!</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertTitle className="text-yellow-800 dark:text-yellow-300">Special Reward!</AlertTitle>
                <CardDescription className="text-yellow-700 dark:text-yellow-400">
                    The top-ranked free user for each event will win one year of unlimited Pro access for free!
                </CardDescription>
            </Alert>
            <div className="mb-4">
                <Label>Select Live Test Event</Label>
                <Select value={selectedLiveTest} onValueChange={handleLiveTestChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a past live test..." />
                    </SelectTrigger>
                    <SelectContent>
                        {pastLiveTests.map(test => (
                            <SelectItem key={test.id} value={test.id}>
                                {test.title} - {new Date(test.startTime.seconds * 1000).toLocaleDateString()}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {isLoadingLiveLeaderboard ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <LeaderboardTable data={liveTestLeaderboard} />
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="topic">
        <Card>
          <CardHeader>
            <CardTitle>Topic-wise Leaderboard</CardTitle>
            <CardDescription>Ranking based on average scores from all topic-wise quizzes. Only users who have completed more than two exams are included.</CardDescription>
          </CardHeader>
          <CardContent>
            <CategorySelector selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
            <LeaderboardTable data={initialTopicLeaderboards[selectedCategory]} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="mock">
        <Card>
          <CardHeader>
            <CardTitle>Mock Test Leaderboard</CardTitle>
            <CardDescription>Ranking based on average scores from all mock tests. Only users who have completed more than two exams are included.</CardDescription>
          </CardHeader>
          <CardContent>
             <CategorySelector selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
            <LeaderboardTable data={initialMockTestLeaderboards[selectedCategory]} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
