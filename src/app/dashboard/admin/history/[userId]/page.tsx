"use client";

import { useState, useEffect, use } from 'react';
import { getExamHistoryForUser, getUserData } from '@/lib/firestore';
import { HistoryClient } from '@/components/history/history-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import type { MCQHistory, UserData } from '@/lib/types';

export default function UserHistoryPage(props: { params: Promise<{ userId: string }> }) {
  const params = use(props.params);
  const userId = params.userId;
  
  const [isLoading, setIsLoading] = useState(true);
  const [examHistory, setExamHistory] = useState<MCQHistory[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [history, user] = await Promise.all([
          getExamHistoryForUser(userId),
          getUserData(userId)
        ]);
        setExamHistory(history);
        setUserData(user);
      } catch (error) {
        console.error("Failed to load user history:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center flex-col gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading User History...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/admin">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Admin Panel
          </Link>
         </Button>
        <div className="text-center py-12 text-muted-foreground">User not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/admin">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Admin Panel
          </Link>
         </Button>
      <h1 className="text-2xl font-bold mb-4">Exam History for: <span className="text-primary">{userData.name}</span></h1>
      <HistoryClient initialHistory={examHistory} />
    </div>
  );
}
