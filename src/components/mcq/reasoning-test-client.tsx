
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { ReasoningQuestion } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getReasoningQuestionsForTest } from "@/lib/firestore";
import Image from "next/image";

interface ReasoningTestClientProps {
  quizId: string;
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export function ReasoningTestClient({ quizId }: ReasoningTestClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<ReasoningQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const quizStartTimeRef = useRef<number | null>(null);

  const handleFinish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (quizStartTimeRef.current !== null) {
      const durationInSeconds = Math.round((Date.now() - quizStartTimeRef.current) / 1000);
      const resultsToStore = {
        answers: selectedAnswers,
        questions,
        durationInSeconds,
      };
      localStorage.setItem(`quizResults-${quizId}`, JSON.stringify(resultsToStore));
      router.push(`/quiz/reasoning/${quizId}/results`);
    }
  }, [quizId, questions, selectedAnswers, router]);

  useEffect(() => {
    const fetchQuestions = async () => {
      const savedSettings = localStorage.getItem(`quizSettings-${quizId}`);
      if (!savedSettings) {
        toast({ title: "Error", description: "Quiz settings not found.", variant: "destructive" });
        router.push('/dashboard/reasoning-test');
        return;
      }
      try {
        const { examCategory, numberOfQuestions } = JSON.parse(savedSettings);
        const fetchedQuestions = await getReasoningQuestionsForTest(examCategory, numberOfQuestions);
        if (fetchedQuestions.length === 0) {
            toast({ title: "No Questions", description: "No reasoning questions found for the selected category.", variant: "destructive" });
            router.push('/dashboard/reasoning-test');
            return;
        }
        setQuestions(fetchedQuestions);
        quizStartTimeRef.current = Date.now();
      } catch (error) {
        console.error("Failed to fetch reasoning questions:", error);
        toast({ title: "Error", description: "Could not load the test.", variant: "destructive" });
        router.push('/dashboard/reasoning-test');
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, [quizId, router, toast]);

  useEffect(() => {
    if (timeLeft === 0) {
      toast({ title: "Time's Up!", description: "Your test has been automatically submitted." });
      handleFinish();
      return;
    }
    if (!isLoading) {
      timerRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, isLoading, handleFinish, toast]);

  if (isLoading || questions.length === 0) {
    return <Card className="w-full shadow-lg"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleNext = () => currentQuestionIndex < questions.length - 1 && setCurrentQuestionIndex(currentQuestionIndex + 1);
  const handlePrevious = () => currentQuestionIndex > 0 && setCurrentQuestionIndex(currentQuestionIndex - 1);
  const handleAnswerSelect = (optionIndex: number) => setSelectedAnswers({ ...selectedAnswers, [currentQuestionIndex]: optionIndex });

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-2xl font-headline">Reasoning Test</CardTitle>
                <CardDescription>Question {currentQuestionIndex + 1} of {questions.length}</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Clock className="h-6 w-6" />
                <span>{formatTime(timeLeft)}</span>
            </div>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative w-full h-64 border rounded-md overflow-hidden">
            <Image src={currentQuestion.questionImageUrl} alt="Question" layout="fill" objectFit="contain" />
        </div>
        {currentQuestion.questionText && <p className="font-semibold text-lg text-center">{currentQuestion.questionText}</p>}
        
        <div className="grid grid-cols-2 gap-4">
          {currentQuestion.optionImageUrls.map((url, index) => (
            <button key={index} onClick={() => handleAnswerSelect(index)} className={`relative w-full h-40 border-4 rounded-md overflow-hidden transition-all ${selectedAnswers[currentQuestionIndex] === index ? 'border-primary ring-2 ring-primary' : 'border-transparent hover:border-primary/50'}`}>
                <Image src={url} alt={`Option ${index + 1}`} layout="fill" objectFit="contain" />
            </button>
          ))}
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button onClick={handlePrevious} variant="outline" disabled={currentQuestionIndex === 0}>Previous</Button>
        {currentQuestionIndex === questions.length - 1 ? (
          <Button onClick={handleFinish} disabled={selectedAnswers[currentQuestionIndex] === undefined}>Finish Test</Button>
        ) : (
          <Button onClick={handleNext} disabled={selectedAnswers[currentQuestionIndex] === undefined}>Next</Button>
        )}
      </CardFooter>
    </Card>
  );
}
