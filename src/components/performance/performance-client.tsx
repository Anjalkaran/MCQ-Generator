
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { TopicPerformance } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Lightbulb, CheckCircle2 } from 'lucide-react';

interface PerformanceClientProps {
  initialPerformanceData: TopicPerformance[];
}

const getPerformanceTier = (average: number): { label: string; className: string } => {
  if (average >= 80) return { label: 'Excellent', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300' };
  if (average >= 60) return { label: 'Good', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300' };
  if (average >= 40) return { label: 'Average', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300' };
  return { label: 'Needs Improvement', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300' };
};

export function PerformanceClient({ initialPerformanceData }: PerformanceClientProps) {
  const [performanceData] = useState<TopicPerformance[]>(initialPerformanceData);

  const topicsToImprove = useMemo(() => {
    return performanceData
      .filter(item => item.averageScore < 60)
      .sort((a, b) => a.averageScore - b.averageScore);
  }, [performanceData]);

  return (
    <div className="space-y-6">
        {performanceData.length > 0 && (
            <Card>
                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                        {topicsToImprove.length > 0 ? <Lightbulb className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                    </div>
                    <div>
                        <CardTitle>Focus Areas</CardTitle>
                        <CardDescription>
                            {topicsToImprove.length > 0 
                                ? "Here are the topics we suggest you concentrate on."
                                : "Great job! You're performing well in all topics."
                            }
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {topicsToImprove.length > 0 ? (
                        <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                            {topicsToImprove.map(item => (
                                <li key={item.topicId}>
                                    <span className="font-semibold text-foreground">{item.topicTitle}</span> - Your average score is <span className="font-bold">{item.averageScore.toFixed(0)}%</span>.
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground">Keep up the great work and continue practicing to maintain your scores.</p>
                    )}
                </CardContent>
            </Card>
        )}
        <Card>
        <CardHeader>
            <CardTitle>Topic-wise Analysis</CardTitle>
            <CardDescription>An overview of your scores across different topics to identify your strengths and weaknesses.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="border rounded-md">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead className="text-center">Attempts</TableHead>
                    <TableHead className="text-center">Average Score</TableHead>
                    <TableHead className="text-center">Performance Level</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {performanceData.length > 0 ? (
                    performanceData.map((item) => {
                        const tier = getPerformanceTier(item.averageScore);
                        return (
                            <TableRow key={item.topicId}>
                                <TableCell className="font-medium">{item.topicTitle}</TableCell>
                                <TableCell className="text-center">{item.attempts}</TableCell>
                                <TableCell className="text-center font-semibold">{item.averageScore.toFixed(0)}%</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className={cn("border", tier.className)}>{tier.label}</Badge>
                                </TableCell>
                            </TableRow>
                        )
                    })
                ) : (
                    <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No performance data available. Take some exams to see your analysis.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>
        </CardContent>
        </Card>
    </div>
  );
}
