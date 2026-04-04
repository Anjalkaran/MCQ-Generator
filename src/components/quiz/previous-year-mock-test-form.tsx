
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Gem, Repeat, FileText, CheckCircle2, PlayCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDashboard } from '@/app/dashboard/layout';
import { generateMockTestFromBank } from '@/ai/flows/generate-mock-test-from-bank';
import { Badge } from '@/components/ui/badge';
import { getQuestionBankDocumentsByCategory } from '@/lib/firestore';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import { ADMIN_EMAILS } from '@/lib/constants';
import type { BankedQuestion } from '@/lib/types';

const examCategories = ["MTS", "POSTMAN", "PA"] as const;
const languages = ["English", "Tamil"] as const;


const formSchema = z.object({
  examType: z.enum(examCategories, {
    required_error: 'Please select an exam type.',
  }),
  language: z.enum(languages).optional().default('English'),
});

type FormValues = z.infer<typeof formSchema>;

export function PreviousYearMockTestForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData, isLoading } = useDashboard();
  const [isGenerating, setIsGenerating] = useState(false);
  const [startingPaperId, setStartingPaperId] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<{ [paperId: string]: string }>({});

  useEffect(() => {
    // Scan for active sessions in localStorage
    const sessions: { [paperId: string]: string } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('active-paper-session-')) {
        const paperId = key.replace('active-paper-session-', '');
        const quizId = localStorage.getItem(key);
        if (quizId) {
          // Verify the actual quiz session still exists in localStorage
          if (localStorage.getItem(`quiz-session-${quizId}`)) {
            sessions[paperId] = quizId;
          } else {
            // Clean up orphaned session mapping
            localStorage.removeItem(key);
          }
        }
      }
    }
    setActiveSessions(sessions);
  }, []);
  const [questionBank, setQuestionBank] = useState<BankedQuestion[]>([]);
  const [isBankLoading, setIsBankLoading] = useState(true);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      examType: undefined,
      language: (userData?.preferredLanguage as any) || 'English',
    },
  });

  // Automatically set exam type to user's active course and fetch papers
  useEffect(() => {
    if (userData?.examCategory && !form.getValues('examType')) {
        form.setValue('examType', userData.examCategory as any);
    }
    if (userData?.preferredLanguage && form.getValues('language') !== userData.preferredLanguage) {
        form.setValue('language', userData.preferredLanguage as any);
    }
  }, [userData, form]);

  const availableExams = useMemo(() => {
    if (!userData) return [];
    if (userData.email && ADMIN_EMAILS.includes(userData.email)) return examCategories;
    switch (userData.examCategory) {
        case 'PA':
            return ['PA', 'POSTMAN', 'MTS'];
        case 'POSTMAN':
            return ['POSTMAN', 'MTS'];
        case 'MTS':
            return ['MTS'];
        default:
            return [];
    }
  }, [userData]);

  const selectedExamType = form.watch('examType');

  useEffect(() => {
    async function fetchPapers() {
        if (selectedExamType) {
            setIsBankLoading(true);
            try {
                const papers = await getQuestionBankDocumentsByCategory(selectedExamType);
                setQuestionBank(papers);
            } catch (error) {
                console.error("Error fetching papers:", error);
                toast({ title: "Error", description: "Failed to load question papers.", variant: "destructive" });
            } finally {
                setIsBankLoading(false);
            }
        } else {
            setQuestionBank([]);
            setIsBankLoading(false);
        }
    }
    fetchPapers();
  }, [selectedExamType, toast]);


  const onSubmit = async (values: FormValues, paperId?: string) => {
    setIsGenerating(true);
    if (paperId) setStartingPaperId(paperId);
    
    if (!user || !userData) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in.', variant: 'destructive' });
      setIsGenerating(false);
      setStartingPaperId(null);
      return;
    }
    
    try {
      const { quizId } = await generateMockTestFromBank({
          examCategory: values.examType,
          userId: user.uid,
          language: values.language,
          paperId: paperId
      });

      if (!quizId) {
        toast({ title: 'Generation Failed', description: 'Could not generate a mock test from the question bank.', variant: 'destructive' });
        setIsGenerating(false);
        setStartingPaperId(null);
        return;
      }

      // Store the active session for this paper
      if (paperId) {
        localStorage.setItem(`active-paper-session-${paperId}`, quizId);
      }

      router.push(`/quiz/${quizId}`);

    } catch (error: any) {
      console.error('Error generating mock test from bank:', error);
      toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
      setIsGenerating(false);
      setStartingPaperId(null);
    }
  };
  
  const completedTestIds = new Set(userData?.completedMockBankTests || []);
  const availablePapers = questionBank.filter(p => !completedTestIds.has(p.id));
  const hasCompletedAllPapers = selectedExamType && !isBankLoading && questionBank.length > 0 && availablePapers.length === 0;

  const hasQuestionPapersForCategory = questionBank.length > 0;

  return (
    <div className="space-y-6">
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="bg-slate-50/50 border-b">
        <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <FileText className="h-5 w-5" />
            </div>
            <div>
                <CardTitle className="text-xl font-bold text-slate-900">Previous Year Questions</CardTitle>
                <CardDescription className="font-medium text-red-600">All circle previous year questions</CardDescription>
            </div>
        </div>
        <div className="mt-2 text-[11px] font-semibold text-slate-500 bg-white/80 p-2 rounded-md border border-slate-100 flex items-center gap-2">
            <Gem className="h-3 w-3 text-red-500" />
            <span>At present, 2024 MCQs are available. 2025 MCQs will be uploaded soon!</span>
        </div>
      </CardHeader>
      <Form {...form}>
        <form className="space-y-6">
            <CardContent className="pt-6">
                <fieldset disabled={isGenerating || isLoading} className="space-y-6">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Active Course</p>
                            <h3 className="text-xl font-bold text-slate-900">{userData?.examCategory || 'Not Set'}</h3>
                        </div>
                        <Badge className="bg-red-600 text-white border-none px-3 py-1">
                            {questionBank.length} Papers Found
                        </Badge>
                    </div>

                    <FormField
                      control={form.control}
                      name="examType"
                      render={({ field }) => (
                          <input type="hidden" {...field} />
                      )}
                    />
                    <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Preferred Language</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a language" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {languages.map((lang) => (
                                            <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {selectedExamType && !isBankLoading && !hasQuestionPapersForCategory && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>No Question Papers Found</AlertTitle>
                            <AlertDescription>
                                No question papers have been uploaded for the {selectedExamType} category yet.
                            </AlertDescription>
                        </Alert>
                    )}
                </fieldset>
             </CardContent>
        </form>
        </Form>
    </Card>

    {selectedExamType && questionBank.length > 0 && (
        <div className="space-y-8">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-semibold text-slate-900">Question Papers by Year</h3>
                <Button 
                    variant="link" 
                    className="text-red-600 font-semibold h-auto p-0"
                    disabled={isGenerating}
                    onClick={form.handleSubmit((v) => onSubmit(v))}
                >
                    <Repeat className="mr-2 h-3 w-4" />
                    Random Selection
                </Button>
            </div>
            
            {/* Grouped by Year */}
            {Object.entries(
                questionBank.reduce((acc, paper) => {
                    const year = paper.examYear || "Previously Uploaded";
                    if (!acc[year]) acc[year] = [];
                    acc[year].push(paper);
                    return acc;
                }, {} as Record<string, BankedQuestion[]>)
            )
            .sort(([yearA], [yearB]) => {
                if (yearA === "Previously Uploaded") return 1;
                if (yearB === "Previously Uploaded") return -1;
                return yearB.localeCompare(yearA); // Latest year first
            })
            .map(([year, papers]) => (
                <div key={year} className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Badge className="bg-slate-900 text-white rounded-md px-3">{year}</Badge>
                        <div className="h-[1px] flex-1 bg-slate-200" />
                    </div>
                    <div className="grid gap-3">
                        {papers.map((paper) => {
                            const isCompleted = completedTestIds.has(paper.id);
                            const isStarting = startingPaperId === paper.id;

                            return (
                                <Card key={paper.id} className={`overflow-hidden border-slate-200 hover:border-red-200 transition-colors shadow-sm ${isCompleted ? 'bg-slate-50/50' : ''}`}>
                                    <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isCompleted ? 'bg-slate-200 text-slate-500' : 'bg-red-50 text-red-600'}`}>
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <h4 className="font-bold text-slate-900 line-clamp-1">{(paper.fileName || "Questions Paper").replace('.json', '')}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider ">{paper.examCategory}</span>
                                                    {isCompleted && (
                                                        <Badge variant="secondary" className="h-4 text-[9px] uppercase tracking-wider bg-green-100 text-green-700 hover:bg-green-100 border-none px-1">
                                                            <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                                                            Completed
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Button 
                                            size="sm"
                                            disabled={isGenerating}
                                            onClick={activeSessions[paper.id] 
                                                ? () => router.push(`/quiz/${activeSessions[paper.id]}`)
                                                : form.handleSubmit((v) => onSubmit(v, paper.id))}
                                            className={`w-full sm:w-auto ${activeSessions[paper.id] ? 'bg-orange-500 hover:bg-orange-600' : (isCompleted ? 'bg-slate-800 hover:bg-slate-900' : 'bg-red-600 hover:bg-red-700')} text-white font-bold px-6 h-9`}
                                        >
                                            {isStarting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    {activeSessions[paper.id] ? (
                                                        <Repeat className="mr-2 h-4 w-4" />
                                                    ) : (
                                                        <PlayCircle className="mr-2 h-4 w-4" />
                                                    )}
                                                    {activeSessions[paper.id] ? 'Resume Test' : (isCompleted ? 'Practice Again' : 'Start Mock Test')}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    )}
    </div>
  );
}
