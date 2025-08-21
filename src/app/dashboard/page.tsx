
"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, BookOpen, PenSquare, Video, Sparkles } from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";

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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Select an option to get started.</p>
      </div>

      <Marquee>
        <div className="flex items-center gap-2 px-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold">New Feature:</span>
          <span>General Knowledge Test has been added! You can access it now from the "Online Tests" section.</span>
        </div>
      </Marquee>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col border-primary border-2 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <PenSquare className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Online Tests</CardTitle>
            </div>
            <CardDescription className="pt-4">
              Access all exam types including live tests, mock tests, practice MCQs, and reasoning tests.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full">
              <Link href="/dashboard/online-test">Go to Tests</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Study Material</CardTitle>
            </div>
            <CardDescription className="pt-4">
              Read and review study materials for various topics to strengthen your preparation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full">
              <Link href="/dashboard/study-material">View Materials</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-dashed bg-muted/50">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-muted p-3 rounded-full">
                <Video className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl text-muted-foreground">Video Classes</CardTitle>
            </div>
            <CardDescription className="pt-4">
              Access recorded video classes for comprehensive learning and expert guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button disabled className="w-full">
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
