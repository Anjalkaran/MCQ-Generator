
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useDashboard } from '@/app/dashboard/layout';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ADMIN_EMAILS } from '@/lib/constants';

const examCategories = ["MTS", "POSTMAN", "PA"] as const;

const formSchema = z.object({
  examCategory: z.enum(examCategories, {
    required_error: 'Please select an exam category.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function ReasoningTestPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { userData } = useDashboard();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            examCategory: userData?.examCategory,
        }
    });

    const availableExams = useMemo(() => {
        if (!userData) return [];
        if (userData.email && ADMIN_EMAILS.includes(userData.email)) return examCategories;
        switch (userData.examCategory) {
            case 'PA': return ['PA', 'POSTMAN', 'MTS'];
            case 'POSTMAN': return ['POSTMAN', 'MTS'];
            case 'MTS': return ['MTS'];
            default: return [];
        }
    }, [userData]);

    const onSubmit = async (values: FormValues) => {
        const quizId = `reasoning-${values.examCategory}-${Date.now()}`;
        const quizSettings = {
            examCategory: values.examCategory,
            numberOfQuestions: 10, // A fixed number for reasoning tests
        };
        localStorage.setItem(`quizSettings-${quizId}`, JSON.stringify(quizSettings));
        router.push(`/quiz/reasoning/${quizId}`);
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Reasoning Test</h1>
                <p className="text-muted-foreground">
                    Sharpen your skills with image-based reasoning questions.
                </p>
            </div>
            <Card>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardHeader className="items-center text-center">
                            <div className="p-3 bg-primary/10 rounded-full">
                               <BrainCircuit className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle>Start Your Practice Session</CardTitle>
                            <CardDescription>
                                Select your exam category to begin a reasoning test.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="max-w-xs mx-auto">
                             <FormField
                                control={form.control}
                                name="examCategory"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Exam Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} defaultValue={userData?.examCategory}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select an exam" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {availableExams.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full mt-6">
                                Start Reasoning Test
                            </Button>
                        </CardContent>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
