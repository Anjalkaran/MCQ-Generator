"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, BookCopy, FileText, Rss, Globe, PenSquare, Brain } from 'lucide-react';
import { NewLogoIcon } from '@/components/icons/new-logo-icon';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ADMIN_EMAILS } from '@/lib/constants';
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

import { FadeIn, SlideUp } from '@/components/animations/motion-wrapper';

function OnlineTestContent() {
  const { user, userData, isLoading } = useDashboard();
  const searchParams = useSearchParams();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-red-600" />
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md w-full border-red-100">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-900">Authentication Required</CardTitle>
            <CardDescription>Please log in to access your dashboard and create exams.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button asChild className="bg-red-600 hover:bg-red-700">
              <Link href="/auth/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = userData.email ? ADMIN_EMAILS.includes(userData.email) : false;
  const isIPUser = userData.examCategory === 'IP';
  const canSeeReasoning = isAdmin || userData.examCategory === 'PA' || userData.examCategory === 'POSTMAN' || isIPUser;


  const testTypes = [
    {
      title: "Practice MCQ",
      description: isIPUser 
        ? "Create a custom exam by selecting topics from Paper I or Paper III. Ideal for focused practice."
        : "Create a custom exam by selecting a specific topic or syllabus part. Ideal for focused practice on theoretical subjects.",
      icon: <BookCopy className="h-8 w-8" />,
      link: "/dashboard/topic-wise-mcq",
      buttonText: "Create Practice Exam",
      color: "from-blue-500/10 to-cyan-500/10",
      accent: "text-blue-600",
      buttonBg: "bg-blue-600 hover:bg-blue-700",
      show: true
    },
    {
      title: "Reasoning Test",
      description: "Practice image-based questions by selecting a topic from the reasoning question bank. Perfect for honing analytical skills.",
      icon: <Brain className="h-8 w-8" />,
      link: "/dashboard/reasoning-test",
      buttonText: "Start Reasoning Test",
      color: "from-orange-500/10 to-amber-500/10",
      accent: "text-orange-600",
      buttonBg: "bg-orange-600 hover:bg-orange-700",
      show: canSeeReasoning
    },
    {
      title: "Syllabus Mock Test",
      description: "Generate a full-length mock test that simulates the real exam, based on the official blueprint for your category.",
      icon: <FileText className="h-8 w-8" />,
      link: "/dashboard/mock-test",
      buttonText: "Generate Mock Test",
      color: "from-red-500/10 to-rose-500/10",
      accent: "text-red-600",
      buttonBg: "bg-red-600 hover:bg-red-700",
      show: true
    },
    {
      title: "General Awareness",
      description: "Test your knowledge on current affairs, civics, geography, and more with an AI-generated quiz track.",
      icon: <Globe className="h-8 w-8" />,
      link: "/dashboard/general-awareness-test",
      buttonText: "Create G.K. Test",
      color: "from-purple-500/10 to-indigo-500/10",
      accent: "text-purple-600",
      buttonBg: "bg-purple-600 hover:bg-purple-700",
      show: true
    }
  ].filter(t => t.show);

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 py-8">
      <FadeIn>
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Create Your <span className="text-red-600">Exam</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            Select the type of practice session you'd like to begin. Each mode is designed to strengthen specific skills.
          </p>
        </div>
      </FadeIn>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {testTypes.map((test, index) => (
          <SlideUp key={test.title} delay={index * 0.1}>
            <Card className="group relative flex flex-col h-full overflow-hidden border-slate-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
              <div className={`h-24 bg-gradient-to-br ${test.color} flex items-center justify-center transition-transform duration-500 group-hover:scale-105`}>
                <div className={`${test.accent} transform group-hover:scale-110 transition-transform duration-500`}>
                  {test.icon}
                </div>
              </div>
              
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-slate-900">{test.title}</CardTitle>
              </CardHeader>
              
              <CardContent className="flex-grow flex flex-col">
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  {test.description}
                </p>
                
                <div className="mt-auto">
                  <Button asChild className={cn(
                    "w-full font-bold h-11 transition-all text-white",
                    test.buttonBg
                  )}>
                    <Link href={test.link}>{test.buttonText}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </SlideUp>
        ))}
      </div>
    </div>
  );
}

export default function OnlineTestPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-red-600" />
      </div>
    }>
      <OnlineTestContent />
    </Suspense>
  );
}
