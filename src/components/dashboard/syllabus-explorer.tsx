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
  IP_BLUEPRINT,
  GROUPB_BLUEPRINT
} from '@/lib/exam-blueprints';
import { cn } from '@/lib/utils';
import { StaggerContainer, StaggerItem, HoverScale } from '@/components/animations/motion-wrapper';
import { getSyllabi } from '@/lib/firestore';
import { RefreshCw } from 'lucide-react';
import { TopicHubModal } from './topic-hub-modal';
import { useDashboard } from '@/context/dashboard-context';

const blueprintMap: Record<string, any> = {
  'MTS': MTS_BLUEPRINT,
  'POSTMAN': POSTMAN_BLUEPRINT,
  'PA': PA_BLUEPRINT,
  'IP': IP_BLUEPRINT,
  'GROUP B': GROUPB_BLUEPRINT
};

interface SyllabusExplorerProps {
  examCategory: string;
  isAdmin?: boolean;
}

export function SyllabusExplorer({ examCategory, isAdmin }: SyllabusExplorerProps) {
  const [dynamicBlueprints, setDynamicBlueprints] = React.useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedTopic, setSelectedTopic] = React.useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = React.useState<string | null>(null);
  
  const { topics, studyMaterials } = useDashboard();

  React.useEffect(() => {
    async function loadSyllabi() {
      try {
        const data = await getSyllabi();
        const map: Record<string, any> = {};
        data.forEach(item => {
          map[item.id] = item;
        });
        setDynamicBlueprints(map);
      } catch (error) {
        console.error("Failed to load syllabi:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSyllabi();
  }, []);

  const blueprint = useMemo(() => {
    return dynamicBlueprints[examCategory] || blueprintMap[examCategory];
  }, [examCategory, dynamicBlueprints]);


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-center">
        <RefreshCw className="h-12 w-12 text-red-500 animate-spin opacity-20" />
        <p className="mt-4 text-slate-400 font-medium font-inter">Loading detailed syllabus...</p>
      </div>
    );
  }

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
          <div className="flex items-center justify-between mb-4">
            <Badge className="bg-white/20 text-white hover:bg-white/30 border-none backdrop-blur-md">
              BLUEPRINT
            </Badge>
          </div>
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
                          
                          {/* Sub-topics cards */}
                          {(section.topics || section.randomFrom?.topics) && (
                            <div className="mt-4 pl-11 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(section.topics || section.randomFrom?.topics).map((topic: any, idx: number) => (
                                  <div 
                                    key={idx} 
                                    onClick={() => {
                                        setSelectedTopic(typeof topic === 'string' ? topic : topic.name);
                                        setSelectedTopicId(typeof topic === 'string' ? null : topic.id);
                                    }}
                                    className="group/topic cursor-pointer relative flex flex-col justify-between p-4 rounded-2xl border border-slate-100 bg-white/50 hover:bg-white hover:shadow-xl hover:border-red-200 transition-all duration-500 transform hover:-translate-y-1"
                                  >
                                    <div className="flex flex-col gap-3">
                                      <div className="flex items-start gap-2.5">
                                        <div className="h-2 w-2 rounded-full bg-red-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.5)] group-hover/topic:scale-125 transition-transform" />
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-[15px] font-bold text-slate-900 leading-tight">
                                            {typeof topic === 'string' ? topic : topic.name}
                                          </span>
                                          <span className="text-[10px] text-red-500 font-bold opacity-0 group-hover/topic:opacity-100 transition-opacity uppercase">
                                            CLICK TO START LEARNING
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Sub-topics list */}
                                      {typeof topic !== 'string' && topic.subTopics && topic.subTopics.length > 0 && (
                                        <div className="ml-4 space-y-1.5 border-l-2 border-red-50 pl-3">
                                          {topic.subTopics.map((sub: string, sIdx: number) => (
                                            <div key={sIdx} className="flex items-start gap-2 text-slate-500 group/sub">
                                              <ChevronRight className="h-3 w-3 mt-0.5 text-red-300 shrink-0" />
                                              <span className="text-[11px] font-medium leading-normal">{sub}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
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

      <TopicHubModal 
        isOpen={!!selectedTopic}
        onClose={() => {
            setSelectedTopic(null);
            setSelectedTopicId(null);
        }}
        topicId={selectedTopicId || undefined}
        topicName={selectedTopic || ''}
        examCategory={examCategory}
        isAdmin={isAdmin}
      />
    </div>
  );
}
