"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { Topic, MCQ } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface QuizClientProps {
  topicId: string;
}

export function QuizClient({ topicId }: QuizClientProps) {
  const router = useRouter();
  const [quizData, setQuizData] = useState<{topic: Omit<Topic, 'icon'>, mcqs: MCQ[]} | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedQuiz = localStorage.getItem(`quiz-${topicId}`);
    if (savedQuiz) {
      const parsedData = JSON.parse(savedQuiz);
      setQuizData(parsedData);
    } else {
      // Handle case where quiz data is not found, maybe redirect or show error
      router.push('/dashboard');
    }
  }, [topicId, router]);

  if (!isClient || !quizData) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-full mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { topic, mcqs: quizMcqs } = quizData;
  const currentQuestion = quizMcqs[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizMcqs.length) * 100;

  const handleNext = () => {
    if (currentQuestionIndex < quizMcqs.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const handleFinish = () => {
    if (typeof window !== 'undefined') {
      const answersToStore = {
        answers: selectedAnswers,
        numberOfQuestions: quizMcqs.length,
        mcqs: quizMcqs,
        topic: topic,
      };
      localStorage.setItem(`quizState-${topic.id}`, JSON.stringify(answersToStore));
    }
    router.push(`/quiz/${topic.id}/results`);
  }

  const handleAnswerSelect = (value: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: value,
    });
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">{topic.title}</CardTitle>
        <CardDescription>
          Question {currentQuestionIndex + 1} of {quizMcqs.length}
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-lg mb-6">{currentQuestion.question}</p>
        <RadioGroup
          value={selectedAnswers[currentQuestionIndex]}
          onValueChange={handleAnswerSelect}
          className="space-y-4"
        >
          {currentQuestion.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={`option-${index}`} />
              <Label htmlFor={`option-${index}`} className="text-base cursor-pointer">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter>
        {currentQuestionIndex < quizMcqs.length - 1 ? (
          <Button onClick={handleNext} className="ml-auto" disabled={!selectedAnswers[currentQuestionIndex]}>
            Next
          </Button>
        ) : (
          <Button onClick={handleFinish} className="ml-auto" disabled={!selectedAnswers[currentQuestionIndex]}>
            Finish Quiz
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
