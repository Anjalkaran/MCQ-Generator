"use client";

import React, { useMemo } from 'react';
import { BookOpen, FileText, PlayCircle, Loader2, ArrowRight, ChevronRight, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDashboard } from '@/context/dashboard-context';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TopicHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicName: string;
  examCategory: string;
  isAdmin?: boolean;
}

export function TopicHubModal({ isOpen, onClose, topicName, examCategory, isAdmin }: TopicHubModalProps) {
  const { topics, studyMaterials, isLoading } = useDashboard();

  const topicData = useMemo(() => {
    if (!topics) return null;
    // Find matching topic in Firestore
    return topics.find(t => 
      t.title.toLowerCase() === topicName.toLowerCase() && 
      t.examCategories.includes(examCategory as any)
    );
  }, [topics, topicName, examCategory]);

  const materials = useMemo(() => {
    if (!topicData || !studyMaterials) return [];
    return studyMaterials.filter(m => m.topicId === topicData.id);
  }, [topicData, studyMaterials]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl">
        <div className="relative h-32 bg-gradient-to-br from-red-600 to-red-900 border-b border-red-500/20">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="absolute bottom-[-20px] left-8 p-4 bg-white rounded-2xl shadow-xl">
             <GraduationCap className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="p-8 pt-10">
          <DialogHeader className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-red-50 text-red-600 hover:bg-red-100 border-none px-2 rounded-lg text-[10px] uppercase font-black">
                {examCategory} PREPARATION
              </Badge>
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {topicName}
            </DialogTitle>
            <p className="text-slate-500 font-medium mt-1">
              Select your personalized learning path for this topic.
            </p>
          </DialogHeader>

          {!topicData && !isLoading ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-500 font-medium">
                This topic is part of your official syllabus. Study resources for this topic are being updated by our expert faculty.
              </p>
              <Button variant="outline" className="mt-4 border-red-200 text-red-600 hover:bg-red-50" onClick={onClose}>
                Explore Other Topics
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Practice Test Hub / Admin MCQ Upload */}
              <div className="group relative overflow-hidden p-6 rounded-3xl bg-slate-900 text-white shadow-xl transition-all hover:scale-[1.02]">
                <div className="relative z-10">
                  <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center mb-4 text-red-400">
                    <PlayCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {isAdmin ? "MCQ Management" : "Practice MCQs"}
                  </h3>
                  <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                    {isAdmin 
                      ? `View existing MCQs or upload new questions for this topic.`
                      : `Test your knowledge with chapter-wise questions and simulation marks.`
                    }
                  </p>
                  <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 rounded-xl group-hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all">
                    <Link href={isAdmin ? `/dashboard/admin?section=topic-mcq&search=${encodeURIComponent(topicName)}` : `/dashboard/topic-wise-mcq/${topicData?.id}`}>
                      {isAdmin ? "Manage MCQs" : "Start Practice"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-red-500/20 rounded-full blur-3xl group-hover:bg-red-500/30 transition-all" />
              </div>

              {/* Study Materials Hub / Admin Material Upload */}
              <div className="group relative overflow-hidden p-6 rounded-3xl bg-white border-2 border-slate-100 shadow-lg transition-all hover:border-red-100">
                <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center mb-4 text-red-600">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {isAdmin ? "Material Studio" : "Study Corner"}
                </h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  {isAdmin 
                    ? `Upload new PDF study notes or manage existing materials for this topic.`
                    : materials.length > 0 
                      ? `Access ${materials.length} professional PDFs and visual guides for this topic.` 
                      : "Comprehensive PDFs and visual summaries for this topic."
                  }
                </p>
                <Button asChild variant="outline" className="w-full border-slate-200 hover:border-red-600 hover:text-red-600 h-12 rounded-xl font-bold transition-all">
                  <Link href={isAdmin ? `/dashboard/admin?section=study-material&search=${encodeURIComponent(topicName)}` : `/dashboard/study-material?topicId=${topicData?.id}`}>
                    {isAdmin ? "Manage Materials" : "Open Materials"}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Powered by Anjalkaran AI</span>
            <span>2024 Exam Edition</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
