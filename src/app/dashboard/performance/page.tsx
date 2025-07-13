
"use client";

import { useState, useEffect } from 'react';
import { getFirebaseAuth } from '@/lib/firebase';
import { getPerformanceByTopic } from '@/lib/firestore';
import { PerformanceClient } from '@/components/performance/performance-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import type { TopicPerformance } from '@/lib/types';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

export default function PerformancePage() {
  const [performanceData, setPerformanceData] = useState<TopicPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
        setIsLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const data = await getPerformanceByTopic(currentUser.uid);
        setPerformanceData(data);
      } else {
        setUser(null);
        setPerformanceData([]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
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
                    <p className="ml-4">Loading your performance data...</p>
                </CardContent>
            </Card>
      </div>
    );
  }
  
  if (!user) {
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
