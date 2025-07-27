
"use client";

import { useState, useEffect } from 'react';
import { useDashboard } from "@/app/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, BookCopy, FileText, Rss } from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Create Your Exam</h1>
        <p className="text-muted-foreground">Choose an exam type to get started.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col border-primary border-2 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Rss className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <CardTitle>Live Mock Test</CardTitle>
            </div>
            <CardDescription className="pt-4">
              Participate in scheduled live tests that simulate real exam conditions, or practice with past live tests.
            </CardDescription>
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
