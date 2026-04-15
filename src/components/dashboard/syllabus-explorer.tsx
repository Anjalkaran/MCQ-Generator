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
  GraduationCap,
  PlayCircle
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
  const { topics, studyMaterials, syllabusMCQs, syllabi, isLoading: isDashboardLoading } = useDashboard();
  const [selectedTopic, setSelectedTopic] = React.useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = React.useState<string | null>(null);
  const [selectedSubTopics, setSelectedSubTopics] = React.useState<string[]>([]);
  const [initialSubTopic, setInitialSubTopic] = React.useState<string | undefined>(undefined);

  const blueprintMap = React.useMemo(() => {
    const map: Record<string, any> = {
      'MTS': MTS_BLUEPRINT,
      'POSTMAN': POSTMAN_BLUEPRINT,
      'PA': PA_BLUEPRINT,
      'IP': IP_BLUEPRINT,
      'GROUP B': GROUPB_BLUEPRINT
    };
    
    // Override with dynamic syllabi from Firestore with metadata preservation
    syllabi.forEach(s => {
      if (s.id && map[s.id]) {
        const base = map[s.id];
        const dynamic = JSON.parse(JSON.stringify(s));
        
        if (dynamic.parts && base.parts) {
          dynamic.parts.forEach((part: any, pIdx: number) => {
            const basePart = base.parts[pIdx];
            if (basePart && part.sections && basePart.sections) {
              part.sections.forEach((sec: any, sIdx: number) => {
                const baseSec = basePart.sections[sIdx];
                if (baseSec && sec.topics && baseSec.topics) {
                  sec.topics.forEach((topic: any) => {
                    const baseTopic = baseSec.topics.find((bt: any) => 
                      (bt.id === topic.id) || (bt.name === topic.name)
                    );
                    if (baseTopic?.subTopics && (!topic.subTopics || topic.subTopics.length === 0)) {
                      topic.subTopics = baseTopic.subTopics;
                    }
                  });
                }
              });
            }
          });
        }
        map[s.id] = dynamic;
      } else if (s.id) {
        map[s.id] = s;
      }
    });
    
    return map;
  }, [syllabi]);

  const blueprint = React.useMemo(() => {
    return blueprintMap[examCategory];
  }, [examCategory, blueprintMap]);

  if (isDashboardLoading) {
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shadow-sm shrink-0">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-xl sm:text-2xl text-slate-900 leading-tight">{part.partName}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">{part.totalQuestions} Questions in this part</CardDescription>
                      </div>
                    </div>
                  </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {part.sections.map((section: any, sectionIdx: number) => (
                    <div key={sectionIdx} className="p-6 transition-colors hover:bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-xs text-white shrink-0 mt-1 sm:mt-0">
                          {sectionIdx + 1}
                        </span>
                        <div className="flex flex-col gap-2">
                          <h4 className="text-lg sm:text-xl font-bold text-slate-800 leading-snug">
                            {section.sectionName}
                            <span className="ml-2 text-red-600 text-lg sm:text-xl font-extrabold drop-shadow-sm">
                              ({section.topics 
                                ? section.topics.reduce((sum: number, t: any) => sum + t.questions, 0)
                                : section.randomFrom?.questions || 0
                              } Qs)
                            </span>
                          </h4>
                          
                          {/* Sub-topics cards */}
                          {(section.topics || section.randomFrom?.topics) && (
                            <div className="mt-4 pl-0 sm:pl-11 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {(section.topics || section.randomFrom?.topics || []).map((topic: any, tIdx: number) => {
                                      const topicObj = typeof topic === 'string' 
                                        ? { id: `${examCategory}-${partIdx}-${sectionIdx}-${tIdx}`, name: topic } 
                                        : { ...topic, id: topic.id || `${examCategory}-${partIdx}-${sectionIdx}-${tIdx}` };
                                      
                                      const targetId = topicObj.id?.trim();
                                      const targetName = topicObj.name?.trim().toLowerCase();

                                      const topicMCQs = syllabusMCQs.filter(m => {
                                        const mId = m.topicId?.trim();
                                        const mName = m.topicName?.trim().toLowerCase();
                                        return (targetId && mId === targetId) || (targetName && mName === targetName);
                                      });

                                      const topicMaterials = studyMaterials.filter(m => {
                                        const mId = m.topicId?.trim();
                                        const mName = m.topicName?.trim().toLowerCase();
                                        return (targetId && mId === targetId) || (targetName && mName === targetName);
                                      });

                                      const mcqCount = topicMCQs.length;
                                      const materialCount = topicMaterials.length;

                                      return (
                                          <div 
                                            key={tIdx} 
                                            onClick={() => {
                                                setSelectedTopic(topicObj.name);
                                                setSelectedTopicId(topicObj.id);
                                                setSelectedSubTopics(topicObj.subTopics || []);
                                                setInitialSubTopic(undefined);
                                            }}
                                            className="group/topic cursor-pointer relative flex flex-col justify-between p-4 rounded-2xl border border-slate-100 bg-white/50 hover:bg-white hover:shadow-xl hover:border-red-200 transition-all duration-500 transform hover:-translate-y-1"
                                          >
                                          <div className="flex flex-col gap-3">
                                            <div className="flex items-start gap-2.5">
                                              <div className="h-2 w-2 rounded-full bg-red-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.5)] group-hover/topic:scale-125 transition-transform" />
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-[15px] font-bold text-slate-900 leading-tight">
                                                  {topicObj.name}
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                  {mcqCount > 0 && (
                                                    <span className="flex items-center gap-1 text-[9px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md uppercase tracking-tighter shadow-sm border border-blue-100/50">
                                                      <PlayCircle className="h-2.5 w-2.5" />
                                                      {mcqCount} Tests
                                                    </span>
                                                  )}
                                                  {materialCount > 0 && (
                                                    <span className="flex items-center gap-1 text-[9px] font-black bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md uppercase tracking-tighter shadow-sm border border-emerald-100/50">
                                                      <FileText className="h-2.5 w-2.5" />
                                                      {materialCount} Study
                                                    </span>
                                                  )}
                                                  {!mcqCount && !materialCount && (
                                                    <span className="text-[10px] text-red-500 font-bold opacity-0 group-hover/topic:opacity-100 transition-opacity uppercase">
                                                      CLICK TO EXPLORE
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            
                                            {/* Sub-topics list with classification & grid logic */}
                                            {topicObj.subTopics && topicObj.subTopics.length > 0 && (
                                              <div className="mt-3 ml-4 border-l-2 border-red-100/50 pl-4">
                                                {(() => {
                                                  const subTopics = topicObj.subTopics;
                                                  
                                                  // Heuristic classification for Postal topics
                                                  const groups: Record<string, string[]> = {
                                                    "Savings & Schemes": [],
                                                    "Insurance": [],
                                                    "Banking & Remittance": [],
                                                    "General": []
                                                  };

                                                  const savingsKeywords = ['SB', 'RD', 'TD', 'MIS', 'SCSS', 'PPF', 'SSA', 'NSC', 'KVP', 'MSSC', 'SAVINGS', 'SCHEME', 'CERTIFICATE'];
                                                  const insuranceKeywords = ['PLI', 'RPLI', 'INSURANCE', 'LIFE'];
                                                  const bankingKeywords = ['IPPB', 'BANKING', 'REMITTANCE', 'MONEY', 'PAYMENTS', 'MAILS'];

                                                  subTopics.forEach((sub: string) => {
                                                    const s = sub.toUpperCase();
                                                    if (savingsKeywords.some(k => s.includes(k))) groups["Savings & Schemes"].push(sub);
                                                    else if (insuranceKeywords.some(k => s.includes(k))) groups["Insurance"].push(sub);
                                                    else if (bankingKeywords.some(k => s.includes(k))) groups["Banking & Remittance"].push(sub);
                                                    else groups["General"].push(sub);
                                                  });

                                                  const activeGroups = Object.entries(groups).filter(([_, items]) => items.length > 0);
                                                  const shouldGroup = activeGroups.length > 1 && subTopics.length > 6;

                                                  if (shouldGroup) {
                                                    const groupStyles: Record<string, { badge: string, dot: string, line: string }> = {
                                                      "Savings & Schemes": { badge: "text-blue-600 bg-blue-50/50", dot: "bg-blue-400", line: "bg-blue-100/30" },
                                                      "Insurance": { badge: "text-emerald-600 bg-emerald-50/50", dot: "bg-emerald-400", line: "bg-emerald-100/30" },
                                                      "Banking & Remittance": { badge: "text-amber-600 bg-amber-50/50", dot: "bg-amber-400", line: "bg-amber-100/30" },
                                                      "General": { badge: "text-slate-500 bg-slate-50/50", dot: "bg-slate-300", line: "bg-slate-100/30" }
                                                    };

                                                    return (
                                                      <div className="space-y-4">
                                                        {activeGroups.map(([group, items]) => {
                                                          const style = groupStyles[group] || groupStyles["General"];
                                                          return (
                                                            <div key={group} className="space-y-1.5">
                                                              <div className="flex items-center gap-2">
                                                                <span className={cn("text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md", style.badge)}>{group}</span>
                                                                <div className={cn("h-px flex-1", style.line)} />
                                                              </div>
                                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                                                {items.map((sub: string, i: number) => (
                                                                  <button 
                                                                    key={i} 
                                                                    onClick={(e) => {
                                                                      e.stopPropagation();
                                                                      setSelectedTopic(topicObj.name);
                                                                      setSelectedTopicId(topicObj.id);
                                                                      setSelectedSubTopics(subTopics);
                                                                      setInitialSubTopic(sub);
                                                                    }}
                                                                    className="flex items-start gap-1.5 text-slate-500 group/sub hover:text-red-600 transition-colors text-left"
                                                                  >
                                                                    <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 opacity-60 bg-red-400 group-hover/sub:scale-125 transition-transform", style.dot)} />
                                                                    <span className="text-[11px] font-medium leading-tight underline-offset-4 group-hover/sub:underline">{sub}</span>
                                                                  </button>
                                                                ))}
                                                              </div>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    );
                                                  }

                                                  // Default compact grid for non-groupable long lists
                                                  return (
                                                    <div className={cn(
                                                      "grid gap-x-6 gap-y-1.5",
                                                      subTopics.length > 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
                                                    )}>
                                                      {subTopics.map((sub: string, sIdx: number) => (
                                                        <button 
                                                          key={sIdx} 
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTopic(topicObj.name);
                                                            setSelectedTopicId(topicObj.id);
                                                            setSelectedSubTopics(subTopics);
                                                            setInitialSubTopic(sub);
                                                          }}
                                                          className="flex items-start gap-1.5 text-slate-500 group/sub hover:text-red-600 transition-colors text-left"
                                                        >
                                                          <ChevronRight className="h-3 w-3 mt-0.5 text-red-300 shrink-0 group-hover/sub:translate-x-1 transition-transform" />
                                                          <span className="text-[11px] font-medium leading-normal underline-offset-4 group-hover/sub:underline">{sub}</span>
                                                        </button>
                                                      ))}
                                                    </div>
                                                  );
                                                })()}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                  })}
                            </div>
                          )}
                        </div>
                      </div>
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
            setSelectedSubTopics([]);
            setInitialSubTopic(undefined);
        }}
        topicId={selectedTopicId || undefined}
        topicName={selectedTopic || ''}
        examCategory={examCategory}
        subTopics={selectedSubTopics}
        initialSubTopic={initialSubTopic}
      />
    </div>
  );
}
