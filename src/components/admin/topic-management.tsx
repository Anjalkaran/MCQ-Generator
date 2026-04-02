
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addCategory, addTopic, deleteTopic, deleteCategory, updateCategory, updateTopic } from '@/lib/firestore';
import type { Topic, Category, TopicMCQ } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, Edit, Search, BookOpen, Layers, Filter, MoreVertical, FileText, CheckCircle2, AlertCircle, Upload, HelpCircle, FileQuestion } from 'lucide-react';
import { getFirebaseStorage, getFirebaseAuth } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

const examCategories = ["MTS", "POSTMAN", "PA", "IP"] as const;
const parts = ["Part A", "Part B", "Paper I", "Paper II", "Paper III", "Paper-I", "Paper-III"] as const;

const categorySchema = z.object({
  name: z.string().min(2, { message: 'Category name must be at least 2 characters.' }),
  examCategories: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one exam category.",
  }),
});

const topicSchema = z.object({
  title: z.string().min(3, { message: 'Topic title is required.' }),
  description: z.string().optional(),
  categoryId: z.string({ required_error: 'Please select a category.' }),
  part: z.enum(parts, { required_error: 'You must select a part.'}),
  examCategories: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one exam category.",
  }),
  file: z.any().optional(),
});

interface TopicManagementProps {
    initialCategories: Category[];
    initialTopics: Topic[];
    initialTopicMCQs: TopicMCQ[];
}

