
"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, BrainCircuit, Lightbulb, BookOpen } from 'lucide-react';
import { generateAptitudeProblem, type GenerateAptitudeProblemOutput } from '@/ai/flows/generate-aptitude-problem';
import { explainAptitudeConcept, type ExplainAptitudeConceptOutput } from '@/ai/flows/explain-aptitude-concept';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const aptitudeTopics = [
    "Ages",
    "Percentage",
    "Profit and Loss",
    "Simple Interest",
    "Compound Interest",
    "Time and Work",
    "Time and Distance",
    "Boats and Streams",
    "Pipes and Cisterns",
    "Ratio and Proportion",
    "Mixtures and Alligations",
    "Average",
] as const;

const formSchema = z.object({
  topic: z.enum(aptitudeTopics, { required_error: 'Please select a topic.' }),
});

type FormValues = z.infer<typeof formSchema>;

function ConceptDialog({ topic, concept, onOpenChange }: { topic: string, concept: ExplainAptitudeConceptOutput | null, onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={!!concept} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen />
                        Concept: {topic}
                    </DialogTitle>
                    <DialogDescription>
                       A brief overview of the core theory and formulas for this topic.
                    </DialogDescription>
                </DialogHeader>
                {concept ? (
                    <ScrollArea className="h-96 pr-4">
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Core Concept</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap">{concept.concept}</p>
                            </div>
                            <Separator />
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Key Formulas</h3>
                                <div className="space-y-4">
                                    {concept.formulas.map((f, index) => (
                                        <div key={index} className="p-4 border rounded-lg">
                                            <p className="font-mono font-semibold text-primary">{f.formula}</p>
                                            <p className="font-medium mt-1">{f.name}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{f.explanation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function AptitudeSimulatorPage() {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExplaining, setIsExplaining] = useState(false);
    const [problem, setProblem] = useState<GenerateAptitudeProblemOutput | null>(null);
    const [concept, setConcept] = useState<ExplainAptitudeConceptOutput | null>(null);
    const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
    const [showSolution, setShowSolution] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            topic: undefined,
        },
    });

    const selectedTopic = form.watch('topic');

    const handleExplainConcept = async () => {
        if (!selectedTopic) return;
        setIsExplaining(true);
        setConcept(null); // Clear previous concept while fetching

        try {
            const result = await explainAptitudeConcept({ topic: selectedTopic });
            setConcept(result);
        } catch (error: any) {
            console.error('Error explaining concept:', error);
            toast({ title: 'Error', description: error.message || 'Failed to explain concept.', variant: 'destructive' });
            setIsExplaining(false); // Close dialog on error
        }
    };

    const onSubmit = async (values: FormValues) => {
        setIsGenerating(true);
        setProblem(null);
        setShowSolution(false);

        try {
            const result = await generateAptitudeProblem({
                topic: values.topic,
                previousQuestions: previousQuestions,
            });
            setProblem(result);
            setPreviousQuestions(prev => [...prev, result.question]);
        } catch (error: any) {
            console.error('Error generating aptitude problem:', error);
            toast({ title: 'Error', description: error.message || 'Failed to generate a problem.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleNextProblem = () => {
        if (selectedTopic) {
            onSubmit({ topic: selectedTopic });
        }
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {concept && (
                 <ConceptDialog 
                    topic={selectedTopic || ''} 
                    concept={concept} 
                    onOpenChange={(open) => {
                        if (!open) {
                            setConcept(null);
                            setIsExplaining(false);
                        }
                    }}
                />
            )}
            <div className="space-y-2 text-center">
                <BrainCircuit className="mx-auto h-12 w-12 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">Aptitude Problem Simulator</h1>
                <p className="text-muted-foreground">
                    Select a topic to generate a unique practice problem with a detailed step-by-step solution.
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Select Topic</CardTitle>
                </CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="topic"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Aptitude Topic</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Choose a topic to practice" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {aptitudeTopics.map((topic) => (
                                                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter className="flex-col sm:flex-row justify-between gap-4">
                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={handleExplainConcept} 
                                disabled={isExplaining || !selectedTopic}
                            >
                                {isExplaining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
                                Show Concept
                            </Button>
                            <Button type="submit" disabled={isGenerating || !form.formState.isValid}>
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generate Problem
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>

            {isGenerating && (
                <Card>
                    <CardContent className="pt-6 flex flex-col items-center justify-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Generating a new problem for you...</p>
                    </CardContent>
                </Card>
            )}

            {problem && !isGenerating && (
                <Card>
                    <CardHeader>
                        <CardTitle>Generated Problem</CardTitle>
                        <CardDescription>Topic: {form.getValues("topic")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="p-4 bg-muted rounded-lg border prose prose-sm dark:prose-invert max-w-none">
                            <p>{problem.question}</p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col items-stretch gap-4">
                        {!showSolution && (
                            <Button onClick={() => setShowSolution(true)} className="w-full">
                                <Lightbulb className="mr-2 h-4 w-4" />
                                Show Solution
                            </Button>
                        )}
                        
                        {showSolution && (
                            <div className="space-y-4 w-full">
                                <Separator />
                                <h3 className="text-lg font-semibold">Step-by-Step Solution</h3>
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                                    {problem.detailedSolution}
                                </div>
                                <Separator />
                            </div>
                        )}
                         <Button onClick={handleNextProblem} variant="secondary" className="w-full">
                           Next Problem
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
