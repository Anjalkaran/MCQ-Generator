"use client";

import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LeaderboardEntry, UserData, LiveTest } from '@/lib/types';
import { Trophy, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { getLiveTestLeaderboardData } from '@/lib/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { normalizeDate } from '@/lib/utils';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { useDashboard } from '@/app/dashboard/layout';
import { ADMIN_EMAILS } from '@/lib/constants';


interface LeaderboardClientProps {
  initialTopicLeaderboards: Record<UserData['examCategory'], LeaderboardEntry[]>;
  initialMockTestLeaderboards: Record<UserData['examCategory'], LeaderboardEntry[]>;
  pastLiveTests: any[];
}

type ExamCategory = UserData['examCategory'];


function LeaderboardTable({ data, type = 'general' }: { data: LeaderboardEntry[], type?: 'general' | 'live' }) {
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
  
  const formatDuration = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-center">Rank</TableHead>
            <TableHead>User</TableHead>
            {type === 'general' ? (
                 <>
                    <TableHead className="text-center">Exams Taken</TableHead>
                    <TableHead className="text-right">Avg. Percentage</TableHead>
                </>
            ) : (
                <>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-right">Time Taken</TableHead>
                </>
            )}
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
              {type === 'general' ? (
                <>
                    <TableCell className="text-center">{entry.totalExams}</TableCell>
                    <TableCell className="text-right font-semibold">{entry.averageScore.toFixed(2)}%</TableCell>
                </>
              ) : (
                <>
                    <TableCell className="text-center font-semibold">{entry.score}/{entry.totalQuestions}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatDuration(entry.durationInSeconds)}
                    </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CategorySelector({ selectedCategory, setSelectedCategory, availableCategories }: { selectedCategory: ExamCategory | 'All', setSelectedCategory: (category: any) => void, availableCategories: (ExamCategory | 'All')[] }) {
    return (
        <RadioGroup
        value={selectedCategory}
        onValueChange={(value) => setSelectedCategory(value)}
        className="flex items-center space-x-4 mb-4"
        >
        <Label>Filter By:</Label>
        {availableCategories.map(cat => (
            <div key={cat} className="flex items-center space-x-2">
            <RadioGroupItem value={cat} id={`cat-${cat}`} />
            <Label htmlFor={`cat-${cat}`}>{cat}</Label>
            </div>
        ))}
        </RadioGroup>
    );
}

function WeeklyTestLeaderboard({ pastLiveTests, initialTestId, availableCategories, defaultCategory }: { pastLiveTests: any[], initialTestId?: string, availableCategories: (ExamCategory | 'All')[], defaultCategory: ExamCategory | 'All' }) {
    const [selectedCategory, setSelectedCategory] = useState<ExamCategory | 'All'>(defaultCategory);
    const [selectedTestId, setSelectedTestId] = useState<string | undefined>(undefined);
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const filteredLiveTests = useMemo(() => {
        return pastLiveTests
            .filter(test => {
                if (selectedCategory === 'All') return true;
                return test.examCategories?.includes(selectedCategory) || test.examCategories?.includes('All');
            })
            .sort((a, b) => (normalizeDate(b.createdAt)?.getTime() ?? 0) - (normalizeDate(a.createdAt)?.getTime() ?? 0));
    }, [pastLiveTests, selectedCategory]);

    useEffect(() => {
        if (initialTestId) {
            const initialTest = pastLiveTests.find(t => t.id === initialTestId);
            if (initialTest) {
                setSelectedTestId(initialTestId);
                return; 
            }
        }
        setSelectedTestId(filteredLiveTests[0]?.id);
    }, [initialTestId, pastLiveTests, filteredLiveTests]);
    
     useEffect(() => {
        setSelectedTestId(filteredLiveTests[0]?.id);
    }, [selectedCategory, filteredLiveTests]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (!selectedTestId) {
                setLeaderboardData([]);
                return;
            }
            setIsLoading(true);
            try {
                const data = await getLiveTestLeaderboardData(selectedTestId);
                setLeaderboardData(data);
            } catch (error) {
                console.error("Failed to fetch weekly test leaderboard:", error);
                setLeaderboardData([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLeaderboard();
    }, [selectedTestId]);

    const getFormattedDate = (date: any) => {
        const normalized = normalizeDate(date);
        return normalized ? format(normalized, 'dd/MM/yyyy') : 'N/A';
    };

    return (
        <div className="space-y-4">
             <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                <div className="w-full sm:w-auto">
                    <CategorySelector selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} availableCategories={availableCategories} />
                </div>
                <div className="flex-grow">
                    <Select value={selectedTestId} onValueChange={setSelectedTestId}>
                        <SelectTrigger className="w-full sm:w-[350px]">
                            <SelectValue placeholder="Select a weekly test..." />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredLiveTests.map(test => (
                                <SelectItem key={test.id} value={test.id}>
                                    {test.title} ({getFormattedDate(test.createdAt)})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {isLoading ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                filteredLiveTests.length > 0 && selectedTestId ? (
                    <LeaderboardTable data={leaderboardData} type="live" />
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        No results found for the selected Weekly Test in this category.
                    </div>
                )
            )}
        </div>
    );
}


export function LeaderboardClient({ initialTopicLeaderboards, initialMockTestLeaderboards, pastLiveTests }: LeaderboardClientProps) {
  const { userData } = useDashboard();
  const searchParams = useSearchParams();
  const liveTestIdFromUrl = searchParams.get('liveTestId');
  const initialTab = liveTestIdFromUrl ? "live" : "topic";

  const availableCategories = useMemo(() => {
    if (!userData) return [];
    if (userData.email && ADMIN_EMAILS.includes(userData.email)) return ['MTS', 'POSTMAN', 'PA'] as ExamCategory[];
    switch (userData.examCategory) {
        case 'PA':
            return ['PA', 'POSTMAN', 'MTS'] as ExamCategory[];
        case 'POSTMAN':
            return ['POSTMAN', 'MTS'] as ExamCategory[];
        case 'MTS':
            return ['MTS'] as ExamCategory[];
        default:
            return [];
    }
  }, [userData]);
  
  const [selectedCategory, setSelectedCategory] = useState<ExamCategory>(userData?.examCategory === 'IP' ? 'PA' : (userData?.examCategory || 'MTS'));
  
  useEffect(() => {
    if (userData?.examCategory && userData.examCategory !== 'IP') {
        setSelectedCategory(userData.examCategory);
    }
  }, [userData]);


  return (
    <Tabs defaultValue={initialTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="topic">Topic-wise</TabsTrigger>
        <TabsTrigger value="mock">Syllabus Mock</TabsTrigger>
        <TabsTrigger value="live">Weekly Test</TabsTrigger>
      </TabsList>
      <TabsContent value="topic">
        <Card>
          <CardHeader>
            <CardTitle>Topic-wise Leaderboard</CardTitle>
            <CardDescription>Ranking based on average scores from all topic-wise quizzes. Only users who have completed more than six exams are included.</CardDescription>
          </CardHeader>
          <CardContent>
            <CategorySelector selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} availableCategories={availableCategories} />
            <LeaderboardTable data={initialTopicLeaderboards[selectedCategory]} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="mock">
        <Card>
          <CardHeader>
            <CardTitle>Mock Test Leaderboard</CardTitle>
            <CardDescription>Ranking based on average scores from all syllabus-wise mock tests. Only users who have completed more than six exams are included.</CardDescription>
          </CardHeader>
          <CardContent>
             <CategorySelector selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} availableCategories={availableCategories} />
            <LeaderboardTable data={initialMockTestLeaderboards[selectedCategory]} />
          </CardContent>
        </Card>
      </TabsContent>
       <TabsContent value="live">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Test Leaderboard</CardTitle>
            <CardDescription>View rankings for our permanent weekly challenges. Ranks are determined by percentage score, then by time taken.</CardDescription>
          </CardHeader>
          <CardContent>
             {pastLiveTests.length > 0 ? (
                <WeeklyTestLeaderboard 
                    pastLiveTests={pastLiveTests} 
                    initialTestId={liveTestIdFromUrl ?? undefined}
                    availableCategories={['All', ...availableCategories]}
                    defaultCategory={userData?.examCategory === 'IP' ? 'PA' : (userData?.examCategory || 'MTS')}
                />
             ) : (
                <div className="text-center text-muted-foreground py-10">
                    No weekly tests have been completed yet.
                </div>
             )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}