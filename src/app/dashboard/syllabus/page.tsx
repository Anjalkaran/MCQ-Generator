"use client";

import React from 'react';
import { SyllabusExplorer } from '@/components/dashboard/syllabus-explorer';
import { useDashboard } from '@/context/dashboard-context';
import { BookOpen, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { ADMIN_EMAILS } from '@/lib/constants';

function SyllabusContent({ userData, isAdmin }: { userData: any; isAdmin: boolean }) {
  const searchParams = useSearchParams();
  const queryCategory = searchParams.get('category');
  let examCategory = queryCategory || userData?.examCategory || 'MTS';

  // Protection logic: Ensure users can only view syllabi for their group
  const subCat = userData?.examCategory || 'MTS';
  const isProfessionalGroup = subCat === 'IP' || subCat === 'GROUP B';
  const isGeneralGroup = subCat === 'MTS' || subCat === 'POSTMAN' || subCat === 'PA';
  
  const isTargetProfessional = examCategory === 'IP' || examCategory === 'GROUP B';
  const isTargetGeneral = examCategory === 'MTS' || examCategory === 'POSTMAN' || examCategory === 'PA';

  const isAllowed = isAdmin || (isProfessionalGroup && isTargetProfessional) || (isGeneralGroup && isTargetGeneral);

  if (!isAllowed) {
    // If not allowed, fallback to their authorized default category
    examCategory = subCat;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 lg:text-4xl">
            Syllabus wise test
          </h1>
        </div>
      </div>

      <SyllabusExplorer examCategory={examCategory} isAdmin={isAdmin} />
    </div>
  );
}

export default function SyllabusPage() {
  const { userData, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
          <p className="text-slate-500 animate-pulse">Loading Syllabus...</p>
        </div>
      </div>
    );
  }

  const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;

  return (
    <React.Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>}>
      <SyllabusContent userData={userData} isAdmin={isAdmin} />
    </React.Suspense>
  );
}
