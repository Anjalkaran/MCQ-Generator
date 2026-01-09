
"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, PenSquare, Video, Rss, History, FileWarning, BrainCircuit, Library } from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UpcomingLiveTest } from "@/components/dashboard/upcoming-live-test";
import { ADMIN_EMAILS } from "@/lib/constants";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AptiSolveIcon } from "@/components/icons/aptisolve-icon";


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

  if (userData.examCategory === 'IP') {
    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center pt-4">
                <h1 className="text-3xl font-bold tracking-tight">Inspector Posts Dashboard</h1>
                <p className="text-muted-foreground">Select a paper to start your practice session.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="flex flex-col">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-full">
                                <PenSquare className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">Paper I</CardTitle>
                        </div>
                        <CardDescription className="pt-4">
                            Practice MCQs and generate full mock tests for Paper I.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-end">
                        <Button asChild className="w-full">
                            <Link href="/dashboard/online-test?paper=Paper-I">Start Practice</Link>
                        </Button>
                    </CardContent>
                </Card>
                 <Card className="flex flex-col">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-full">
                                <FileWarning className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">Paper II</CardTitle>
                        </div>
                        <CardDescription className="pt-4">
                           Paper II is a descriptive test (Noting & Drafting). This app only supports MCQ practice.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-end">
                       <Button disabled className="w-full">MCQ Not Applicable</Button>
                    </CardContent>
                </Card>
                 <Card className="flex flex-col">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-full">
                                <PenSquare className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">Paper III</CardTitle>
                        </div>
                        <CardDescription className="pt-4">
                            Practice MCQs and generate full mock tests for Paper III.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-end">
                        <Button asChild className="w-full">
                            <Link href="/dashboard/online-test?paper=Paper-III">Start Practice</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="space-y-2 text-center pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Select an option to get started.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isAdmin && (
            <Card className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Rss className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Live Mock Test</CardTitle>
                </div>
                <CardDescription className="pt-4">
                  <UpcomingLiveTest />
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-end">
                <Button asChild className="w-full">
                  <Link href="/dashboard/live-mock-test">View All Tests</Link>
                </Button>
              </CardContent>
            </Card>
        )}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <PenSquare className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Practice Exams</CardTitle>
            </div>
            <CardDescription className="pt-4">
              Access other exam types including syllabus mock tests, practice MCQs, and reasoning tests.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full">
              <Link href="/dashboard/online-test">Go to Practice</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Video Classes</CardTitle>
            </div>
            <CardDescription className="pt-4">
              Access recorded video classes for comprehensive learning and expert guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full">
                <Link href="/dashboard/video-classes">Watch Videos</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Library className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Study Material</CardTitle>
            </div>
            <CardDescription className="pt-4">
              View and read study materials, notes, and documents for your exam preparation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full">
                <Link href="/dashboard/study-material">View Materials</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <AptiSolveIcon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">AptiSolve</CardTitle>
                </div>
                <CardDescription className="pt-4">
                    Practice aptitude questions with our dedicated AptiSolve application.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
                <Button asChild className="w-full">
                    <a href="https://aptisolve-582671064856.us-west1.run.app/" target="_blank" rel="noopener noreferrer">
                        Launch AptiSolve
                    </a>
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
