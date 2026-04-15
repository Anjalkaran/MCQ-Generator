
'use client';

import React, { useState, useMemo, useEffect } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useDashboard } from '@/context/dashboard-context';
import { cn, normalizeDate } from '@/lib/utils';
import { 
  getSyllabusMCQs, 
  getSyllabusMaterials, 
  getSyllabi, 
  addSyllabusMCQ, 
  addSyllabusMaterial,
  deleteSyllabusMCQ,
  deleteSyllabusMaterial,
  updateSyllabusMaterial,
  updateSyllabusMCQ
} from '@/lib/firestore';
import { 
  MTS_BLUEPRINT, 
  POSTMAN_BLUEPRINT, 
  PA_BLUEPRINT, 
  GROUPB_BLUEPRINT,
  IP_BLUEPRINT
} from '@/lib/exam-blueprints';
import type { TopicMCQ, StudyMaterial, SyllabusBlueprint, SyllabusTopic } from '@/lib/types';
import * as mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import { JsonFormatGuide } from './json-format-guide';
import { 
  BookOpen, 
  FileText, 
  FileQuestion, 
  PlusCircle, 
  Trash2, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Layers,
  Search,
  Code2,
  FileCode,
  Languages
} from 'lucide-react';
import { getFirebaseStorage, getFirebaseAuth } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MCQStructuredEditor } from './mcq-structured-editor';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