export function TopicManagement({ initialCategories, initialTopics, initialTopicMCQs }: TopicManagementProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [topicMCQs, setTopicMCQs] = useState<TopicMCQ[]>(initialTopicMCQs);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [isLoadingTopic, setIsLoadingTopic] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [partFilter, setPartFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'topics' | 'categories'>('topics');
  
  const { toast } = useToast();

  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', examCategories: [] },
  });

  const topicForm = useForm<z.infer<typeof topicSchema>>({
    resolver: zodResolver(topicSchema),
    defaultValues: { title: '', description: '', categoryId: '', part: undefined, examCategories: [] },
  });

  useEffect(() => {
    if (editingCategory) {
        categoryForm.reset(editingCategory);
    } else {
        categoryForm.reset({ name: '', examCategories: [] });
    }
  }, [editingCategory, categoryForm]);

  useEffect(() => {
    if (editingTopic) {
        topicForm.reset({
            title: editingTopic.title,
            description: editingTopic.description,
            categoryId: editingTopic.categoryId,
            part: editingTopic.part,
            examCategories: editingTopic.examCategories,
        });
    } else {
        topicForm.reset({ title: '', description: '', categoryId: '', part: undefined, examCategories: [], file: undefined });
    }
  }, [editingTopic, topicForm]);

  const onCategorySubmit = async (values: z.infer<typeof categorySchema>) => {
    setIsLoadingCategory(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, values as any);
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...values } : c).sort((a,b) => a.name.localeCompare(b.name)) as any);
        toast({ title: 'Success', description: 'Category updated.' });
        setEditingCategory(null);
        setIsCategoryDialogOpen(false); 
      } else {
        const newCategoryDoc = await addCategory(values as any);
        const newCategory = { id: newCategoryDoc.id, ...values };
        setCategories(prev => [...prev, newCategory].sort((a,b) => a.name.localeCompare(b.name)) as any);
        toast({ title: 'Success', description: 'New category added.' });
        categoryForm.reset({ name: '', examCategories: [] });
        setIsCategoryDialogOpen(false);
      }
    } catch (error) {
      toast({ title: 'Error', description: editingCategory ? 'Failed to update category.' : 'Failed to add category.', variant: 'destructive' });
    } finally {
        setIsLoadingCategory(false);
    }
  };

  const onTopicSubmit = async (values: z.infer<typeof topicSchema>) => {
    try {
        let topicId = editingTopic?.id;
        let finalTopicData = { ...values, description: values.description || '' };
        
        if (editingTopic) {
            await updateTopic(editingTopic.id, finalTopicData as any);
            setTopics(prev => prev.map(t => t.id === editingTopic.id ? { ...t, ...finalTopicData } : t).sort((a,b) => a.title.localeCompare(b.title)) as any);
            toast({ title: 'Success', description: 'Topic basic info updated.' });
        } else {
            const topicData = { ...values, description: values.description || '', icon: 'default' };
            const newTopicDoc = await addTopic(topicData as any);
            topicId = newTopicDoc.id;
            const newTopic = { id: topicId, ...topicData };
            setTopics(prev => [...prev, newTopic].sort((a,b) => a.title.localeCompare(b.title)) as any);
            toast({ title: 'Success', description: 'New topic added.' });
        }

        // Handle PDF Upload if present
        if (values.file && values.file.length > 0) {
            const file = values.file[0];
            const storage = getFirebaseStorage();
            if (!storage) throw new Error("Firebase Storage not initialized.");

            toast({ title: 'Uploading PDF...', description: 'Sending file to Firebase Storage and extracting content.' });
            
            const storagePath = `study-materials/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file, { contentType: 'application/pdf' });
            const downloadUrl = await getDownloadURL(storageRef);

            const auth = getFirebaseAuth();
            const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : null;

            const response = await fetch('/api/study-material/upload', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': idToken ? `Bearer ${idToken}` : ''
                },
                body: JSON.stringify({
                    topicName: values.title,
                    contentUrl: downloadUrl,
                    fileName: file.name,
                    examCategories: values.examCategories
                }),
            });

            if (response.ok) {
                toast({ title: 'PDF Ready', description: 'Study material registered and AI index updated.' });
            } else {
                toast({ title: 'PDF Error', description: 'File uploaded but text extraction failed.', variant: 'destructive' });
            }
        }

        setEditingTopic(null);
        setIsTopicDialogOpen(false);
        topicForm.reset({ title: '', description: '', categoryId: '', part: undefined, examCategories: [], file: undefined });
    } catch (error) {
      toast({ title: 'Error', description: 'Operation failed. Check your connection.', variant: 'destructive' });
    } finally {
        setIsLoadingTopic(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
        await deleteTopic(topicId);
        setTopics(prev => prev.filter(t => t.id !== topicId));
        toast({ title: 'Success', description: 'Topic deleted.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete topic.', variant: 'destructive' });
    }
  };
  
  const handleDeleteCategory = async (categoryId: string) => {
    try {
        const topicsToDelete = topics.filter(topic => topic.categoryId === categoryId);
        await deleteCategory(categoryId, topicsToDelete);
        setCategories(prev => prev.filter(c => c.id !== categoryId));
        setTopics(prev => prev.filter(t => t.categoryId !== categoryId));
        toast({ title: 'Success', description: 'Category and its topics deleted.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete category.', variant: 'destructive' });
    }
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'N/A';
  }

  const filteredTopics = useMemo(() => {
    let result = topics;
    
    if (partFilter !== 'all') {
      result = result.filter(t => {
        if (partFilter === 'Paper I') return t.part === 'Paper I' || (t as any).part === 'Paper-I';
        if (partFilter === 'Paper III') return t.part === 'Paper III' || (t as any).part === 'Paper-III';
        return t.part === partFilter;
      });
    }
    
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || getCategoryName(t.categoryId).toLowerCase().includes(q));
    }
    
    return result;
  }, [searchTerm, partFilter, topics, categories]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, categories]);

  const getMCQCount = (topicId: string) => {
    const mcqDocs = topicMCQs.filter(m => m.topicId === topicId);
    if (mcqDocs.length === 0) return 0;
    
    return mcqDocs.reduce((total, mcqObj) => {
      try {
        const parsed = typeof mcqObj.content === 'string' ? JSON.parse(mcqObj.content) : mcqObj.content;
        const questions = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || []);
        return total + (Array.isArray(questions) ? questions.length : 0);
      } catch (e) {
        return total;
      }
    }, 0);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Layers className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tight">Total Categories</p>
              <h4 className="text-xl font-bold text-blue-900">{categories.length}</h4>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-orange-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><BookOpen className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-tight">Total Topics</p>
              <h4 className="text-xl font-bold text-orange-900">{topics.length}</h4>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-red-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-red-100 rounded-lg text-red-600"><FileText className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-tight">MCQ Coverage</p>
              <h4 className="text-xl font-bold text-red-900">{topicMCQs.length} <small className="text-[10px] text-slate-400 font-normal ml-1">topics loaded</small></h4>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="topics" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">All Topics</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Categories</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {activeTab === 'topics' && (
              <Select value={partFilter} onValueChange={setPartFilter}>
                <SelectTrigger className="w-[130px] rounded-xl h-10 border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <SelectValue placeholder="All Parts" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Parts</SelectItem>
                  {parts.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
              <Input 
                placeholder={`Search ${activeTab}...`} 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 w-full sm:w-[240px] rounded-xl border-slate-200 bg-white shadow-sm transition-all focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            {activeTab === 'topics' ? (
              <Button onClick={() => { setEditingTopic(null); setIsTopicDialogOpen(true); }} className="h-10 rounded-xl bg-red-600 hover:bg-red-700 shadow-md shadow-red-200">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Topic
              </Button>
            ) : (
              <Button onClick={() => { setEditingCategory(null); setIsCategoryDialogOpen(true); }} className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 shadow-md">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Category
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="topics" className="mt-0 space-y-4">
          <Card className="border-none shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[300px]">Topic Details</TableHead>
                  <TableHead>Course Level</TableHead>
                  <TableHead>Materials</TableHead>
                  <TableHead>MCQ Status</TableHead>
                  <TableHead className="text-right pr-6">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTopics.length > 0 ? (
                  filteredTopics.map((topic) => (
                    <TableRow key={topic.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{topic.title}</span>
                          <span className="text-xs text-slate-400 font-medium">{getCategoryName(topic.categoryId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="bg-slate-50 text-[10px] font-bold border-slate-200">{topic.part}</Badge>
                          {topic.examCategories?.map(ec => (
                            <Badge key={ec} className={cn("text-[9px] px-1.5 h-4 font-black border-none", 
                              ec === 'MTS' ? 'bg-blue-100 text-blue-600' : 
                              ec === 'POSTMAN' ? 'bg-orange-100 text-orange-600' :
                              ec === 'PA' ? 'bg-purple-100 text-purple-600' : 'bg-red-100 text-red-600'
                            )}>{ec}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {topic.material ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px]">
                            <CheckCircle2 className="h-3 w-3" /> PDF Loaded
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[10px]">
                            <AlertCircle className="h-3 w-3" /> Missing PDF
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getMCQCount(topic.id) > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-red-600 font-bold text-[10px]">
                              <CheckCircle2 className="h-3 w-3" /> {getMCQCount(topic.id)} Questions
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium ml-4.5">Ready for test</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[10px]">
                            <HelpCircle className="h-3 w-3" /> No MCQs
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6 space-x-1">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                              title="Manage MCQs"
                              asChild
                            >
                              <a href={`/dashboard/admin?section=topic-mcq#${topic.id}`} onClick={(e) => {
                                e.preventDefault();
                                // We need to reach the parent's setActiveSection. 
                                // Since we are in a sub-component, we might need a prop or just use window location if it reacts.
                                // For now, since it's a SPA-ish dashboard, let's assume the user can click it.
                                // Actually, better to just edit the topic or add a button that the parent can handle.
                                // But since we don't have a callback for "switch section", let's just trigger a custom event or check if we can pass it.
                                window.dispatchEvent(new CustomEvent('switch-admin-section', { detail: { section: 'topic-mcq', topicId: topic.id } }));
                              }}>
                                <FileQuestion className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100" onClick={() => { setEditingTopic(topic); setIsTopicDialogOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-3xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Topic?</AlertDialogTitle>
                                  <AlertDialogDescription>Are you sure you want to delete <strong className="text-slate-900">{topic.title}</strong>? This will remove all associated study materials and MCQ links.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTopic(topic.id)} className="bg-red-600 hover:bg-red-700 rounded-xl">Delete Forever</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-400 italic">No topics found matching your search.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-0">
          <Card className="border-none shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[300px]">Category Name</TableHead>
                  <TableHead>Topic Count</TableHead>
                  <TableHead>Available For</TableHead>
                  <TableHead className="text-right pr-6">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => {
                    const count = topics.filter(t => t.categoryId === cat.id).length;
                    return (
                      <TableRow key={cat.id} className="hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="font-bold text-slate-900">{cat.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold">{count} Topics</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {cat.examCategories?.map(ec => <Badge key={ec} className="text-[9px] px-1.5 h-4 font-black bg-slate-900 text-white border-none">{ec}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                           <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100" onClick={() => { setEditingCategory(cat); setIsCategoryDialogOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-3xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                                  <AlertDialogDescription>Deleting <strong className="text-slate-900">{cat.name}</strong> will also delete <strong className="text-red-600">{count} topics</strong> inside it. This cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)} className="bg-red-600 hover:bg-red-700 rounded-xl">Delete All</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                           </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow><TableCell colSpan={4} className="h-48 text-center text-slate-400 italic">No categories found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={(isOpen) => { setIsCategoryDialogOpen(isOpen); if (!isOpen) setEditingCategory(null); }}>
          <DialogContent className="rounded-3xl max-w-md">
              <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-red-600" />
                    {editingCategory ? 'Edit Category' : 'New Category'}
                  </DialogTitle>
                  <DialogDescription>Define a group for related topics like Postal Manuals or GK.</DialogDescription>
              </DialogHeader>
              <Form {...categoryForm}>
                  <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-6 pt-4">
                      <FormField
                        control={categoryForm.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold text-slate-700 text-xs uppercase">Category Name</FormLabel>
                              <FormControl><Input placeholder="e.g., Arithmetic Operations" className="rounded-xl" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                        )}
                      />
                      <FormField
                        control={categoryForm.control}
                        name="examCategories"
                        render={() => (
                            <FormItem>
                              <FormLabel className="font-bold text-slate-700 text-xs uppercase block mb-3">Available For</FormLabel>
                              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                {examCategories.map((item) => (
                                    <FormField
                                      key={item}
                                      control={categoryForm.control}
                                      name="examCategories"
                                      render={({ field }) => (
                                          <FormItem key={item} className="flex flex-row items-center space-x-2 space-y-0">
                                              <FormControl>
                                                <Checkbox
                                                  checked={field.value?.includes(item)}
                                                  onCheckedChange={(checked) => {
                                                    return checked
                                                      ? field.onChange([...(field.value || []), item])
                                                      : field.onChange(field.value?.filter((value) => value !== item))
                                                  }}
                                                  className="rounded-md border-slate-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                                />
                                              </FormControl>
                                              <FormLabel className="font-semibold text-slate-600 text-sm">{item}</FormLabel>
                                          </FormItem>
                                      )}
                                    />
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                        )}
                      />
                      <DialogFooter className="gap-2">
                          <Button type="button" variant="ghost" onClick={() => setIsCategoryDialogOpen(false)} className="rounded-xl">Cancel</Button>
                          <Button type="submit" disabled={isLoadingCategory} className="rounded-xl bg-slate-900 px-8">
                              {isLoadingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Category"}
                          </Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>

      <Dialog open={isTopicDialogOpen} onOpenChange={(isOpen) => { setIsTopicDialogOpen(isOpen); if (!isOpen) setEditingTopic(null); }}>
          <DialogContent className="rounded-3xl max-w-lg">
              <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-red-600" />
                    {editingTopic ? 'Edit Topic' : 'New Topic'}
                  </DialogTitle>
                  <DialogDescription>Add a specific lesson and map it to categories and exams.</DialogDescription>
              </DialogHeader>
              <Form {...topicForm}>
                  <form onSubmit={topicForm.handleSubmit(onTopicSubmit)} className="space-y-5 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={topicForm.control}
                            name="categoryId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold text-slate-700 text-xs uppercase">Parent Category</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={categories.length === 0}>
                                  <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder={categories.length > 0 ? "Map to..." : "No categories"} /></SelectTrigger></FormControl>
                                  <SelectContent className="rounded-xl">
                                      {categories.map(cat => (<SelectItem key={cat.id} value={cat.id} className="rounded-lg">{cat.name}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={topicForm.control}
                            name="part"
                            render={({ field }) => {
                                const selectedCourses = topicForm.watch('examCategories') || [];
                                const isIP = selectedCourses.includes('IP');
                                const availableParts = isIP 
                                    ? ["Paper I", "Paper II", "Paper III"] 
                                    : ["Part A", "Part B"];

                                return (
                                    <FormItem>
                                    <FormLabel className="font-bold text-slate-700 text-xs uppercase">Section / Part</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Part" /></SelectTrigger></FormControl>
                                      <SelectContent className="rounded-xl">
                                          {availableParts.map(p => (<SelectItem key={p} value={p} className="rounded-lg">{p}</SelectItem>))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                );
                            }}
                        />
                      </div>

                      <FormField
                        control={topicForm.control}
                        name="title"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-slate-700 text-xs uppercase">Topic Title</FormLabel>
                            <FormControl><Input placeholder="e.g., Simple Interest" className="rounded-xl font-medium" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                      />

                      <FormField
                        control={topicForm.control}
                        name="examCategories"
                        render={() => (
                            <FormItem>
                              <FormLabel className="font-bold text-slate-700 text-xs uppercase block mb-2">Available For Courses</FormLabel>
                              <div className="flex flex-wrap gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                {examCategories.map((item) => (
                                    <FormField
                                      key={item}
                                      control={topicForm.control}
                                      name="examCategories"
                                      render={({ field }) => (
                                          <FormItem key={item} className="flex flex-row items-center space-x-2 space-y-0">
                                              <FormControl>
                                                <Checkbox
                                                  checked={field.value?.includes(item)}
                                                  onCheckedChange={(checked) => {
                                                    return checked
                                                      ? field.onChange([...(field.value || []), item])
                                                      : field.onChange(field.value?.filter((value) => value !== item))
                                                  }}
                                                  className="rounded-md border-slate-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                                />
                                              </FormControl>
                                              <FormLabel className="font-semibold text-slate-600 text-xs">{item}</FormLabel>
                                          </FormItem>
                                      )}
                                    />
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                        )}
                        />

                      <FormField
                          control={topicForm.control}
                          name="description"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className="font-bold text-slate-700 text-xs uppercase">Description (Optional)</FormLabel>
                              <FormControl><Textarea placeholder="Core concepts covered in this topic..." className="rounded-xl resize-none min-h-[80px]" {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />

                      <FormField
                        control={topicForm.control}
                        name="file"
                        render={({ field: { onChange, value, ...rest } }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-slate-700 text-xs uppercase text-red-600 flex items-center gap-1.5">
                              <Upload className="h-3 w-3" />
                              Update Study Material PDF
                            </FormLabel>
                            <FormControl>
                              <div className="relative group transition-all duration-300">
                                <div className="absolute inset-0 bg-red-50/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/30 hover:border-red-200 hover:bg-white transition-all relative">
                                  <div className="p-2 rounded-lg bg-white shadow-sm border border-slate-100">
                                    <FileText className="h-4 w-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                     <Input 
                                      type="file" 
                                      accept=".pdf" 
                                      onChange={(e) => onChange(e.target.files)} 
                                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer border-none bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto"
                                      {...rest} 
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Leave empty to keep existing material</p>
                                  </div>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter className="gap-2">
                          <Button type="button" variant="ghost" onClick={() => setIsTopicDialogOpen(false)} className="rounded-xl">Cancel</Button>
                          <Button type="submit" disabled={isLoadingTopic || categories.length === 0} className="rounded-xl bg-red-600 hover:bg-red-700 px-8">
                              {isLoadingTopic ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Publish Topic"}
                          </Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
