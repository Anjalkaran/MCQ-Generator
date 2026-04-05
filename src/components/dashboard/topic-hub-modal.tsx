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
  isAdmin?: boolean;
}

export function TopicHubModal({ isOpen, onClose, topicId, topicName, examCategory, isAdmin }: TopicHubModalProps) {
  const { topics, studyMaterials, isLoading } = useDashboard();
  const [selectedViewerMaterial, setSelectedViewerMaterial] = React.useState<StudyMaterial | null>(null);

  const topicData = useMemo(() => {
    if (!topics) return null;
    
    // First try matching by ID if provided
    if (topicId) {
        const byId = topics.find(t => t.id === topicId);
        if (byId) return byId;
    }
    
    // Otherwise fall back to matching by title and exam category
    return topics.find(t => 
      t.title.toLowerCase() === topicName.toLowerCase() && 
      t.examCategories.includes(examCategory as any)
    );
  }, [topics, topicId, topicName, examCategory]);

  const materials = useMemo(() => {
    // Check for materials that match either:
    // 1. The Firestore document ID 
    // 2. The unique syllabus ID (e.g., IP-P3-S2-T1) stored in the topic document
    // 3. The topicId prop passed from the caller (the blueprint ID)
    const list = studyMaterials ? studyMaterials.filter(m => 
      (topicData && m.topicId === topicData.id) || 
      (topicData?.syllabusId && m.topicId === topicData.syllabusId) ||
      (topicId && m.topicId === topicId)
    ) : [];
    
    // Add virtual material if exists
    if (topicData?.material) {
        return [{
            id: `v_${topicData.id}`,
            topicId: topicData.id,
            fileName: `${topicData.title} Guide`,
            fileType: 'docx',
            content: topicData.material,
            uploadedAt: new Date()
        }, ...list];
    }
    
    return list;
  }, [topicData, studyMaterials, topicId]);

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

          {(!topicData && materials.length === 0) && !isLoading ? (
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

                {isAdmin ? (
                    <Button asChild variant="outline" className="w-full border-slate-200 hover:border-red-600 hover:text-red-600 h-12 rounded-xl font-bold transition-all">
                        <Link href={`/dashboard/admin?section=study-material&search=${encodeURIComponent(topicName)}`}>
                            Manage Materials
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                ) : materials.length === 1 ? (
                    <Dialog open={!!selectedViewerMaterial} onOpenChange={(open) => !open && setSelectedViewerMaterial(null)}>
                        <DialogTrigger asChild>
                            <Button 
                                variant="outline" 
                                onClick={() => setSelectedViewerMaterial(materials[0])}
                                className="w-full border-slate-200 hover:border-red-600 hover:text-red-600 h-12 rounded-xl font-bold transition-all"
                            >
                                {materials[0].fileType === 'docx' || (materials[0].content && materials[0].content.startsWith('<')) ? 'Read Article' : 'Open PDF'}
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        {selectedViewerMaterial && <MaterialViewer material={selectedViewerMaterial} isAdmin={isAdmin} />}
                    </Dialog>
                ) : materials.length > 1 ? (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Material</p>
                        <div className="grid gap-2">
                            {materials.map((mat) => (
                                <Dialog key={mat.id} open={selectedViewerMaterial?.id === mat.id} onOpenChange={(open) => !open && setSelectedViewerMaterial(null)}>
                                    <DialogTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => setSelectedViewerMaterial(mat)}
                                            className="w-full justify-between h-10 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-red-600 border border-slate-100"
                                        >
                                            <span className="truncate max-w-[180px]">{mat.fileName}</span>
                                            <ChevronRight className="h-3 w-3" />
                                        </Button>
                                    </DialogTrigger>
                                    {selectedViewerMaterial?.id === mat.id && <MaterialViewer material={mat} isAdmin={isAdmin} />}
                                </Dialog>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No detailed materials yet</p>
                    </div>
                )}
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
