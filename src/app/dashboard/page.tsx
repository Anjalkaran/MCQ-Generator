
"use client";

import { useState, useEffect } from 'react';
import { useDashboard } from "@/app/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, BookCopy, FileText, Rss, BrainCircuit } from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getLiveTests } from '@/lib/firestore';
import type { LiveTest } from '@/lib/types';
import { normalizeDate } from '@/lib/utils';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ADMIN_EMAILS } from '@/lib/constants';

function UpcomingLiveTest() {
    const [upcomingTest, setUpcomingTest] = useState<LiveTest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState('');

    useEffect(() => {
        const fetchAndSetTests = async () => {
            try {
                const allTests = await getLiveTests(true); // Fetch all tests
                const now = new Date();
                const nextTest = allTests
                    .filter(test => normalizeDate(test.endTime)! > now)
                    .sort((a, b) => normalizeDate(a.startTime)!.getTime() - normalizeDate(b.startTime)!.getTime())[0];
                
                setUpcomingTest(nextTest || null);
            } catch (error) {
                console.error("Failed to fetch live tests for dashboard:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAndSetTests();
    }, []);

    useEffect(() => {
        if (!upcomingTest) return;

        const startTime = normalizeDate(upcomingTest.startTime);
        if (!startTime) return;

        const interval = setInterval(() => {
            const now = new Date();
            const distance = startTime.getTime() - now.getTime();

            if (distance > 0) {
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                let countdownString = '';
                if (days > 0) {
                    countdownString += `${days}d `;
                }
                countdownString += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                
                setTimeRemaining(countdownString);
            } else {
                setTimeRemaining('Live Now!');
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [upcomingTest]);

    if (isLoading) {
        return <Skeleton className="h-10 w-full" />;
    }

    if (!upcomingTest) {
        return (
             <CardDescription className="pt-4">
                MTS, PM, and PA Mock Test. Participate in scheduled live tests that simulate real exam conditions.
            </CardDescription>
        );
    }
    
    const startTime = normalizeDate(upcomingTest.startTime);

    return (
        <div className="pt-4 text-center">
            <p className="font-bold text-base text-primary">{upcomingTest.title}</p>
            {startTime && <p className="text-sm text-muted-foreground">{format(startTime, 'dd/MM/yyyy p')}</p>}
            <p className="text-lg font-semibold mt-2 tabular-nums tracking-wider">{timeRemaining}</p>
        </div>
    )
}

export default function DashboardPage() {
  const { user, userData, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You must be logged in to access this page.</p>
        </CardContent>
      </Card>
    );
  }

  const isAdmin = userData.email ? ADMIN_EMAILS.includes(userData.email) : false;
  const canSeeReasoning = isAdmin || userData.examCategory === 'PA' || userData.examCategory === 'POSTMAN';

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Create Your Exam</h1>
        <p className="text-muted-foreground">Choose an exam type to get started.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card className="flex flex-col border-primary border-2 shadow-lg md:col-span-1 lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Rss className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <CardTitle>Live Mock Test</CardTitle>
            </div>
            <UpcomingLiveTest />
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full">
              <Link href="/dashboard/live-mock-test">View Live Tests</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <BookCopy className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Practice MCQ</CardTitle>
            </div>
            <CardDescription className="pt-4">
              Create a custom exam by selecting a specific topic or syllabus part. Ideal for focused practice on theoretical subjects.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full">
              <Link href="/dashboard/topic-wise-mcq">Create Practice Exam</Link>
            </Button>
          </CardContent>
        </Card>

        {canSeeReasoning && (
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <BrainCircuit className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Image Base Reasoning Test</CardTitle>
              </div>
              <CardDescription className="pt-4">
                Practice image-based questions by selecting a topic from the reasoning question bank. Perfect for honing analytical skills.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Button asChild className="w-full">
                <Link href="/dashboard/reasoning-test">Create Reasoning Test</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Practice Mock Test</CardTitle>
            </div>
            <CardDescription className="pt-4">
              Generate a full-length mock test that simulates the real exam, based on the official blueprint for your selected category.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full">
              <Link href="/dashboard/mock-test">Generate Mock Test</Link>
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
