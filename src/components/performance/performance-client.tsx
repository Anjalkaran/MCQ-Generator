
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { MCQHistory, TopicPerformance } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';
import { 
  Lightbulb, 
  CheckCircle2, 
  TrendingUp, 
  Target, 
  Clock, 
  History,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format } from 'date-fns';

interface PerformanceClientProps {
  history: MCQHistory[];
}

const getPerformanceTier = (average: number): { label: string; className: string; color: string } => {
  if (average >= 80) return { label: 'Excellent', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300', color: '#22c55e' };
  if (average >= 60) return { label: 'Good', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300', color: '#3b82f6' };
  if (average >= 40) return { label: 'Average', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300', color: '#eab308' };
  return { label: 'Needs Improvement', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300', color: '#ef4444' };
};

export function PerformanceClient({ history }: PerformanceClientProps) {
  // 1. Calculate Summary Stats
  const stats = useMemo(() => {
    if (history.length === 0) return null;

    const totalExams = history.length;
    const totalScore = history.reduce((acc, h) => acc + h.score, 0);
    const totalQuestions = history.reduce((acc, h) => acc + h.totalQuestions, 0);
    const avgScore = (totalScore / totalQuestions) * 100;

    // Last 5 exams average vs previous 5
    const latest5 = history.slice(0, 5);
    const prev5 = history.slice(5, 10);
    
    const latestAvg = latest5.length > 0 
      ? (latest5.reduce((acc, h) => acc + h.score, 0) / latest5.reduce((acc, h) => acc + h.totalQuestions, 0)) * 100 
      : 0;
    
    const prevAvg = prev5.length > 0 
      ? (prev5.reduce((acc, h) => acc + h.score, 0) / prev5.reduce((acc, h) => acc + h.totalQuestions, 0)) * 100 
      : latestAvg;

    const trend = latestAvg - prevAvg;

    return {
      totalExams,
      avgScore,
      totalQuestions,
      latestAvg,
      trend
    };
  }, [history]);

  // 2. Prepare Trend Data (Last 15 tests)
  const trendData = useMemo(() => {
    return [...history]
      .reverse() // Oldest first for the chart
      .slice(-15)
      .map((h, index) => ({
        name: `Test ${history.length - 15 + index + 1}`,
        score: Math.round((h.score / h.totalQuestions) * 100),
        date: format(h.takenAt, 'MMM dd'),
      }));
  }, [history]);

  // 3. Prepare Topic Breakdown
  const topicData = useMemo(() => {
    const map = new Map<string, { totalScore: number; totalQuestions: number; attempts: number; title: string }>();
    
    history.forEach(h => {
      const topicId = h.topicId || 'mock';
      const existing = map.get(topicId) || { totalScore: 0, totalQuestions: 0, attempts: 0, title: h.topicTitle || 'Mock Test' };
      existing.totalScore += h.score;
      existing.totalQuestions += h.totalQuestions;
      existing.attempts += 1;
      map.set(topicId, existing);
    });

    return Array.from(map.values())
      .map(d => ({
        topic: d.title,
        score: Math.round((d.totalScore / d.totalQuestions) * 100),
        attempts: d.attempts
      }))
      .sort((a, b) => b.score - a.score);
  }, [history]);

  const topicsToImprove = useMemo(() => {
    return topicData
      .filter(item => item.score < 60)
      .slice(0, 3);
  }, [topicData]);

  if (history.length === 0) {
    return (
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <History className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-xl font-semibold mb-2">No Performance History Yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Complete your first exam to see 
            a detailed analysis of your strengths and weaknesses.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Total Exams
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{stats?.totalExams}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Across all categories & topics
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/5 to-transparent border-green-500/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" /> Average Score
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{stats?.avgScore.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs">
              {(stats?.trend || 0) >= 0 ? (
                <span className="text-green-500 flex items-center font-bold">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  {stats?.trend.toFixed(1)}%
                </span>
              ) : (
                <span className="text-red-500 flex items-center font-bold">
                  <ArrowDownRight className="w-3 h-3 mr-0.5" />
                  {Math.abs(stats?.trend || 0).toFixed(1)}%
                </span>
              )}
              <span className="text-muted-foreground">from previous tests</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" /> Accuracy
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{stats?.latestAvg.toFixed(0)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={stats?.latestAvg} className="h-1.5 mt-1" />
            <div className="text-xs text-muted-foreground mt-2">
              Based on last 5 tests
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/5 to-transparent border-orange-500/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-orange-500" /> Qns Answered
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{stats?.totalQuestions}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Cumulative total practice
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Performance Trend
            </CardTitle>
            <CardDescription>Progression of your percentage scores over the last 15 attempts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`${value}%`, 'Score']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Focus Areas */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" /> Study Recommendations
            </CardTitle>
            <CardDescription>Based on your recent scores, focus on these topics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topicsToImprove.length > 0 ? (
              topicsToImprove.map(topic => (
                <div key={topic.topic} className="space-y-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium truncate max-w-[150px]">{topic.topic}</span>
                    <span className="text-red-500 font-bold">{topic.score}%</span>
                  </div>
                  <Progress value={topic.score} className="h-1.5 bg-red-100 dark:bg-red-950" indicatorClassName="bg-red-500" />
                </div>
              ))
            ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
                    <p className="font-medium">Excellent Work!</p>
                    <p className="text-xs text-muted-foreground mt-1">You are maintaining high scores across all topics.</p>
                </div>
            )}
            
            <div className="pt-4 border-t border-primary/10 mt-4">
                <p className="text-xs text-muted-foreground italic">
                    "Consistent practice in weak areas is the fastest way to improve your overall rank."
                </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topic Mastery breakdown */}
      <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> Topic Mastery
            </CardTitle>
            <CardDescription>Distribution of your performance across various exam topics.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topicData} layout="vertical" margin={{ left: 50, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis 
                            dataKey="topic" 
                            type="category" 
                            width={120}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.7 }}
                        />
                        <Tooltip 
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            formatter={(value) => [`${value}%`, 'Average Score']}
                        />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                            {topicData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getPerformanceTier(entry.score).color} fillOpacity={0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </CardContent>
      </Card>

      {/* Detailed Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Comprehensive Topic Analysis</CardTitle>
          <CardDescription>Detailed breakdown of every topic you've attempted.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="rounded-xl border overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[300px]">Topic</TableHead>
                            <TableHead className="text-center">Attempts</TableHead>
                            <TableHead className="text-center">Avg. Score</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {topicData.map((item) => {
                            const tier = getPerformanceTier(item.score);
                            return (
                                <TableRow key={item.topic} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-semibold">{item.topic}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="font-normal">{item.attempts} times</Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="font-bold text-base">{item.score}%</span>
                                            <Progress value={item.score} className="h-1 w-16" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="outline" className={cn("border font-medium px-2.5 py-0.5", tier.className)}>
                                            {tier.label}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
