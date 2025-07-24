
"use client";

import { useState, useEffect } from 'react';
import { useDashboard } from "@/app/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, BookCopy, FileText, Rss } from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LiveTestCard } from '@/components/dashboard/live-test-card';
import type { LiveTest } from '@/lib/types';
import { getLiveTests } from '@/lib/firestore';
import Script from 'next/script';

export default function DashboardPage() {
  const { user, userData, isLoading } = useDashboard();
  const [liveTests, setLiveTests] = useState<LiveTest[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
        setIsLoadingTests(true);
        try {
            const tests = await getLiveTests();
            setLiveTests(tests);
        } catch (error) {
            console.error("Failed to fetch live tests:", error);
        } finally {
            setIsLoadingTests(false);
        }
    };
    fetchTests();
  }, []);


  if (isLoading || isLoadingTests) {
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

  return (
    <>
        <Script 
            id="razorpay-checkout-js"
            src="https://checkout.razorpay.com/v1/checkout.js"
            strategy="lazyOnload"
        />
        <div className="space-y-6">
          {liveTests.length > 0 && (
            <div className="space-y-4">
               <div className="flex items-center gap-2">
                 <Rss className="h-6 w-6 text-primary animate-pulse" />
                 <h2 className="text-2xl font-bold tracking-tight">Upcoming Live Tests</h2>
               </div>
              {liveTests.map(test => <LiveTestCard key={test.id} test={test} />)}
            </div>
          )}

          <div className="space-y-2 text-center pt-4">
            <h1 className="text-3xl font-bold tracking-tight">Create Your Own Exam</h1>
            <p className="text-muted-foreground">Choose an exam type to get started.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <BookCopy className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>Topic-wise MCQ</CardTitle>
                    </div>
                    <CardDescription className="pt-4">
                        Create a custom exam by selecting a specific topic, difficulty, and number of questions. Ideal for focused practice.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex items-end">
                    <Button asChild className="w-full">
                        <Link href="/dashboard/topic-wise-mcq">Create Topic Exam</Link>
                    </Button>
                </CardContent>
            </Card>
            <Card className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>Mock Test</CardTitle>
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
    </>
  );
}
