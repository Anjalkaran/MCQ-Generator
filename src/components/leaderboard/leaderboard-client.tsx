"use client";

import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LeaderboardEntry, UserData, LiveTest } from '@/lib/types';
import { Trophy, Clock, Loader2, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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


function TopThreeHighlights({ data, type = 'general' }: { data: LeaderboardEntry[], type?: 'general' | 'live' }) {
    const topThree = data.slice(0, 3);
    if (topThree.length === 0) return null;

    // Reorder to 2, 1, 3 for podium effect
    const podium = [
        topThree[1] || null,
        topThree[0],
        topThree[2] || null
    ].filter(Boolean) as (LeaderboardEntry | null)[];

    return (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8 items-end">
            {podium.map((entry, idx) => {
                if (!entry) return <div key={`empty-${idx}`} />;
                const isFirst = entry.rank === 1;
                const isSecond = entry.rank === 2;
                const isThird = entry.rank === 3;

                return (
                    <div key={entry.userId} className={cn(
                        "flex flex-col items-center p-3 sm:p-6 rounded-2xl transition-all duration-300",
                        isFirst ? "bg-gradient-to-b from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-400 scale-105 z-10 shadow-lg" : 
                        isSecond ? "bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700" :
                        "bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
                    )}>
                        <div className="relative mb-2">
                            <div className={cn(
                                "w-10 h-10 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-xl sm:text-2xl shadow-inner",
                                isFirst ? "bg-yellow-400 text-yellow-900" :
                                isSecond ? "bg-slate-300 text-slate-700" :
                                "bg-amber-600/80 text-white"
                            )}>
                                {entry.userName.charAt(0)}
                            </div>
                            <div className="absolute -top-2 -right-2">
                                <Trophy className={cn(
                                    "h-5 w-5 sm:h-8 sm:w-8",
                                    isFirst ? "text-yellow-500" : isSecond ? "text-slate-400" : "text-amber-700"
                                )} />
                            </div>
                        </div>
                        <p className="font-bold text-center text-xs sm:text-sm line-clamp-1 truncate w-full">{entry.userName}</p>
                        <p className={cn(
                            "text-lg sm:text-2xl font-black mt-1",
                            isFirst ? "text-yellow-600" : "text-muted-foreground"
                        )}>
                            {type === 'general' ? `${entry.averageScore.toFixed(1)}%` : `${entry.score}/${entry.totalQuestions}`}
                        </p>
                        <Badge variant="outline" className={cn(
                            "mt-2 text-[10px] uppercase tracking-wider",
                            isFirst ? "bg-yellow-400/20 border-yellow-500/50" : ""
                        )}>Rank {entry.rank}</Badge>
                    </div>
                );
            })}
        </div>
    );
}

function LeaderboardTable({ data, type = 'general' }: { data: LeaderboardEntry[], type?: 'general' | 'live' }) {
  if (data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        No data available yet. Be the first one on the leaderboard!
      </div>
    );
  }

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-yellow-400/10 text-yellow-700 dark:bg-yellow-400/5 dark:text-yellow-500 font-bold";
    if (rank === 2) return "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 font-semibold";
    if (rank === 3) return "bg-amber-50 text-amber-700 dark:bg-amber-900/10 dark:text-amber-600 font-semibold";
    return "";
  }
  
  const formatDuration = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  return (
    <div className="space-y-4">
        {data.length >= 3 && <TopThreeHighlights data={data} type={type} />}
        <div className="border rounded-xl overflow-hidden bg-background">
        <Table>
            <TableHeader className="bg-muted/50">
            <TableRow>
                <TableHead className="w-20 text-center font-bold">Rank</TableHead>
                <TableHead>User Name</TableHead>
                {type === 'general' ? (
                    <>
                        <TableHead className="text-center">Tests</TableHead>
                        <TableHead className="text-right">Avg Score</TableHead>
                    </>
                ) : (
                    <>
                        <TableHead className="text-center">Correct</TableHead>
                        <TableHead className="text-right">Completion Time</TableHead>
                    </>
                )}
            </TableRow>
            </TableHeader>
            <TableBody>
            {data.map((entry) => (
                <TableRow key={entry.userId} className={cn("transition-colors hover:bg-muted/30", getRankStyle(entry.rank))}>
                <TableCell className="text-center py-4">
                    <span className="text-lg font-mono">#{entry.rank}</span>
                </TableCell>
                <TableCell>
                   <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {entry.userName.charAt(0)}
                        </div>
                        <span className="font-semibold">{entry.userName}</span>
                   </div>
                </TableCell>
                {type === 'general' ? (
                    <>
                        <TableCell className="text-center text-muted-foreground">{entry.totalExams}</TableCell>
                        <TableCell className="text-right font-black text-primary">{entry.averageScore.toFixed(2)}%</TableCell>
                    </>
                ) : (
                    <>
                        <TableCell className="text-center font-bold text-green-600 dark:text-green-400">{entry.score}/{entry.totalQuestions}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                {formatDuration(entry.durationInSeconds)}
                            </div>
                        </TableCell>
                    </>
                )}
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </div>
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
                return test.examCategories?.includes(selectedCategory);
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
    if (userData.email && ADMIN_EMAILS.includes(userData.email)) return ['MTS', 'POSTMAN', 'PA', 'IP'] as ExamCategory[];
    switch (userData.examCategory) {
        case 'IP':
            return ['IP'] as ExamCategory[];
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
  
  const [selectedCategory, setSelectedCategory] = useState<ExamCategory>(userData?.examCategory || 'MTS');
  
  useEffect(() => {
    if (userData?.examCategory) {
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
            <LeaderboardTable data={initialTopicLeaderboards[selectedCategory] || []} />
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
            <LeaderboardTable data={initialMockTestLeaderboards[selectedCategory] || []} />
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
                    defaultCategory={userData?.examCategory || 'MTS'}
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