function LabelWithIcon({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-slate-400">{icon}</div>
      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}


interface SyllabusPointManagementProps {
  initialMCQs: TopicMCQ[];
  initialMaterials: StudyMaterial[];
}



export function SyllabusPointManagement({ initialMCQs, initialMaterials }: SyllabusPointManagementProps) {
  const { syllabi, isLoading: isDashboardLoading } = useDashboard();
  
  const blueprints = useMemo(() => {
    const map: Record<string, any> = {
      MTS: MTS_BLUEPRINT,
      POSTMAN: POSTMAN_BLUEPRINT,
      PA: PA_BLUEPRINT,
      IP: IP_BLUEPRINT,
      'GROUP B': GROUPB_BLUEPRINT
    };
    
    syllabi.forEach(s => {
      if (s.id) map[s.id] = s;
    });
    
    return map;
  }, [syllabi]);

  const [selectedExam, setSelectedExam] = useState<string>('IP');
  const [mcqs, setMcqs] = useState<TopicMCQ[]>(initialMCQs);
  const [materials, setMaterials] = useState<StudyMaterial[]>(initialMaterials);
  const [selectedTopic, setSelectedTopic] = useState<SyllabusTopic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMaterial, setEditingMaterial] = useState<StudyMaterial | null>(null);
  const [editingMcq, setEditingMcq] = useState<TopicMCQ | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editContentTa, setEditContentTa] = useState('');
  const [editContentHi, setEditContentHi] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editTitleTa, setEditTitleTa] = useState('');
  const [editTitleHi, setEditTitleHi] = useState('');
  const [selectedSubTopic, setSelectedSubTopic] = useState<string>('');
  
  // Reset sub-topic when topic changes
  useEffect(() => {
    setSelectedSubTopic('');
  }, [selectedTopic]);
  const [isMcqPasteOpen, setIsMcqPasteOpen] = useState(false);
  const [mcqPasteValue, setMcqPasteValue] = useState('');
  const [isMaterialPasteOpen, setIsMaterialPasteOpen] = useState(false);
  const [materialPasteTitle, setMaterialPasteTitle] = useState('');
  const [materialPasteTitleTa, setMaterialPasteTitleTa] = useState('');
  const [materialPasteTitleHi, setMaterialPasteTitleHi] = useState('');
  const [materialPasteValue, setMaterialPasteValue] = useState('');
  const [materialPasteValueTa, setMaterialPasteValueTa] = useState('');
  const [materialPasteValueHi, setMaterialPasteValueHi] = useState('');
  const [useAutoHtml, setUseAutoHtml] = useState(false);

  const { toast } = useToast();

  const currentBlueprint = blueprints[selectedExam];

  const filteredBlueprint = useMemo(() => {
    if (!currentBlueprint || !currentBlueprint.parts) return null;
    if (!searchTerm) return currentBlueprint;
    
    // Deep clone and filter
    const cloned = JSON.parse(JSON.stringify(currentBlueprint));
    cloned.parts = (cloned.parts || []).map((part: any) => ({
      ...part,
      sections: (part.sections || []).map((section: any) => ({
        ...section,
        topics: section.topics?.filter((topic: any) => {
           const name = typeof topic === 'string' ? topic : topic.name;
           return name.toLowerCase().includes(searchTerm.toLowerCase());
        })
      })).filter((section: any) => (section.topics?.length > 0) || section.randomFrom)
    })).filter((part: any) => (part.sections?.length > 0));
    
    return cloned;
  }, [currentBlueprint, searchTerm]);

  const getTopicStats = (topicId: string) => {
    if (!mcqs || !materials) return { mcqCount: 0, questionCount: 0, materialCount: 0 };
    const topicMcqs = mcqs.filter(m => m.topicId === topicId);
    const topicMaterials = materials.filter(m => m.topicId === topicId);
    
    let totalQuestions = 0;
    topicMcqs.forEach(m => {
      try {
        const parsed = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
        const questions = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || []);
        totalQuestions += questions.length;
      } catch (e) {}
    });

    return {
      mcqCount: topicMcqs.length,
      questionCount: totalQuestions,
      materialCount: topicMaterials.length
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'mcq' | 'material') => {
    if (!selectedTopic || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    setIsLoading(true);

    try {
      const storage = getFirebaseStorage();
      if (!storage) throw new Error("Storage not initialized");

      const path = type === 'mcq' ? `syllabus-mcqs/${Date.now()}_${file.name}` : `syllabus-materials/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      
      toast({ title: 'Uploading...', description: `Uploading ${file.name} to storage` });
      
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      if (type === 'mcq') {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target?.result as string;
          try {
            JSON.parse(content); // Validate JSON
            await addSyllabusMCQ({
              topicId: selectedTopic.id,
              topicName: selectedTopic.name,
              subTopic: selectedSubTopic || undefined,
              fileName: file.name,
              content: content,
              uploadedAt: new Date()
            });
            const updated = await getSyllabusMCQs();
            setMcqs(updated);
            toast({ title: 'Success', description: 'MCQs uploaded and registered' });
          } catch (e) {
            toast({ title: 'Error', description: 'Invalid JSON format', variant: 'destructive' });
          }
        };
        reader.readAsText(file);
      } else {
        let contentToStore = downloadUrl;
        let isHtml = false;

        if (file.name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            contentToStore = result.value;
            isHtml = true;
            toast({ title: 'Conversion Success', description: 'DOCX converted to HTML Reader mode' });
        }

        await addSyllabusMaterial({
          topicId: selectedTopic.id,
          topicName: selectedTopic.name,
          subTopic: selectedSubTopic || undefined,
          fileName: file.name,
          fileType: isHtml ? 'docx' : 'pdf',
          content: contentToStore,
          uploadedAt: new Date()
        });
        const updated = await getSyllabusMaterials();
        setMaterials(updated);
        toast({ title: 'Success', description: isHtml ? 'Material converted and saved' : 'Study material uploaded' });
      }
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleMcqPaste = async () => {
    if (!selectedTopic || !mcqPasteValue) return;
    setIsLoading(true);
    try {
        JSON.parse(mcqPasteValue); // Validate JSON
        await addSyllabusMCQ({
            topicId: selectedTopic.id,
            topicName: selectedTopic.name,
            subTopic: selectedSubTopic || undefined,
            fileName: `Pasted_${new Date().getTime()}.json`,
            content: mcqPasteValue,
            uploadedAt: new Date()
        });
        const updated = await getSyllabusMCQs();
        setMcqs(updated);
        setMcqPasteValue('');
        setIsMcqPasteOpen(false);
        toast({ title: 'Success', description: 'MCQ JSON pasted successfully' });
    } catch (e) {
        toast({ title: 'Error', description: 'Invalid JSON format', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const processPastedText = (text: string) => {
    if (!useAutoHtml) return text;
    // Basic conversion: double newlines -> paragraphs, single -> br
    if (text.startsWith('<')) return text; // Already HTML likely
    
    return text
      .split(/\n\s*\n/)
      .map(para => `<p>${para.trim().replace(/\n/g, '<br/>')}</p>`)
      .join('\n');
  };

  const handleMaterialPaste = async () => {
    if (!selectedTopic || !materialPasteValue || !materialPasteTitle) {
        toast({ title: 'Missing Info', description: 'Title and Content are required', variant: 'destructive' });
        return;
    }
    setIsLoading(true);
    try {
        const htmlContent = processPastedText(materialPasteValue);
        const htmlContentTa = materialPasteValueTa ? processPastedText(materialPasteValueTa) : undefined;
        const htmlContentHi = materialPasteValueHi ? processPastedText(materialPasteValueHi) : undefined;
        
        await addSyllabusMaterial({
            topicId: selectedTopic.id,
            topicName: selectedTopic.name,
            subTopic: selectedSubTopic || undefined,
            fileName: materialPasteTitle,
            fileName_ta: materialPasteTitleTa || undefined,
            fileName_hi: materialPasteTitleHi || undefined,
            fileType: 'docx', // Defaulting to docx/html for pasted articles
            content: htmlContent,
            content_ta: htmlContentTa,
            content_hi: htmlContentHi,
            uploadedAt: new Date()
        });
        const updated = await getSyllabusMaterials();
        setMaterials(updated);
        setMaterialPasteValue('');
        setMaterialPasteValueTa('');
        setMaterialPasteValueHi('');
        setMaterialPasteTitle('');
        setMaterialPasteTitleTa('');
        setMaterialPasteTitleHi('');
        setIsMaterialPasteOpen(false);

        toast({ title: 'Success', description: 'Article converted and posted successfully' });
    } catch (e) {
        toast({ title: 'Error', description: 'Failed to save article', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };




  const handleDelete = async (id: string, type: 'mcq' | 'material') => {
    try {
      if (type === 'mcq') {
        await deleteSyllabusMCQ(id);
        setMcqs(prev => prev.filter(m => m.id !== id));
      } else {
        await deleteSyllabusMaterial(id);
        setMaterials(prev => prev.filter(m => m.id !== id));
      }
      toast({ title: 'Deleted', description: 'Resource removed successfully' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete resource', variant: 'destructive' });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMaterial) return;
    setIsLoading(true);
    try {
        const updateData = { 
            fileName: editTitle,
            fileName_ta: editTitleTa || undefined,
            fileName_hi: editTitleHi || undefined,
            content: editContent,
            content_ta: editContentTa || undefined,
            content_hi: editContentHi || undefined
        };
        await updateSyllabusMaterial(editingMaterial.id, updateData);
        setMaterials(prev => prev.map(m => m.id === editingMaterial.id ? { ...m, ...updateData } : m));
        setEditingMaterial(null);
        toast({ title: 'Success', description: 'Article content updated' });
    } catch (e) {
        toast({ title: 'Error', description: 'Failed to update content', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleSaveMcqEdit = async (newContent: string) => {
    if (!editingMcq) return;
    setIsLoading(true);
    try {
        await updateSyllabusMCQ(editingMcq.id, { content: newContent }); 
        setMcqs(prev => prev.map(m => m.id === editingMcq.id ? { ...m, content: newContent } : m));
        setEditingMcq(null);
        toast({ title: 'Success', description: 'MCQ bank updated' });
    } catch (e) {
        toast({ title: 'Error', description: 'Failed to update MCQ', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">

      {/* Syllabus Tree Sidebar */}
      <div className="lg:col-span-8 space-y-4">

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-red-600" />
                  Syllabus Explorer
                </CardTitle>
                <CardDescription>Select a topic to manage its dedicated content</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedExam} onValueChange={(v) => { setSelectedExam(v); setSelectedTopic(null); }}>
                  <SelectTrigger className="w-[160px] bg-white rounded-xl">
                    <SelectValue placeholder="Select Exam" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.keys(blueprints).map(exam => <SelectItem key={exam} value={exam}>{exam}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search topics..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 w-[200px] rounded-xl border-slate-200 bg-white shadow-sm"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
            <div className="divide-y divide-slate-100">
              {filteredBlueprint.parts.map((part: any, pIdx: number) => (
                <div key={pIdx} className="p-4 space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">{part.partName}</h4>
                  <div className="space-y-4">
                    {part.sections.map((section: any, sIdx: number) => (
                      <div key={sIdx} className="space-y-2">
                        <div className="flex items-center gap-2 px-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                          <span className="text-sm font-bold text-slate-700">{section.sectionName}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-1 pl-4">
                          {section.topics?.map((topic: any, tIdx: number) => {
                            const topicObj = typeof topic === 'string' 
                              ? { id: `${selectedExam}-${pIdx}-${sIdx}-${tIdx}`, name: topic } 
                              : { ...topic, id: topic.id || `${selectedExam}-${pIdx}-${sIdx}-${tIdx}` };
                            const stats = getTopicStats(topicObj.id);
                            const isActive = selectedTopic?.id === topicObj.id;

                            return (
                              <button
                                key={topicObj.id}
                                onClick={() => setSelectedTopic(topicObj)}
                                className={cn(
                                  "group flex items-center justify-between p-3 rounded-xl text-left transition-all",
                                  isActive 
                                    ? "bg-red-50 text-red-700 ring-1 ring-red-200" 
                                    : "hover:bg-slate-50 text-slate-600"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "p-1.5 rounded-lg",
                                    isActive ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400 group-hover:bg-white"
                                  )}>
                                    <BookOpen className="h-4 w-4" />
                                  </div>
                                  <span className="text-sm font-medium leading-tight">{topicObj.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {stats.mcqCount > 0 && (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 h-5 px-1.5 text-[10px] border-none font-bold">
                                      {stats.questionCount} Qs
                                    </Badge>
                                  )}
                                  {stats.materialCount > 0 && (
                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 h-5 px-1.5 text-[10px] border-none font-bold">
                                      PDF
                                    </Badge>
                                  )}
                                  <ChevronRight className={cn("h-4 w-4 opacity-0 transition-all", isActive ? "opacity-100" : "group-hover:opacity-40")} />
                                </div>
                              </button>
                            );
                          })}
                          {section.randomFrom && (
                            <div className="p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex items-center gap-3">
                               <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                                 <PlusCircle className="h-4 w-4" />
                               </div>
                               <div>
                                 <span className="text-xs font-bold text-slate-500 uppercase">Random From Mix</span>
                                 <p className="text-[10px] text-slate-400 leading-tight">These topics share a general question bank.</p>
                               </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Panel */}
      <div className="lg:col-span-4 space-y-6">
        {selectedTopic ? (
          <>
            <Card className="border-none shadow-md ring-1 ring-slate-100 overflow-hidden sticky top-24">
              <CardHeader className="bg-red-600 text-white relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Layers className="h-20 w-20" />
                </div>
                <CardDescription className="text-red-100 uppercase text-[10px] font-black tracking-widest mb-1">Editing Topic ID: {selectedTopic.id}</CardDescription>
                <CardTitle className="text-xl leading-tight">{selectedTopic.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="mcqs" className="w-full">
                  <TabsList className="w-full h-12 rounded-none bg-slate-50 border-b grid grid-cols-2 p-0">
                    <TabsTrigger value="mcqs" className="rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-red-600 font-bold">MCQ Bank</TabsTrigger>
                    <TabsTrigger value="materials" className="rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-red-600 font-bold">Study Materials</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="mcqs" className="p-6 mt-0">
                    <div className="space-y-4">
                      {selectedTopic.subTopics && selectedTopic.subTopics.length > 0 && (
                        <div className="space-y-2 pb-2 border-b border-slate-100">
                          <LabelWithIcon icon={<Layers className="h-4 w-4" />} label="Select Sub-topic" />
                          <Select value={selectedSubTopic} onValueChange={setSelectedSubTopic}>
                            <SelectTrigger className="w-full bg-white border-blue-100 ring-1 ring-blue-50">
                              <SelectValue placeholder="All Sub-topics" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">All Sub-topics</SelectItem>
                              {selectedTopic.subTopics.map(sub => (
                                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-slate-400 italic">Uploads will be associated with the selected sub-topic.</p>
                        </div>
                      )}

                      <div className="flex flex-col gap-2 mb-2">
                        <LabelWithIcon icon={<FileQuestion className="h-4 w-4" />} label="Question Papers" />
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer flex-1">
                            <div className={cn(
                              "flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all border border-red-100",
                              isLoading && "opacity-50 pointer-events-none"
                            )}>
                               {isLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : <Upload className="h-3 w-3" />}
                               Upload JSON
                            </div>
                            <input type="file" accept=".json" className="hidden" onChange={(e) => handleFileUpload(e, 'mcq')} disabled={isLoading} />
                          </label>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-blue-50 text-blue-600 border-blue-100 rounded-xl hover:bg-blue-100"
                            onClick={() => setIsMcqPasteOpen(true)}
                          >
                            <Code2 className="h-3 w-3 mr-2" />
                            Paste JSON
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {mcqs.filter(m => (m.topicId === selectedTopic.id || (m as any).topicName === selectedTopic.name) && (!selectedSubTopic || selectedSubTopic === 'none' || m.subTopic === selectedSubTopic)).map(mcq => {
                          const isShared = mcq.topicId !== selectedTopic.id;
                          return (
                            <div key={mcq.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group border border-transparent hover:border-slate-200 transition-all">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className={cn(
                                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                  isShared ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                                )}>
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="overflow-hidden">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-700 truncate">{mcq.fileName}</p>
                                    {isShared && (
                                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[8px] font-black rounded uppercase">Shared</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">
                                      {normalizeDate(mcq.uploadedAt)?.toLocaleDateString() || 'Just now'}
                                    </p>
                                    {mcq.subTopic && (
                                      <Badge variant="outline" className="h-4 px-1 text-[8px] font-black bg-white border-blue-100 text-blue-600 uppercase">
                                        {mcq.subTopic}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" 
                                    onClick={() => setEditingMcq(mcq)}
                                  >
                                    <Code2 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(mcq.id, 'mcq')}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                              </div>
                            </div>
                          );
                        })}
                        {mcqs.filter(m => (m.topicId === selectedTopic.id || (m as any).topicName === selectedTopic.name) && (!selectedSubTopic || selectedSubTopic === 'none' || m.subTopic === selectedSubTopic)).length === 0 && (
                          <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                            <AlertCircle className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 font-medium">No MCQs found for this {selectedSubTopic && selectedSubTopic !== 'none' ? `sub-topic: ${selectedSubTopic}` : 'topic'}.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="materials" className="p-6 mt-0">
                    <div className="space-y-4">
                      {selectedTopic.subTopics && selectedTopic.subTopics.length > 0 && (
                        <div className="space-y-2 pb-2 border-b border-slate-100">
                          <LabelWithIcon icon={<Layers className="h-4 w-4" />} label="Select Sub-topic" />
                          <Select value={selectedSubTopic} onValueChange={setSelectedSubTopic}>
                            <SelectTrigger className="w-full bg-white border-emerald-100 ring-1 ring-emerald-50">
                              <SelectValue placeholder="All Sub-topics" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">All Sub-topics</SelectItem>
                              {selectedTopic.subTopics.map(sub => (
                                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-slate-400 italic">Uploads will be associated with the selected sub-topic.</p>
                        </div>
                      )}

                      <div className="flex flex-col gap-2 mb-2">
                        <LabelWithIcon icon={<BookOpen className="h-4 w-4" />} label="Study Materials" />
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer flex-1">
                            <div className={cn(
                              "flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all border border-emerald-100",
                              isLoading && "opacity-50 pointer-events-none"
                            )}>
                               {isLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : <Upload className="h-3 w-3" />}
                               Upload PDF/DOCX
                            </div>
                            <input type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => handleFileUpload(e, 'material')} disabled={isLoading} />
                          </label>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-orange-50 text-orange-600 border-orange-100 rounded-xl hover:bg-orange-100"
                            onClick={() => setIsMaterialPasteOpen(true)}
                          >
                            <FileCode className="h-3 w-3 mr-2" />
                            Paste Article
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {materials.filter(m => (m.topicId === selectedTopic.id || (m as any).topicName === selectedTopic.name) && (!selectedSubTopic || selectedSubTopic === 'none' || m.subTopic === selectedSubTopic)).map(mat => {
                          const isShared = mat.topicId !== selectedTopic.id;
                          return (
                            <div key={mat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group border border-transparent hover:border-slate-200 transition-all">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className={cn(
                                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                  isShared ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600"
                                )}>
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="overflow-hidden">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-700 truncate">{mat.fileName}</p>
                                    {isShared && (
                                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[8px] font-black rounded uppercase">Shared</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">
                                      {normalizeDate(mat.uploadedAt)?.toLocaleDateString() || 'Just now'}
                                    </p>
                                    {mat.subTopic && (
                                      <Badge variant="outline" className="h-4 px-1 text-[8px] font-black bg-white border-emerald-100 text-emerald-600 uppercase">
                                        {mat.subTopic}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                  {(mat.fileType === 'docx' || (mat.content && mat.content.startsWith('<'))) && (
                                      <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" 
                                          onClick={() => {
                                              setEditingMaterial(mat);
                                              setEditContent(mat.content);
                                              setEditContentTa(mat.content_ta || '');
                                              setEditContentHi(mat.content_hi || '');
                                              setEditTitle(mat.fileName);
                                              setEditTitleTa(mat.fileName_ta || '');
                                              setEditTitleHi(mat.fileName_hi || '');
                                          }}
                                      >
                                          <FileText className="h-4 w-4" />
                                      </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(mat.id, 'material')}>
                                  <Trash2 className="h-4 w-4" />
                                  </Button>
                              </div>
                            </div>
                          );
                        })}
                        {materials.filter(m => (m.topicId === selectedTopic.id || (m as any).topicName === selectedTopic.name) && (!selectedSubTopic || selectedSubTopic === 'none' || m.subTopic === selectedSubTopic)).length === 0 && (
                          <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                            <AlertCircle className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 font-medium">No PDF materials found for this {selectedSubTopic && selectedSubTopic !== 'none' ? `sub-topic: ${selectedSubTopic}` : 'topic'}.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-sm bg-blue-50/50 p-4">
               <div className="flex gap-3">
                 <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                 </div>
                 <div>
                    <h5 className="text-sm font-bold text-blue-900">Pro Tip</h5>
                    <p className="text-[11px] text-blue-700 leading-tight">These materials are tied to the unique Syllabus ID. Users will see these in their Syllabus Explorer after the final migration.</p>
                 </div>
               </div>
            </Card>
          </>
        ) : (
          <div className="h-[400px] border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center p-8 text-center sticky top-24">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <Layers className="h-8 w-8 text-slate-200" />
            </div>
            <h4 className="font-bold text-slate-400">No Topic Selected</h4>
            <p className="text-xs text-slate-300 max-w-[200px] mt-1">Select a topic from the syllabus tree to start managing content.</p>
          </div>
        )}
      </div>
    </div>

    {/* MCQ Paste Dialog */}
      <Dialog open={isMcqPasteOpen} onOpenChange={setIsMcqPasteOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Paste MCQ JSON Bank</DialogTitle>
            <DialogDescription>Paste your structured JSON question array here. See the format guide below.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <Label>JSON Content</Label>
              <Textarea 
                placeholder="[ { 'question': '...', 'options': [...], 'correct': 0 }, ... ]"
                className="h-[300px] font-mono text-xs"
                value={mcqPasteValue}
                onChange={(e) => setMcqPasteValue(e.target.value)}
              />
            </div>
            <div className="bg-slate-50 p-4 rounded-xl overflow-y-auto max-h-[400px]">
              <JsonFormatGuide type="topic-mcq" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsMcqPasteOpen(false)}>Cancel</Button>
            <Button onClick={handleMcqPaste} disabled={isLoading || !mcqPasteValue} className="bg-red-600 hover:bg-red-700">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Save Questions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material Paste Dialog */}
      <Dialog open={isMaterialPasteOpen} onOpenChange={setIsMaterialPasteOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Paste Study Article</DialogTitle>
            <DialogDescription>Directly paste HTML or text content to create a digital study material.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
              <Tabs defaultValue="en" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="en">English Content</TabsTrigger>
                  <TabsTrigger value="ta">Tamil Content</TabsTrigger>
                  <TabsTrigger value="hi">Hindi Content</TabsTrigger>
                </TabsList>
                
                <TabsContent value="en" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>English Title</Label>
                      <Input 
                        placeholder="English Title..." 
                        value={materialPasteTitle}
                        onChange={(e) => setMaterialPasteTitle(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-1">
                              <Label>English Content</Label>
                              <div className="flex items-center gap-2">
                                <Label htmlFor="auto-html-en" className="text-[10px] text-slate-400 font-bold uppercase">Format Text</Label>
                                <Switch 
                                    id="auto-html-en" 
                                    checked={useAutoHtml} 
                                    onCheckedChange={setUseAutoHtml}
                                    className="scale-75"
                                />
                                <Badge variant="outline" className={cn(
                                    "text-[10px]",
                                    useAutoHtml ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                )}>
                                    {useAutoHtml ? 'Line Breaks Enabled' : 'Raw Content Mode'}
                                </Badge>
                              </div>
                          </div>
                          <Textarea 
                            placeholder="Paste your English Word content here..."
                            className="h-[300px] font-sans text-sm"
                            value={materialPasteValue}
                            onChange={(e) => setMaterialPasteValue(e.target.value)}
                          />
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl overflow-y-auto border">
                          <Label className="mb-2 block text-xs font-bold uppercase text-slate-400">English Preview</Label>
                          <div 
                            className="prose prose-slate prose-sm max-w-none bg-white p-4 rounded-lg shadow-inner min-h-[250px]"
                            dangerouslySetInnerHTML={{ __html: processPastedText(materialPasteValue) || '<p class="text-slate-300 italic">Preview will appear here...</p>' }}
                          />
                        </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ta" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tamil Title (Optional)</Label>
                      <Input 
                        placeholder="தலைப்பு (தமிழ்)..." 
                        value={materialPasteTitleTa}
                        onChange={(e) => setMaterialPasteTitleTa(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-1">
                              <Label>Tamil Content</Label>
                              <div className="flex items-center gap-2">
                                <Label htmlFor="auto-html-ta" className="text-[10px] text-slate-400 font-bold uppercase">Format Text</Label>
                                <Switch 
                                    id="auto-html-ta" 
                                    checked={useAutoHtml} 
                                    onCheckedChange={setUseAutoHtml}
                                    className="scale-75"
                                />
                                <Badge variant="outline" className={cn(
                                    "text-[10px]",
                                    useAutoHtml ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                )}>
                                    {useAutoHtml ? 'Line Breaks Enabled' : 'Raw Content Mode'}
                                </Badge>
                              </div>
                          </div>
                          <Textarea 
                            placeholder="தமிழ் உள்ளடக்கத்தை இங்கே ஒட்டவும்..."
                            className="h-[300px] font-sans text-sm"
                            value={materialPasteValueTa}
                            onChange={(e) => setMaterialPasteValueTa(e.target.value)}
                          />
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl overflow-y-auto border">
                          <Label className="mb-2 block text-xs font-bold uppercase text-slate-400">Tamil Preview</Label>
                          <div 
                            className="prose prose-slate prose-sm max-w-none bg-white p-4 rounded-lg shadow-inner min-h-[250px]"
                            dangerouslySetInnerHTML={{ __html: processPastedText(materialPasteValueTa) || '<p class="text-slate-300 italic">Preview will appear here...</p>' }}
                          />
                        </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="hi" className="space-y-4">
                   <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Hindi Title (Optional)</Label>
                      <Input 
                        placeholder="शीर्षक (हिंदी)..." 
                        value={materialPasteTitleHi}
                        onChange={(e) => setMaterialPasteTitleHi(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-1">
                              <Label>Hindi Content</Label>
                              <div className="flex items-center gap-2">
                                <Label htmlFor="auto-html-hi" className="text-[10px] text-slate-400 font-bold uppercase">Format Text</Label>
                                <Switch 
                                    id="auto-html-hi" 
                                    checked={useAutoHtml} 
                                    onCheckedChange={setUseAutoHtml}
                                    className="scale-75"
                                />
                                <Badge variant="outline" className={cn(
                                    "text-[10px]",
                                    useAutoHtml ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                )}>
                                    {useAutoHtml ? 'Line Breaks Enabled' : 'Raw Content Mode'}
                                </Badge>
                              </div>
                          </div>
                          <Textarea 
                            placeholder="हिंदी सामग्री यहाँ पेस्ट करें..."
                            className="h-[300px] font-sans text-sm"
                            value={materialPasteValueHi}
                            onChange={(e) => setMaterialPasteValueHi(e.target.value)}
                          />
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl overflow-y-auto border">
                          <Label className="mb-2 block text-xs font-bold uppercase text-slate-400">Hindi Preview</Label>
                          <div 
                            className="prose prose-slate prose-sm max-w-none bg-white p-4 rounded-lg shadow-inner min-h-[250px]"
                            dangerouslySetInnerHTML={{ __html: processPastedText(materialPasteValueHi) || '<p class="text-slate-300 italic">Preview will appear here...</p>' }}
                          />
                        </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          <DialogFooter className="mt-6">

            <Button variant="outline" onClick={() => setIsMaterialPasteOpen(false)}>Cancel</Button>
            <Button onClick={handleMaterialPaste} disabled={isLoading || !materialPasteValue || !materialPasteTitle} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Publish Article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editing Dialog */}
      <Dialog open={!!editingMaterial} onOpenChange={(open) => !open && setEditingMaterial(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 border-b">
                <DialogTitle>Edit Study Article</DialogTitle>
                <DialogDescription>Content for {editingMaterial?.fileName}</DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-hidden flex flex-col">
              <Tabs defaultValue="en" className="flex-grow flex flex-col overflow-hidden">
                <TabsList className="grid w-full grid-cols-3 rounded-none border-b h-12">
                  <TabsTrigger value="en" className="font-bold">English</TabsTrigger>
                  <TabsTrigger value="ta" className="font-bold">Tamil</TabsTrigger>
                  <TabsTrigger value="hi" className="font-bold">Hindi</TabsTrigger>
                </TabsList>

                <TabsContent value="en" className="flex-grow flex flex-col overflow-hidden m-0 p-0">
                  <div className="flex-grow grid grid-cols-2 overflow-hidden">
                    <div className="p-6 border-r flex flex-col gap-4 overflow-y-auto">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-slate-400">English Title</Label>
                          <Input 
                            value={editTitle} 
                            onChange={(e) => setEditTitle(e.target.value)} 
                            className="font-bold border-slate-200"
                          />
                        </div>
                        <div className="flex-grow flex flex-col gap-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-slate-400">HTML Content</Label>
                          <Textarea 
                              value={editContent} 
                              onChange={(e) => setEditContent(e.target.value)} 
                              className="flex-grow font-mono text-xs resize-none border-slate-200"
                          />
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 overflow-y-auto">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 block">English Preview</Label>
                        <div 
                            className="prose prose-slate max-w-none bg-white p-8 rounded-2xl shadow-sm min-h-full border border-slate-200"
                            dangerouslySetInnerHTML={{ __html: editContent }}
                        />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ta" className="flex-grow flex flex-col overflow-hidden m-0 p-0">
                  <div className="flex-grow grid grid-cols-2 overflow-hidden">
                    <div className="p-6 border-r flex flex-col gap-4 overflow-y-auto">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Tamil Title</Label>
                          <Input 
                            value={editTitleTa} 
                            onChange={(e) => setEditTitleTa(e.target.value)} 
                            className="font-bold border-slate-200"
                            placeholder="தலைப்பை இங்கே உள்ளிடவும்..."
                          />
                        </div>
                        <div className="flex-grow flex flex-col gap-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Tamil HTML Content</Label>
                          <Textarea 
                              value={editContentTa} 
                              onChange={(e) => setEditContentTa(e.target.value)} 
                              className="flex-grow font-mono text-xs resize-none border-slate-200"
                              placeholder="உள்ளடக்கத்தை இங்கே உள்ளிடவும்..."
                          />
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 overflow-y-auto">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 block">Tamil Preview</Label>
                        <div 
                            className="prose prose-slate max-w-none bg-white p-8 rounded-2xl shadow-sm min-h-full border border-slate-200"
                            dangerouslySetInnerHTML={{ __html: editContentTa }}
                        />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="hi" className="flex-grow flex flex-col overflow-hidden m-0 p-0">
                  <div className="flex-grow grid grid-cols-2 overflow-hidden">
                    <div className="p-6 border-r flex flex-col gap-4 overflow-y-auto">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Hindi Title</Label>
                          <Input 
                            value={editTitleHi} 
                            onChange={(e) => setEditTitleHi(e.target.value)} 
                            className="font-bold border-slate-200"
                            placeholder="यहाँ शीर्षक दर्ज करें..."
                          />
                        </div>
                        <div className="flex-grow flex flex-col gap-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Hindi HTML Content</Label>
                          <Textarea 
                              value={editContentHi} 
                              onChange={(e) => setEditContentHi(e.target.value)} 
                              className="flex-grow font-mono text-xs resize-none border-slate-200"
                              placeholder="यहाँ सामग्री दर्ज करें..."
                          />
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 overflow-y-auto">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 block">Hindi Preview</Label>
                        <div 
                            className="prose prose-slate max-w-none bg-white p-8 rounded-2xl shadow-sm min-h-full border border-slate-200"
                            dangerouslySetInnerHTML={{ __html: editContentHi }}
                        />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <DialogFooter className="p-4 border-t bg-slate-50">
                <Button variant="outline" onClick={() => setEditingMaterial(null)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* MCQ Editor Dialog */}
      <Dialog open={!!editingMcq} onOpenChange={(open) => !open && setEditingMcq(null)}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 border-b">
                <DialogTitle>Structured MCQ Editor</DialogTitle>
                <DialogDescription>Managing questions for: {editingMcq?.fileName}</DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-hidden px-6 pt-2 pb-6">
                {editingMcq && (
                  <MCQStructuredEditor 
                    initialContent={editingMcq?.content || ''} 
                    onSave={handleSaveMcqEdit} 
                    onCancel={() => setEditingMcq(null)} 
                  />
                )}
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


