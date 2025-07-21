
"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { LeaderboardEntry } from '@/lib/types';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardClientProps {
  initialTopicLeaderboard: LeaderboardEntry[];
  initialMockTestLeaderboard: LeaderboardEntry[];
}

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
            <TableHead className="text-center">Exam Category</TableHead>
            <TableHead className="text-center">Exams Taken</TableHead>
            <TableHead className="text-right">Average Score</TableHead>
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
              <TableCell className="text-center">
                <Badge variant="outline">{entry.examCategory}</Badge>
              </TableCell>
              <TableCell className="text-center">{entry.totalExams}</TableCell>
              <TableCell className="text-right font-semibold">{entry.averageScore.toFixed(2)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function LeaderboardClient({ initialTopicLeaderboard, initialMockTestLeaderboard }: LeaderboardClientProps) {
  return (
    <Tabs defaultValue="topic" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="topic">Topic-wise Performance</TabsTrigger>
        <TabsTrigger value="mock">Mock Test Performance</TabsTrigger>
      </TabsList>
      <TabsContent value="topic">
        <Card>
          <CardHeader>
            <CardTitle>Topic-wise Leaderboard</CardTitle>
            <CardDescription>Ranking based on average scores from all topic-wise quizzes.</CardDescription>
          </CardHeader>
          <CardContent>
            <LeaderboardTable data={initialTopicLeaderboard} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="mock">
        <Card>
          <CardHeader>
            <CardTitle>Mock Test Leaderboard</CardTitle>
            <CardDescription>Ranking based on average scores from all mock tests.</CardDescription>
          </CardHeader>
          <CardContent>
            <LeaderboardTable data={initialMockTestLeaderboard} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
