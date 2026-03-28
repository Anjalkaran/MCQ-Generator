
"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, PenSquare, Video, History, FileWarning, BrainCircuit, Library, CalendarCheck } from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ADMIN_EMAILS } from "@/lib/constants";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


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

  const isIPUser = userData.examCategory === 'IP';
  
  if (isIPUser) {
    // Add a small badge or note that they are in the IP track if needed, 
    // but the main dashboard cards should be regular.
  }

  return (
    <div className="space-y-6">
       <div className="space-y-2 text-center pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Select an option to get started.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col border-primary/20 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                <CalendarCheck className="h-8 w-8 text-primary group-hover:text-white" />
              </div>
              <CardTitle className="text-2xl">Weekly Test</CardTitle>
            </div>
            <CardDescription className="pt-4 text-base">
              Access the latest full-length mock tests released every week for permanent practice.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full shadow-md group-hover:shadow-lg transition-all">
              <Link href="/dashboard/weekly-test">View Weekly Tests</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="flex flex-col border-border/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary transition-colors duration-300">
                <PenSquare className="h-8 w-8 text-primary group-hover:text-white" />
              </div>
              <CardTitle className="text-2xl">Practice Exams</CardTitle>
            </div>
            <CardDescription className="pt-4 text-base">
              Access other exam types including syllabus mock tests, practice MCQs, and reasoning tests.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full shadow-md group-hover:shadow-lg transition-all">
              <Link href="/dashboard/online-test">Go to Practice</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="flex flex-col border-border/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary transition-colors duration-300">
                <Video className="h-8 w-8 text-primary group-hover:text-white" />
              </div>
              <CardTitle className="text-2xl">Video Classes</CardTitle>
            </div>
            <CardDescription className="pt-4 text-base">
              Access recorded video classes for comprehensive learning and expert guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full shadow-md group-hover:shadow-lg transition-all">
                <Link href="/dashboard/video-classes">Watch Videos</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="flex flex-col border-border/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary transition-colors duration-300">
                <Library className="h-8 w-8 text-primary group-hover:text-white" />
              </div>
              <CardTitle className="text-2xl">Study Material</CardTitle>
            </div>
            <CardDescription className="pt-4 text-base">
              View and read study materials, notes, and documents for your exam preparation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full shadow-md group-hover:shadow-lg transition-all">
                <Link href="/dashboard/study-material">View Materials</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
