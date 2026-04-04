"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Book, 
  FileText, 
  Clock, 
  HelpCircle, 
  ChevronRight, 
  Layers,
  GraduationCap
} from 'lucide-react';
import { 
  MTS_BLUEPRINT, 
  POSTMAN_BLUEPRINT, 
  PA_BLUEPRINT, 
  IP_BLUEPRINT
} from '@/lib/exam-blueprints';
import { cn } from '@/lib/utils';
import { StaggerContainer, StaggerItem, HoverScale } from '@/components/animations/motion-wrapper';

const blueprintMap: Record<string, any> = {
  'MTS': MTS_BLUEPRINT,
  'POSTMAN': POSTMAN_BLUEPRINT,
  'PA': PA_BLUEPRINT,
  'IP': IP_BLUEPRINT
};

interface SyllabusExplorerProps {
  examCategory: string;
}

export function SyllabusExplorer({ examCategory }: SyllabusExplorerProps) {
  const blueprint = useMemo(() => blueprintMap[examCategory], [examCategory]);

  if (!blueprint) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <HelpCircle className="h-12 w-12 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Syllabus Not Found</h3>
        <p className="text-slate-500 max-w-md mt-2">
          We couldn't find the detailed syllabus for the {examCategory} category. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 to-red-900 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <Badge className="mb-4 bg-white/20 text-white hover:bg-white/30 border-none backdrop-blur-md">
            OFFICIAL BLUEPRINT
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
            <GraduationCap className="h-10 w-10" />
            {blueprint.examName} Syllabus
          </h1>
          <p className="text-red-100 text-lg opacity-90 max-w-2xl">
            Detailed breakdown of sections, topics, and question weighting. Ensure your preparation is aligned with the latest exam pattern.
          </p>
          
          <div className="flex flex-wrap gap-6 mt-8">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-sm">
              <Clock className="h-5 w-5 text-red-200" />
              <span className="font-semibold">{blueprint.totalDurationMinutes} Minutes Duration</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-sm">
              <FileText className="h-5 w-5 text-red-200" />
              <span className="font-semibold">
                {blueprint.parts.reduce((sum: number, p: any) => sum + p.totalQuestions, 0)} Total MCQs
              </span>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-red-400/20 blur-3xl" />
      </div>

      <StaggerContainer className="grid gap-6">
        {blueprint.parts.map((part: any, partIdx: number) => (
          <StaggerItem key={partIdx}>
            <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shadow-sm">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-slate-900">{part.partName}</CardTitle>
                      <CardDescription>{part.totalQuestions} Questions in this part</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {part.sections.map((section: any, sectionIdx: number) => (
                    <div key={sectionIdx} className="p-6 transition-colors hover:bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-xs text-white shrink-0">
                            {sectionIdx + 1}
                          </span>
                        <div className="flex flex-col gap-2">
                          <h4 className="text-xl font-bold text-slate-800">
                            {section.sectionName}
                          </h4>
                          
                          {/* Sub-topics list */}
                          {(section.topics || section.randomFrom?.topics) && (
                            <div className="mt-2 pl-11 space-y-2">
                              {(section.topics || section.randomFrom?.topics).map((topic: any, idx: number) => (
                                <div key={idx} className="flex items-start gap-2 text-slate-600">
                                  <div className="h-1.5 w-1.5 rounded-full bg-slate-300 mt-2 shrink-0" />
                                  <span className="text-sm">
                                    {typeof topic === 'string' ? topic : topic.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-red-50 text-red-600 border-none text-lg px-4 py-2 rounded-xl font-bold">
                        {section.topics 
                          ? section.topics.reduce((sum: number, t: any) => sum + t.questions, 0)
                          : section.randomFrom?.questions || 0
                        } Questions
                      </Badge>
                    </div>
                  </div>
                ))}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}
