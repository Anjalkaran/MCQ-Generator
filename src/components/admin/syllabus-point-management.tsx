
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  getSyllabusMCQs, 
  getSyllabusMaterials, 
  addSyllabusMCQ, 
  addSyllabusMaterial,
  deleteSyllabusMCQ,
  deleteSyllabusMaterial,
  updateSyllabusMaterial
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
  Search
} from 'lucide-react';
import { getFirebaseStorage, getFirebaseAuth } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SyllabusPointManagementProps {
  initialMCQs: TopicMCQ[];
  initialMaterials: StudyMaterial[];
}

const BLUEPRINTS: Record<string, any> = {
  MTS: MTS_BLUEPRINT,
  POSTMAN: POSTMAN_BLUEPRINT,
  PA: PA_BLUEPRINT,
  IP: IP_BLUEPRINT,
  'GROUP B': GROUPB_BLUEPRINT
};

export function SyllabusPointManagement({ initialMCQs, initialMaterials }: SyllabusPointManagementProps) {
  const [selectedExam, setSelectedExam] = useState<string>('IP');
  const [mcqs, setMcqs] = useState<TopicMCQ[]>(initialMCQs);
  const [materials, setMaterials] = useState<StudyMaterial[]>(initialMaterials);
  const [selectedTopic, setSelectedTopic] = useState<SyllabusTopic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMaterial, setEditingMaterial] = useState<StudyMaterial | null>(null);
  const [editContent, setEditContent] = useState('');
  const { toast } = useToast();

  const currentBlueprint = BLUEPRINTS[selectedExam];

  const filteredBlueprint = useMemo(() => {
    if (!searchTerm) return currentBlueprint;
    
    // Deep clone and filter
    const cloned = JSON.parse(JSON.stringify(currentBlueprint));
    cloned.parts = cloned.parts.map((part: any) => ({
      ...part,
      sections: part.sections.map((section: any) => ({
        ...section,
        topics: section.topics?.filter((topic: any) => {
           const name = typeof topic === 'string' ? topic : topic.name;
           return name.toLowerCase().includes(searchTerm.toLowerCase());
        })
      })).filter((section: any) => section.topics?.length > 0 || section.randomFrom)
    })).filter((part: any) => part.sections.length > 0);
    
    return cloned;
  }, [currentBlueprint, searchTerm]);

  const getTopicStats = (topicId: string) => {
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
        await updateSyllabusMaterial(editingMaterial.id, { content: editContent });
        setMaterials(prev => prev.map(m => m.id === editingMaterial.id ? { ...m, content: editContent } : m));
        setEditingMaterial(null);
        toast({ title: 'Success', description: 'Article content updated' });
    } catch (e) {
        toast({ title: 'Error', description: 'Failed to update content', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
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
                    {Object.keys(BLUEPRINTS).map(exam => <SelectItem key={exam} value={exam}>{exam}</SelectItem>)}
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
                            const topicObj = typeof topic === 'string' ? { id: `${selectedExam}-${pIdx}-${sIdx}-${tIdx}`, name: topic } : topic;
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
                      <div className="flex items-center justify-between mb-2">
                        <LabelWithIcon icon={<FileQuestion className="h-4 w-4" />} label="Question Papers" />
                        <label className="cursor-pointer">
                          <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all",
                            isLoading && "opacity-50 pointer-events-none"
                          )}>
                             {isLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : <Upload className="h-3 w-3" />}
                             Upload JSON
                          </div>
                          <input type="file" accept=".json" className="hidden" onChange={(e) => handleFileUpload(e, 'mcq')} disabled={isLoading} />
                        </label>
                      </div>

                      <div className="space-y-2">
                        {mcqs.filter(m => m.topicId === selectedTopic.id).map(mcq => (
                          <div key={mcq.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group border border-transparent hover:border-slate-200 transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-sm font-bold text-slate-700 truncate">{mcq.fileName}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">{new Date(mcq.uploadedAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(mcq.id, 'mcq')}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {mcqs.filter(m => m.topicId === selectedTopic.id).length === 0 && (
                          <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                            <AlertCircle className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 font-medium">No MCQs uploaded for this topic.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="materials" className="p-6 mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <LabelWithIcon icon={<BookOpen className="h-4 w-4" />} label="Study Materials" />
                        <label className="cursor-pointer">
                          <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all",
                            isLoading && "opacity-50 pointer-events-none"
                          )}>
                             {isLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : <Upload className="h-3 w-3" />}
                             Upload PDF/DOCX
                          </div>
                          <input type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => handleFileUpload(e, 'material')} disabled={isLoading} />
                        </label>
                      </div>

                      <div className="space-y-2">
                        {materials.filter(m => m.topicId === selectedTopic.id).map(mat => (
                          <div key={mat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group border border-transparent hover:border-slate-200 transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-sm font-bold text-slate-700 truncate">{mat.fileName}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">{new Date(mat.uploadedAt).toLocaleDateString()}</p>
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
                        ))}
                        {materials.filter(m => m.topicId === selectedTopic.id).length === 0 && (
                          <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                            <AlertCircle className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 font-medium">No PDF materials found for this topic.</p>
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

      {/* Editing Dialog */}
      <Dialog open={!!editingMaterial} onOpenChange={(open) => !open && setEditingMaterial(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 border-b">
                <DialogTitle>Edit Study Article</DialogTitle>
                <DialogDescription>Content for {editingMaterial?.fileName}</DialogDescription>
            </DialogHeader>
            <div className="flex-grow grid grid-cols-2 overflow-hidden">
                <div className="p-6 border-r flex flex-col gap-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">HTML Content</Label>
                    <Textarea 
                        value={editContent} 
                        onChange={(e) => setEditContent(e.target.value)} 
                        className="flex-grow font-mono text-xs resize-none"
                    />
                </div>
                <div className="p-6 bg-slate-50 overflow-y-auto">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 block">Live Premium Preview</Label>
                    <div 
                        className="prose prose-slate max-w-none bg-white p-8 rounded-2xl shadow-sm min-h-full"
                        dangerouslySetInnerHTML={{ __html: editContent }}
                    />
                </div>
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
    </div>
  );
}

function LabelWithIcon({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-slate-400">{icon}</div>
      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}
