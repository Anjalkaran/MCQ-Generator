
"use client";

import { useState, useEffect } from 'react';
import { getPerformanceByTopic } from '@/lib/firestore';
import { PerformanceClient } from '@/components/performance/performance-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import type { TopicPerformance } from '@/lib/types';
import { useDashboard } from '@/app/dashboard/layout';
import { ADMIN_EMAILS } from '@/lib/constants';
import { useRouter } from 'next/navigation';

export default function PerformancePage() {
  const { user, userData, isLoading: isDashboardLoading } = useDashboard();
  const router = useRouter();
  const [performanceData, setPerformanceData] = useState<TopicPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isDashboardLoading) return;

    if (!user || !userData) {
        setIsLoading(false);
        return;
    }

    const isAdmin = ADMIN_EMAILS.includes(userData.email);
    if (!isAdmin) {
        router.push('/dashboard');
        return;
    }

    const fetchPerformance = async () => {
        try {
            const data = await getPerformanceByTopic(user.uid);
            setPerformanceData(data);
        } catch (error) {
            console.error("Failed to fetch performance data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchPerformance();
  }, [user, userData, isDashboardLoading, router]);

  if (isDashboardLoading || isLoading) {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold mb-4">Your Performance</h1>
            <Card>
                <CardHeader>
                <CardTitle>Topic-wise Analysis</CardTitle>
                 <CardDescription>An overview of your scores across different topics.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4">Loading performance data...</p>
                </CardContent>
            </Card>
      </div>
    );
  }
  
  if (!user || !userData) {
    return (
       <div className="space-y-6">
            <h1 className="text-2xl font-bold mb-4">Your Performance</h1>
            <Card>
                <CardHeader>
                <CardTitle>Topic-wise Analysis</CardTitle>
                 <CardDescription>An overview of your scores across different topics.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Please log in to view your performance data.</p>
                </CardContent>
            </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your Performance</h1>
      <PerformanceClient initialPerformanceData={performanceData} />
    </div>
  );
}
