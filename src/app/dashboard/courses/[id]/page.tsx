
"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PenSquare, Video, BrainCircuit, Library, CalendarCheck, ArrowLeft, Clock, History, BookOpen } from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { ADMIN_EMAILS } from "@/lib/constants";
import { FadeIn } from '@/components/animations/motion-wrapper';

export default function CourseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, userData, isLoading } = useDashboard();
  const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Authentication Required</h1>
        <Button onClick={() => router.push('/auth/login')} className="mt-4">Go to Login</Button>
      </div>
    );
  }

  // Course ID from URL - Decode it to handle spaces like %20
  const courseId = id ? decodeURIComponent(id as string) : "";

  // Protection Check: Ensure users can only access courses in their allowed group
  const subCat = userData.examCategory || 'MTS';
  const isProfessionalGroup = subCat === 'IP' || subCat === 'GROUP B';
  const isGeneralGroup = subCat === 'MTS' || subCat === 'POSTMAN' || subCat === 'PA';
  
  const isTargetProfessional = courseId === 'IP' || courseId === 'GROUP B';
  const isTargetGeneral = courseId === 'MTS' || courseId === 'POSTMAN' || courseId === 'PA';

  const isAllowed = isAdmin || (isProfessionalGroup && isTargetProfessional) || (isGeneralGroup && isTargetGeneral);

  if (!isAllowed) {
    // If not allowed, redirect to dashboard or their default course
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button 
        variant="ghost" 
        onClick={() => router.push('/dashboard')}
        className="mb-4 flex items-center gap-2 text-slate-600 hover:text-red-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="space-y-4 text-center py-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          <span className="text-red-600">{courseId}</span> Preparation
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          Access your personalized study materials, practice exams, and video classes for the {courseId} track.
        </p>
      </div>

      <FadeIn>
        <div className="mt-12 space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-900">
              Quick Access Hub
            </h2>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
              <Card className="hover:shadow-lg transition-shadow border-red-200 bg-red-50/10">
                <Link href="/dashboard/study-planner" className="block p-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-100">
                    <CalendarCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Study Planner</h3>
                    <p className="text-sm text-slate-500">Your personalized 30-180 day plan</p>
                  </div>
                </Link>
              </Card>

            <Card className="hover:shadow-lg transition-shadow border-slate-200">
              <Link href={`/dashboard/syllabus?category=${courseId}`} className="block p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <BookOpen className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Syllabus wise test</h3>
                  <p className="text-sm text-slate-500">View blueprints and breakdown</p>
                </div>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-slate-200">
              <Link href="/dashboard/daily-test" className="block p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Daily Test</h3>
                  <p className="text-sm text-slate-500">Daily practice quiz to maintain consistency</p>
                </div>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-slate-200">
              <Link href="/dashboard/weekly-test" className="block p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <CalendarCheck className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Weekly Test</h3>
                  <p className="text-sm text-slate-500">Scheduled assessments to track progress</p>
                </div>
              </Link>
            </Card>

            <Card className="hidden hover:shadow-lg transition-shadow border-slate-200">
              <Link href="/dashboard/online-test" className="block p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
                  <PenSquare className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Topic Wise MCQ Test</h3>
                  <p className="text-sm text-slate-500">Subject-focused tests for thorough practice</p>
                </div>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-slate-200">
              <Link href="/dashboard/video-classes" className="block p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-cyan-50 rounded-full flex items-center justify-center mx-auto">
                  <Video className="h-6 w-6 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Video Classes</h3>
                  <p className="text-sm text-slate-500">Expert-led lessons for all topics</p>
                </div>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-slate-200">
              <Link href="/dashboard/mock-test/previous-year" className="block p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <History className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Previous Year Paper</h3>
                  <p className="text-sm text-slate-500">Practice with actual past exam questions</p>
                </div>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-slate-200">
              <Link href="/dashboard/study-material" className="block p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto">
                  <Library className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Study Material</h3>
                  <p className="text-sm text-slate-500">Comprehensive PDFs and study guides</p>
                </div>
              </Link>
            </Card>

          </div>
        </div>
      </FadeIn>
    </div>
  );
}
