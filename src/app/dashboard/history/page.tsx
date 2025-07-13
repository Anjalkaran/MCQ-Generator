
"use client";

import { useState, useEffect } from 'react';
import { getFirebaseAuth } from '@/lib/firebase';
import { getExamHistoryForUser } from '@/lib/firestore';
import { HistoryClient } from '@/components/history/history-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import type { MCQHistory } from '@/lib/types';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

export default function HistoryPage() {
  const [history, setHistory] = useState<MCQHistory[]>([]);
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
        const examHistory = await getExamHistoryForUser(currentUser.uid);
        setHistory(examHistory);
      } else {
        setUser(null);
        setHistory([]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold mb-4">Exam History</h1>
            <Card>
                <CardHeader>
                <CardTitle>Your Past Exams</CardTitle>
                 <CardDescription>A list of all the exams you have taken.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4">Loading your exam history...</p>
                </CardContent>
            </Card>
      </div>
    );
  }
  
  if (!user) {
    return (
       <div className="space-y-6">
            <h1 className="text-2xl font-bold mb-4">Exam History</h1>
            <Card>
                <CardHeader>
                <CardTitle>Your Past Exams</CardTitle>
                 <CardDescription>A list of all the exams you have taken.</CardDescription>
                </CardHeader>
                <CardContent>
                <p>Please log in to view your exam history.</p>
                </CardContent>
            </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exam History</h1>
      </div>
      <HistoryClient initialHistory={history} />
    </div>
  );
}
