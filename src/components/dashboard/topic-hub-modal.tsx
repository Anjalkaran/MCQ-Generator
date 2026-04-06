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
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MaterialViewer } from './material-viewer';
import type { StudyMaterial } from '@/lib/types';
interface TopicHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId?: string;
  topicName: string;
  examCategory: string;
}

export function TopicHubModal({ isOpen, onClose, topicId, topicName, examCategory }: TopicHubModalProps) {
  const { studyMaterials, syllabusMCQs, isLoading } = useDashboard();

  const materials = useMemo(() => {
    return studyMaterials ? studyMaterials.filter(m => m.topicId === topicId || (m.topicName === topicName)) : [];
  }, [studyMaterials, topicId, topicName]);

  const topicMCQs = useMemo(() => {
    if (!syllabusMCQs) return [];
    const targetId = topicId?.trim();
    const targetName = topicName?.trim().toLowerCase();
    
    return syllabusMCQs.filter(m => {
      const mId = m.topicId?.trim();
      const mName = m.topicName?.trim().toLowerCase();
      return (targetId && mId === targetId) || (targetName && mName === targetName);
    });
  }, [syllabusMCQs, topicId, topicName]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl">
        <div className="relative h-32 bg-gradient-to-br from-red-600 to-red-900 border-b border-red-500/20">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="absolute bottom-[-20px] left-4 sm:left-8 p-3 sm:p-4 bg-white rounded-2xl shadow-xl">
             <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
          </div>
        </div>

        <div className="p-5 sm:p-8 pt-10 sm:pt-10">
          <DialogHeader className="mb-6 sm:mb-8 text-left sm:text-left">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-red-50 text-red-600 hover:bg-red-100 border-none px-2 rounded-lg text-[9px] sm:text-[10px] uppercase font-black">
                {examCategory} PREPARATION
              </Badge>
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {topicName}
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm font-medium mt-1">
              Select your learning path for this topic.
            </DialogDescription>
          </DialogHeader>

          {materials.length === 0 && topicMCQs.length === 0 && !isLoading ? (
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

              {/* Study Materials Hub / Admin Material Upload */}
              <div className="group relative overflow-hidden p-6 rounded-3xl bg-white border-2 border-slate-100 shadow-lg transition-all hover:border-red-100">
                <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center mb-4 text-red-600">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Study Material
                </h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  {materials.length > 0 
                    ? `Access ${materials.length} professional visual guides for this topic.` 
                    : "Comprehensive visual summaries for this topic."
                  }
                </p>

                {materials.length === 1 ? (
                    <Button 
                        asChild
                        className="w-full border-slate-200 hover:border-red-600 hover:text-red-600 h-12 rounded-xl font-bold transition-all"
                        variant="outline"
                    >
                        <Link href={`/dashboard/read-material/${materials[0].id}`}>
                            {materials[0].fileType === 'docx' || (materials[0].content && (materials[0].content.startsWith('<') || materials[0].content.startsWith('{'))) ? 'Read Study Material' : 'Open PDF'}
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                ) : materials.length > 1 ? (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Material</p>
                        <div className="grid gap-2">
                            {materials.map((mat) => (
                                <Button 
                                    asChild
                                    key={mat.id}
                                    variant="ghost" 
                                    className="w-full justify-between h-10 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-red-600 border border-slate-100"
                                >
                                    <Link href={`/dashboard/read-material/${mat.id}`}>
                                        <span className="truncate max-w-[180px]">{mat.fileName}</span>
                                        <ChevronRight className="h-3 w-3" />
                                    </Link>
                                </Button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No detailed materials yet</p>
                    </div>
                )}
              </div>

              {/* Practice MCQs Hub */}
              <div className="group relative overflow-hidden p-6 rounded-3xl bg-slate-50 border-2 border-slate-100 shadow-lg transition-all hover:border-red-100">
                <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center mb-4 text-red-600">
                  <PlayCircle className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Practice Exam
                </h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  {topicMCQs.length > 0 
                    ? `Test your knowledge with ${topicMCQs.length} question sets for this topic.` 
                    : "Exclusive practice tests and previous year questions."
                  }
                </p>
                <Button 
                  asChild 
                  className="w-full bg-slate-900 hover:bg-black text-white font-bold h-12 rounded-xl transition-all"
                >
                  <Link href={`/dashboard/topic-wise-mcq/${topicId}`}>
                    Start Practice Quiz
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Powered by Anjalkaran</span>
            <span>2024 Exam Edition</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
