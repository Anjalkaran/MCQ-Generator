"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Layout, Code, Save, AlertCircle, Search, GripVertical, FileText, FileJson } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MCQ } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';

interface MCQStructuredEditorProps {
    initialContent: string;
    onSave: (newContent: string) => Promise<void>;
    onCancel?: () => void;
}

export function MCQStructuredEditor({ initialContent, onSave, onCancel }: MCQStructuredEditorProps) {
    const [mode, setMode] = useState<'ui' | 'raw'>('ui');
    const [mcqs, setMcqs] = useState<MCQ[]>([]);
    const [containerKey, setContainerKey] = useState<string | null>(null);
    const [rawContent, setRawContent] = useState(initialContent);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Initialize content
    useEffect(() => {
        try {
            const parsed = JSON.parse(initialContent);
            let extractedMcqs: MCQ[] = [];
            let detectedKey: string | null = null;
            
            if (Array.isArray(parsed)) {
                extractedMcqs = parsed;
                detectedKey = null;
            } else if (parsed && typeof parsed === 'object') {
                if (Array.isArray(parsed.mcqs)) {
                    extractedMcqs = parsed.mcqs;
                    detectedKey = 'mcqs';
                } else if (Array.isArray(parsed.questions)) {
                    extractedMcqs = parsed.questions;
                    detectedKey = 'questions';
                } else {
                    // Look for any array in the object
                    const firstArrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
                    if (firstArrayKey) {
                        extractedMcqs = parsed[firstArrayKey];
                        detectedKey = firstArrayKey;
                    } else {
                        throw new Error("Invalid structure: No question array found");
                    }
                }
            } else {
                throw new Error("Invalid structure: Content is not an object or array");
            }
            
            setMcqs(extractedMcqs);
            setContainerKey(detectedKey);
            setRawContent(JSON.stringify(detectedKey ? { [detectedKey]: extractedMcqs } : extractedMcqs, null, 2));
        } catch (e) {
            console.error("Failed to parse initial MCQ content:", e);
            setMode('raw');
        }
    }, [initialContent]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let contentToSave = '';
            if (mode === 'ui') {
                contentToSave = JSON.stringify(containerKey ? { [containerKey]: mcqs } : mcqs, null, 2);
            } else {
                // Validate JSON
                const parsed = JSON.parse(rawContent);
                const hasArray = Array.isArray(parsed) || (parsed && typeof parsed === 'object' && Object.values(parsed).some(v => Array.isArray(v)));
                if (!hasArray) {
                    throw new Error("JSON must contain an array of questions.");
                }
                contentToSave = rawContent;
            }
            await onSave(contentToSave);
            toast({ title: 'Success', description: 'MCQs updated successfully.' });
        } catch (e: any) {
            toast({ title: 'Error', description: 'Save failed: ' + e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const addQuestion = () => {
        const newMcq: MCQ = {
            question: '',
            options: ['', '', '', ''],
            correctAnswer: '',
            solution: ''
        };
        setMcqs([newMcq, ...mcqs]);
        toast({ title: "New question added", description: "A blank question has been added to the top of the list." });
    };

    const deleteQuestion = (index: number) => {
        const newMcqs = [...mcqs];
        newMcqs.splice(index, 1);
        setMcqs(newMcqs);
    };

    const updateQuestion = (index: number, field: keyof MCQ, value: any) => {
        const newMcqs = [...mcqs];
        newMcqs[index] = { ...newMcqs[index], [field]: value };
        setMcqs(newMcqs);
    };

    const handleDownloadPdf = () => {
        try {
            let questionsToExport: MCQ[] = [];
            if (mode === 'ui') {
                questionsToExport = mcqs;
            } else {
                const parsed = JSON.parse(rawContent);
                if (Array.isArray(parsed)) {
                    questionsToExport = parsed;
                } else if (parsed && typeof parsed === 'object') {
                    if (Array.isArray(parsed.mcqs)) questionsToExport = parsed.mcqs;
                    else if (Array.isArray(parsed.questions)) questionsToExport = parsed.questions;
                    else {
                        const firstArrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
                        if (firstArrayKey) questionsToExport = parsed[firstArrayKey];
                    }
                }
            }

            if (questionsToExport.length === 0) {
                toast({ title: "No Questions", description: "There are no questions to export.", variant: "destructive" });
                return;
            }

            const doc = new jsPDF();
            doc.setFontSize(20);
            doc.setTextColor(44, 62, 80);
            doc.text("Anjalkaran MCQ Export", 105, 15, { align: 'center' });
            
            doc.setDrawColor(52, 152, 219);
            doc.setLineWidth(0.5);
            doc.line(20, 20, 190, 20);

            const toEnglish = (text: string) => {
                if (!text) return "";
                // Strip HTML
                let res = text.replace(/<[^>]*>?/gm, '');
                // Filter out Tamil characters if present
                res = res.replace(/[\u0B80-\u0BFF]+/g, '');
                return res.trim().replace(/\s\s+/g, ' ');
            };

            const tableData = questionsToExport.map((q, index) => {
                const qText = q.translations?.en?.question || q.question;
                const opts = q.translations?.en?.options || q.options;
                const ans = q.translations?.en?.correctAnswer || q.correctAnswer;
                const sol = q.translations?.en?.solution || q.solution;

                return [
                    index + 1,
                    toEnglish(qText || ''),
                    (opts || []).map(o => toEnglish(o)).join('\n'),
                    toEnglish(ans || 'N/A'),
                    toEnglish(sol || 'N/A')
                ];
            });

            autoTable(doc, {
                head: [['#', 'Question', 'Options', 'Ans', 'Solution']],
                body: tableData,
                startY: 25,
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255 },
                columnStyles: {
                    0: { cellWidth: 10 },
                    1: { cellWidth: 85 },
                    2: { cellWidth: 45 },
                    3: { cellWidth: 15 },
                    4: { cellWidth: 'auto' }
                },
                alternateRowStyles: { fillColor: [245, 247, 249] },
            });

            doc.save(`MCQ_Export_${new Date().getTime()}.pdf`);
            toast({ title: "PDF Generated", description: "Your MCQ paper has been exported." });
        } catch (e) {
            toast({ title: "Export Failed", description: "Could not parse questions for export.", variant: "destructive" });
        }
    };

    const updateOption = (qIndex: number, optIndex: number, value: string) => {
        const newMcqs = [...mcqs];
        const newOptions = [...(newMcqs[qIndex].options || [])];
        if (newOptions.length <= optIndex) {
            for (let i = newOptions.length; i <= optIndex; i++) {
                newOptions.push('');
            }
        }
        newOptions[optIndex] = value;
        newMcqs[qIndex].options = newOptions;
        setMcqs(newMcqs);
    };

    const filteredIndices = mcqs
        .map((m, i) => ({ m, i }))
        .filter(({ m }) => 
            m.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.options && m.options.some(o => o.toLowerCase().includes(searchQuery.toLowerCase()))) ||
            (m.solution && m.solution.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .map(({ i }) => i);

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                    <Button 
                        variant={mode === 'ui' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={cn(mode === 'ui' && "bg-primary text-primary-foreground")}
                        onClick={() => {
                            if (mode === 'raw') {
                                try {
                                     const parsed = JSON.parse(rawContent);
                                     let extracted: MCQ[] = [];
                                     if (Array.isArray(parsed)) {
                                         extracted = parsed;
                                         setContainerKey(null);
                                     } else if (parsed && typeof parsed === 'object') {
                                         if (Array.isArray(parsed.mcqs)) {
                                             extracted = parsed.mcqs;
                                             setContainerKey('mcqs');
                                         } else if (Array.isArray(parsed.questions)) {
                                             extracted = parsed.questions;
                                             setContainerKey('questions');
                                         } else {
                                             const firstArrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
                                             if (firstArrayKey) {
                                                 extracted = parsed[firstArrayKey];
                                                 setContainerKey(firstArrayKey);
                                             }
                                         }
                                     }
                                     setMcqs(extracted);
                                     setMode('ui');
                                } catch (e) {
                                    toast({ title: 'Parser Error', description: 'Cannot switch to UI mode because the JSON is malformed.', variant: 'destructive' });
                                }
                            }
                        }}
                    >
                        <Layout className="h-4 w-4 mr-2" /> UI Editor
                    </Button>
                    <Button 
                        variant={mode === 'raw' ? 'secondary' : 'ghost'} 
                        size="sm"
                        className={cn(mode === 'raw' && "bg-primary text-primary-foreground")}
                        onClick={() => {
                            if (mode === 'ui') {
                                setRawContent(JSON.stringify(containerKey ? { [containerKey]: mcqs } : mcqs, null, 2));
                            }
                            setMode('raw');
                        }}
                    >
                        <Code className="h-4 w-4 mr-2" /> Raw JSON
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    {onCancel && <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>}
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                            const content = containerKey ? { [containerKey]: mcqs } : mcqs;
                            const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `mcq_export_${new Date().getTime()}.json`;
                            link.click();
                            URL.revokeObjectURL(url);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                        <FileJson className="h-4 w-4 mr-2" /> Download JSON
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownloadPdf}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <FileText className="h-4 w-4 mr-2" /> Download English PDF
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {mode === 'ui' ? (
                <div className="flex flex-col flex-1 space-y-4 overflow-hidden">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search questions by text or options..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button onClick={addQuestion} className="shrink-0">
                            <Plus className="h-4 w-4 mr-2" /> Add Question
                        </Button>
                    </div>

                    <ScrollArea className="flex-1 rounded-md border p-1 bg-muted/20">
                        <Accordion type="multiple" className="w-full space-y-2 p-2">
                            {filteredIndices.map((originalIndex) => {
                                const mcq = mcqs[originalIndex];
                                return (
                                    <AccordionItem key={originalIndex} value={`item-${originalIndex}`} className="border rounded-lg px-4 bg-background">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2 py-4 flex-1 mr-2 cursor-pointer" onClick={() => {}}>
                                                <Badge variant="outline" className="shrink-0 h-6 min-w-[2rem] flex justify-center">{originalIndex + 1}</Badge>
                                                <AccordionTrigger className="hover:no-underline py-0 border-none justify-start gap-3 w-full text-left">
                                                    <div className="truncate w-full font-medium">
                                                        {mcq.question ? (
                                                            <span dangerouslySetInnerHTML={{ __html: mcq.question.substring(0, 100) + (mcq.question.length > 100 ? '...' : '') }} />
                                                        ) : (
                                                            <span className="text-muted-foreground italic">Untitled question</span>
                                                        )}
                                                    </div>
                                                </AccordionTrigger>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteQuestion(originalIndex);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <AccordionContent className="pt-2 pb-6 space-y-6">
                                            <div className="grid gap-6">
                                                <div className="space-y-3">
                                                    <Label className="text-sm font-bold flex items-center gap-2">
                                                        Question Text
                                                        <Badge variant="secondary" className="font-normal text-[10px] h-4">Supports HTML</Badge>
                                                    </Label>
                                                    <Textarea 
                                                        value={mcq.question} 
                                                        onChange={(e) => updateQuestion(originalIndex, 'question', e.target.value)}
                                                        placeholder="Enter question text"
                                                        className="min-h-[100px] font-sans leading-relaxed"
                                                    />
                                                </div>

                                                <div className="space-y-3">
                                                    <Label className="text-sm font-bold">Options</Label>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {(mcq.options || ['', '', '', '']).map((option, optIdx) => (
                                                            <div key={optIdx} className="space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-[10px] text-muted-foreground">Option {optIdx + 1}</Label>
                                                                    {mcq.correctAnswer === option && option !== "" && (
                                                                        <Badge variant="default" className="text-[9px] h-3 px-1 bg-green-600">Correct</Badge>
                                                                    )}
                                                                </div>
                                                                <Input 
                                                                    value={option} 
                                                                    onChange={(e) => updateOption(originalIndex, optIdx, e.target.value)}
                                                                    placeholder={`Option ${optIdx + 1}`}
                                                                    className={cn(mcq.correctAnswer === option && option !== "" ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' : '')}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-3">
                                                        <Label className="text-sm font-bold">Correct Answer</Label>
                                                        <Input 
                                                            value={mcq.correctAnswer} 
                                                            onChange={(e) => updateQuestion(originalIndex, 'correctAnswer', e.target.value)}
                                                            placeholder="Must match one of the options text"
                                                            className={cn(!mcq.options?.includes(mcq.correctAnswer) && mcq.correctAnswer ? "border-amber-500" : "")}
                                                        />
                                                        {mcq.correctAnswer && !mcq.options?.includes(mcq.correctAnswer) && (
                                                            <p className="text-[10px] text-amber-600 flex items-center gap-1">
                                                                <AlertCircle className="h-3 w-3" /> Warning: Doesn't match any option text.
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-3">
                                                        <Label className="text-sm font-bold flex items-center gap-2">
                                                            Solution / Explanation
                                                            <Badge variant="secondary" className="font-normal text-[10px] h-4">Supports HTML</Badge>
                                                        </Label>
                                                        <Textarea 
                                                            value={mcq.solution || ''} 
                                                            onChange={(e) => updateQuestion(originalIndex, 'solution', e.target.value)}
                                                            placeholder="Detailed reasoning or solution..."
                                                            className="min-h-[80px]"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                {(mcq.questionId || mcq.topicId) && (
                                                    <div className="flex gap-4 pt-2 border-t mt-2 opacity-60">
                                                        {mcq.questionId && <div className="text-[10px]"><span className="font-bold">QID:</span> {mcq.questionId}</div>}
                                                        {mcq.topicId && <div className="text-[10px]"><span className="font-bold">Topic ID:</span> {mcq.topicId}</div>}
                                                    </div>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                        {filteredIndices.length === 0 && (
                            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg m-4">
                                {searchQuery ? 'No questions match your search.' : 'No questions found. Click "Add Question" to begin.'}
                            </div>
                        )}
                    </ScrollArea>
                    <div className="px-1 text-xs text-muted-foreground flex justify-between items-center bg-muted/40 py-1.5 rounded border border-dashed">
                        <span className="ml-2 font-medium">Showing {filteredIndices.length} of {mcqs.length} questions</span>
                        <div className="flex gap-4 mr-2">
                             <span className="flex items-center gap-1"><Badge className="h-1.5 w-1.5 p-0 bg-primary rounded-full" /> UI Active</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col flex-1 space-y-4 overflow-hidden">
                    <Label className="text-sm font-bold">Raw JSON Content</Label>
                    <Textarea 
                        value={rawContent} 
                        onChange={(e) => setRawContent(e.target.value)}
                        className="flex-1 font-mono text-[11px] min-h-[50vh] leading-relaxed resize-none bg-zinc-950 text-zinc-200 border-zinc-800"
                    />
                    <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800 dark:text-amber-400">Caution: Direct Editing</AlertTitle>
                        <AlertDescription className="text-xs text-amber-700 dark:text-amber-500">
                            Editing raw JSON can break the data structure. Ensure you maintain the correct array format (e.g., <code className="bg-amber-100 dark:bg-amber-800/50 px-1 rounded">{"{ \"questions\": [...] }"}</code> or <code className="bg-amber-100 dark:bg-amber-800/50 px-1 rounded">{"{ \"mcqs\": [...] }"}</code>).
                        </AlertDescription>
                    </Alert>
                </div>
            )}
        </div>
    );
}
