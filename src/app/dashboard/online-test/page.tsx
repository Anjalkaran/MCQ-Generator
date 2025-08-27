
"use client";

import { useRef } from 'react';
import { useDashboard } from "@/app/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, BookCopy, FileText, Rss, History, Globe } from 'lucide-react';
import { NewLogoIcon } from '@/components/icons/new-logo-icon';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ADMIN_EMAILS } from '@/lib/constants';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { UpcomingLiveTest } from '@/components/dashboard/upcoming-live-test';


export default function OnlineTestPage() {
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
                  <NewLogoIcon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Reasoning Test</CardTitle>
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
              <CardTitle>Syllabus Mock Test</CardTitle>
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
        
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>General Awareness & Knowledge</CardTitle>
            </div>
            <CardDescription className="pt-4">
              Test your knowledge on current affairs, civics, geography, and more with an AI-generated quiz.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full">
              <Link href="/dashboard/general-awareness-test">Create G.K. Test</Link>
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
