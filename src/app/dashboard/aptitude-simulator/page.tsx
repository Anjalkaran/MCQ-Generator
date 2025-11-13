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
import { Loader2, Sparkles, BrainCircuit, Lightbulb } from 'lucide-react';
import { generateAptitudeProblem } from '@/ai/flows/generate-aptitude-problem';
import { Separator } from '@/components/ui/separator';

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

export default function AptitudeSimulatorPage() {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [problem, setProblem] = useState<{ question: string; detailedSolution: string } | null>(null);
    const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
    const [showSolution, setShowSolution] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            topic: undefined,
        },
    });

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
        const currentTopic = form.getValues("topic");
        if (currentTopic) {
            onSubmit({ topic: currentTopic });
        }
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
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
                        <CardFooter>
                            <Button type="submit" disabled={isGenerating || !form.formState.isValid} className="w-full">
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
