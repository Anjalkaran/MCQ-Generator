
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, ChevronRight, ChevronDown, Save, RefreshCw, Layers, BookOpen, Clock } from "lucide-react";
import { 
  getSyllabi, 
  saveSyllabus, 
  deleteSyllabus, 
  getTopics, 
  getCategories, 
  updateTopic, 
  addTopic,
  addCategory
} from "@/lib/firestore";
import type { SyllabusBlueprint, SyllabusPart, SyllabusSection, SyllabusTopic, Topic, Category } from "@/lib/types";
import { AlertCircle, CheckCircle2, RefreshCwIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import * as Blueprints from "@/lib/exam-blueprints";

export function SyllabusManagement() {
  const [syllabi, setSyllabi] = useState<SyllabusBlueprint[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [activeBlueprint, setActiveBlueprint] = useState<SyllabusBlueprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const categories = ['MTS', 'POSTMAN', 'PA', 'IP', 'GROUP B'];
  const [bankTopics, setBankTopics] = useState<Topic[]>([]);
  const [bankCategories, setBankCategories] = useState<Category[]>([]);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  const fetchSyllabi = async () => {
    setIsLoading(true);
    try {
      const [syllabiData, topicsData, catsData] = await Promise.all([
        getSyllabi(),
        getTopics(),
        getCategories()
      ]);
      setSyllabi(syllabiData);
      setBankTopics(topicsData);
      setBankCategories(catsData);
      if (syllabiData.length > 0 && !selectedCategory) {
        handleSelectCategory(syllabiData[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Error", description: "Could not load data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSyllabi();
  }, []);

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const found = syllabi.find(s => s.id === categoryId);
    if (found) {
      setActiveBlueprint(JSON.parse(JSON.stringify(found))); // Clone to avoid direct mutation
    } else {
      // Initialize a new blueprint if not found in Firestore
      const defaultBlueprint: SyllabusBlueprint = {
        id: categoryId,
        examName: categoryId + " Exam",
        totalDurationMinutes: 60,
        parts: []
      };
      
      // Try to seed from hardcoded blueprints if available
      const blueprintKey = categoryId.replace(" ", "") + "_BLUEPRINT";
      if ((Blueprints as any)[blueprintKey]) {
         const hardcoded = (Blueprints as any)[blueprintKey];
         defaultBlueprint.examName = hardcoded.examName;
         defaultBlueprint.totalDurationMinutes = hardcoded.totalDurationMinutes;
         defaultBlueprint.parts = hardcoded.parts;
      }

      setActiveBlueprint(defaultBlueprint);
    }
  };

  const handleSave = async () => {
    if (!activeBlueprint) return;
    setIsSaving(true);
    try {
      const { id, ...data } = activeBlueprint;
      await saveSyllabus(id, data);
      toast({ title: "Success", description: "Syllabus saved successfully." });
      fetchSyllabi();
    } catch (error) {
      console.error("Failed to save syllabus:", error);
      toast({ title: "Error", description: "Failed to save syllabus.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateBlueprint = (updater: (prev: SyllabusBlueprint) => SyllabusBlueprint) => {
    if (!activeBlueprint) return;
    setActiveBlueprint(prev => prev ? updater(prev) : null);
  };

  const handleAddPart = () => {
    updateBlueprint(prev => ({
      ...prev,
      parts: [...prev.parts, { partName: "New Paper", totalQuestions: 50, sections: [] }]
    }));
  };

  const handleDeletePart = (partIdx: number) => {
    updateBlueprint(prev => ({
      ...prev,
      parts: prev.parts.filter((_, i) => i !== partIdx)
    }));
  };

  const handleAddSection = (partIdx: number) => {
    updateBlueprint(prev => {
      const newParts = [...prev.parts];
      newParts[partIdx].sections.push({ sectionName: "New Section", topics: [] });
      return { ...prev, parts: newParts };
    });
  };

  const handleDeleteSection = (partIdx: number, sectionIdx: number) => {
    updateBlueprint(prev => {
      const newParts = [...prev.parts];
      newParts[partIdx].sections = newParts[partIdx].sections.filter((_, i) => i !== sectionIdx);
      return { ...prev, parts: newParts };
    });
  };

  const handleAddTopic = (partIdx: number, sectionIdx: number) => {
    updateBlueprint(prev => {
      const newParts = [...prev.parts];
      newParts[partIdx].sections[sectionIdx].topics.push({ name: "New Sub-topic", questions: 1 });
      return { ...prev, parts: newParts };
    });
  };

  const handleDeleteTopic = (partIdx: number, sectionIdx: number, topicIdx: number) => {
    updateBlueprint(prev => {
      const newParts = [...prev.parts];
      newParts[partIdx].sections[sectionIdx].topics = newParts[partIdx].sections[sectionIdx].topics.filter((_, i) => i !== topicIdx);
      return { ...prev, parts: newParts };
    });
  };

  const addSubTopic = (partIdx: number, sectionIdx: number, topicIdx: number) => {
    updateBlueprint(prev => {
      const newParts = [...prev.parts];
      const topic = newParts[partIdx].sections[sectionIdx].topics[topicIdx];
      if (typeof topic !== 'string') {
        if (!topic.subTopics) topic.subTopics = [];
        topic.subTopics.push("New Detail");
      }
      return { ...prev, parts: newParts };
    });
  };

  const updateSubTopic = (partIdx: number, sectionIdx: number, topicIdx: number, subIdx: number, value: string) => {
    updateBlueprint(prev => {
      const newParts = [...prev.parts];
      const topic = newParts[partIdx].sections[sectionIdx].topics[topicIdx];
      if (typeof topic !== 'string' && topic.subTopics) {
        topic.subTopics[subIdx] = value;
      }
      return { ...prev, parts: newParts };
    });
  };

  const deleteSubTopic = (partIdx: number, sectionIdx: number, topicIdx: number, subIdx: number) => {
    updateBlueprint(prev => {
      const newParts = [...prev.parts];
      const topic = newParts[partIdx].sections[sectionIdx].topics[topicIdx];
      if (typeof topic !== 'string' && topic.subTopics) {
        topic.subTopics = topic.subTopics.filter((_, i) => i !== subIdx);
      }
      return { ...prev, parts: newParts };
    });
  };

  const syncTopicWithBank = async (topicName: string, sectionName: string) => {
    setIsSyncing(topicName);
    const examCat = selectedCategory as 'MTS' | 'POSTMAN' | 'PA' | 'IP' | 'GROUP B';
    try {
      // 1. Find if topic exists in bank
      const existing = bankTopics.find(t => t.title.toLowerCase() === topicName.toLowerCase());
      
      if (existing) {
        // Topic exists, ensure it's in this exam category
        if (!existing.examCategories.includes(examCat)) {
          await updateTopic(existing.id, {
            examCategories: [...existing.examCategories, examCat]
          });
          toast({ title: "Synced", description: `Added ${examCat} to existing topic: ${topicName}` });
        }
      } else {
        // Topic doesn't exist, create it
        // Find or create category for the section
        let catId = bankCategories.find(c => c.name.toLowerCase() === sectionName.toLowerCase())?.id;
        
        if (!catId) {
          const newCatRef = await addCategory({ 
            name: sectionName,
            examCategories: [examCat]
          } as any);
          catId = newCatRef.id;
          // Optimistically update local state if needed
        }

        await addTopic({
          title: topicName,
          description: `Syllabus topic for ${sectionName}`,
          icon: 'BookOpen',
          categoryId: catId!,
          part: 'Part A', // Default fallback
          examCategories: [examCat],
        } as any);
        toast({ title: "Created", description: `New topic category created in MCQ bank: ${topicName}` });
      }
      
      // Refresh bank topics
      const updatedTopics = await getTopics();
      setBankTopics(updatedTopics);
    } catch (error) {
      console.error("Failed to sync:", error);
      toast({ title: "Sync Error", description: "Failed to sync with MCQ bank.", variant: "destructive" });
    } finally {
      setIsSyncing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Category Sidebar */}
      <Card className="lg:col-span-3 border-none bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-red-500" />
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "ghost"}
              className={cn(
                "w-full justify-start font-medium transition-all duration-300",
                selectedCategory === cat ? "bg-red-600 hover:bg-red-700 shadow-md transform scale-[1.02]" : "hover:bg-red-50 dark:hover:bg-red-900/30"
              )}
              onClick={() => handleSelectCategory(cat)}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              {cat}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Editor Main Area */}
      <Card className="lg:col-span-9 border-none shadow-xl bg-white dark:bg-slate-950">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-900 bg-clip-text text-transparent">
              {selectedCategory} Syllabus Editor
            </CardTitle>
            <CardDescription>Customize papers, sections, and topics for this exam.</CardDescription>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !activeBlueprint}
            className="bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/30 transition-all active:scale-95"
          >
            {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </CardHeader>

        <CardContent className="pt-8 space-y-8">
          {activeBlueprint ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Header Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-500">Exam Display Name</Label>
                  <Input 
                    value={activeBlueprint.examName} 
                    onChange={e => updateBlueprint(b => ({ ...b, examName: e.target.value }))}
                    className="bg-white dark:bg-slate-950 border-slate-200"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-500">Duration (Minutes)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      type="number"
                      value={activeBlueprint.totalDurationMinutes} 
                      onChange={e => updateBlueprint(b => ({ ...b, totalDurationMinutes: parseInt(e.target.value) }))}
                      className="pl-10 bg-white dark:bg-slate-950 border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Parts Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <Layers className="h-5 w-5 text-red-500" />
                    Papers / Parts
                  </h3>
                  <Button variant="outline" size="sm" onClick={handleAddPart} className="border-red-200 text-red-600 hover:bg-red-50">
                    <Plus className="h-4 w-4 mr-2" /> Add Paper
                  </Button>
                </div>

                <div className="space-y-6">
                  {(activeBlueprint.parts || []).map((part, partIdx) => (
                    <div key={partIdx} className="group/part relative p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-red-100 transition-all duration-300">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border border-red-100 shadow-sm opacity-0 group-hover/part:opacity-100 transition-opacity"
                        onClick={() => handleDeletePart(partIdx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-6">
                        <div className="md:col-span-7">
                          <Label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1 block">Paper Name</Label>
                          <Input 
                            value={part.partName} 
                            onChange={e => updateBlueprint(b => {
                              const b_parts = [...b.parts];
                              b_parts[partIdx].partName = e.target.value;
                              return { ...b, parts: b_parts };
                            })}
                            className="font-bold text-slate-700 bg-transparent border-dashed border-slate-200 focus:border-red-500"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <Label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1 block">Total Questions</Label>
                          <Input 
                            type="number"
                            value={part.totalQuestions} 
                            onChange={e => updateBlueprint(b => {
                              const b_parts = [...b.parts];
                              b_parts[partIdx].totalQuestions = parseInt(e.target.value);
                              return { ...b, parts: b_parts };
                            })}
                            className="bg-transparent border-dashed border-slate-200 focus:border-red-500"
                          />
                        </div>
                      </div>

                      {/* Sections within Part */}
                      <div className="pl-6 border-l-2 border-slate-50 space-y-4">
                        {(part.sections || []).map((section, sectionIdx) => (
                          <div key={sectionIdx} className="group/section relative p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2 h-6 w-6 rounded-full text-red-400 hover:text-red-500 opacity-0 group-hover/section:opacity-100 transition-opacity"
                                onClick={() => handleDeleteSection(partIdx, sectionIdx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>

                             <div className="mb-4">
                               <Label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1 block">Section Name</Label>
                               <Input 
                                 value={section.sectionName} 
                                 onChange={e => updateBlueprint(b => {
                                   const b_p = [...b.parts];
                                   b_p[partIdx].sections[sectionIdx].sectionName = e.target.value;
                                   return { ...b, parts: b_p };
                                 })}
                                 className="h-9 font-semibold text-slate-600 border-none bg-white dark:bg-slate-950 shadow-sm"
                               />
                             </div>

                             {/* Topics within Section */}
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                               {(section.topics || []).map((topic, topicIdx) => (
                                 <div key={topicIdx} className="flex flex-col gap-2 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 shadow-sm group/topic relative">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-slate-50 text-slate-400 hover:text-red-500 opacity-0 group-hover/topic:opacity-100 transition-opacity"
                                      onClick={() => handleDeleteTopic(partIdx, sectionIdx, topicIdx)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>

                                    {typeof topic === 'string' ? (
                                      <Input 
                                        value={topic} 
                                        onChange={e => updateBlueprint(b => {
                                          const b_p = [...b.parts];
                                          b_p[partIdx].sections[sectionIdx].topics[topicIdx] = e.target.value;
                                          return { ...b, parts: b_p };
                                        })}
                                        className="h-7 text-xs border-none p-0 focus-visible:ring-0 font-medium"
                                      />
                                    ) : (
                                      <>
                                        <div className="flex items-center justify-between gap-2">
                                          <Input 
                                            value={topic.name} 
                                            onChange={e => updateBlueprint(b => {
                                              const b_p = [...b.parts];
                                              (b_p[partIdx].sections[sectionIdx].topics[topicIdx] as SyllabusTopic).name = e.target.value;
                                              return { ...b, parts: b_p };
                                            })}
                                            placeholder="Topic Name"
                                            className="h-7 text-[13px] border-none p-0 focus-visible:ring-0 font-bold text-red-900"
                                          />
                                          {bankTopics.some(t => t.title.toLowerCase() === topic.name.toLowerCase()) ? (
                                            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                          ) : (
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-5 w-5 text-amber-500"
                                              onClick={() => syncTopicWithBank(topic.name, section.sectionName)}
                                              disabled={isSyncing === topic.name}
                                            >
                                              {isSyncing === topic.name ? <RefreshCwIcon className="h-3 w-3 animate-spin" /> : <AlertCircle className="h-3 w-3" />}
                                            </Button>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[10px] text-slate-400 font-bold uppercase">Qs:</span>
                                          <Input 
                                            type="number"
                                            value={topic.questions} 
                                            onChange={e => updateBlueprint(b => {
                                              const b_p = [...b.parts];
                                              (b_p[partIdx].sections[sectionIdx].topics[topicIdx] as SyllabusTopic).questions = parseInt(e.target.value);
                                              return { ...b, parts: b_p };
                                            })}
                                            className="h-5 w-12 text-[10px] bg-slate-50 border-none text-red-600 font-bold p-1"
                                          />
                                        </div>

                                        {/* Sub-topics */}
                                        <div className="mt-2 space-y-1.5 border-t pt-2">
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sub-topics</p>
                                          {topic.subTopics?.map((sub, sIdx) => (
                                            <div key={sIdx} className="flex items-center gap-1 group/sub">
                                              <div className="h-1 w-1 rounded-full bg-red-200" />
                                              <Input 
                                                value={sub}
                                                onChange={(e) => updateSubTopic(partIdx, sectionIdx, topicIdx, sIdx, e.target.value)}
                                                className="h-5 text-[10px] border-none p-0 bg-transparent focus-visible:ring-0 flex-1"
                                              />
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-4 w-4 text-slate-300 hover:text-red-500 opacity-0 group-hover/sub:opacity-100"
                                                onClick={() => deleteSubTopic(partIdx, sectionIdx, topicIdx, sIdx)}
                                              >
                                                <Trash2 className="h-2.5 w-2.5" />
                                              </Button>
                                            </div>
                                          ))}
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-5 w-full text-[9px] text-red-400 hover:text-red-600 p-0 font-bold"
                                            onClick={() => addSubTopic(partIdx, sectionIdx, topicIdx)}
                                          >
                                            <Plus className="h-2 w-2 mr-1" /> Add Detail
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                 </div>
                               ))}
                               <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-auto py-4 border-2 border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50/30"
                                  onClick={() => handleAddTopic(partIdx, sectionIdx)}
                                >
                                  <Plus className="h-4 w-4 mr-1" /> Add Sub-topic
                                </Button>
                             </div>
                          </div>
                        ))}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full border-dashed text-slate-500"
                          onClick={() => handleAddSection(partIdx)}
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Section to {part.partName}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-4">
               <Layers className="h-12 w-12 opacity-20" />
               <p>Select a category to start editing its syllabus.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
