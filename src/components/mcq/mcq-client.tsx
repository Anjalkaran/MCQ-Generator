
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import type { MCQData } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MCQClientProps {
  topicId: string;
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const TIME_EXTENSION_SECONDS = 60;
const MAX_TIME_EXTENSIONS = 1;

export function MCQClient({ topicId }: MCQClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [quizData, setQuizData] = useState<MCQData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [timeExtensionsUsed, setTimeExtensionsUsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const quizStartTimeRef = useRef<number | null>(null);

  const handleFinish = useCallback(() => {
    if (timerRef.current) {
        clearInterval(timerRef.current);
    }
    if (typeof window !== 'undefined' && quizData && quizStartTimeRef.current !== null) {
      const durationInSeconds = Math.round((Date.now() - quizStartTimeRef.current) / 1000);
      const answersToStore = {
        answers: selectedAnswers,
        numberOfQuestions: quizData.mcqs.length,
        mcqs: quizData.mcqs,
        topic: quizData.topic,
        isMockTest: quizData.isMockTest || false,
        liveTestId: quizData.liveTestId,
        durationInSeconds: durationInSeconds,
      };
      localStorage.setItem(`quizState-${quizData.topic.id}`, JSON.stringify(answersToStore));
      
      if (quizData.liveTestId) {
        router.push('/dashboard/leaderboard');
      } else {
        router.push(`/quiz/${quizData.topic.id}/results`);
      }
    }
  }, [quizData, selectedAnswers, router]);

  useEffect(() => {
    setIsClient(true);
    const savedQuiz = localStorage.getItem(`quiz-${topicId}`);
    if (savedQuiz) {
      const parsedData: MCQData = JSON.parse(savedQuiz);
      setQuizData(parsedData);
      quizStartTimeRef.current = Date.now();
      if (parsedData.timeLimit) {
        setTimeLeft(parsedData.timeLimit);
      }
    } else {
      router.push('/dashboard');
    }
  }, [topicId, router]);
  
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
        if (timeLeft === 0) {
            handleFinish();
        }
        return;
    }

    timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => (prevTime !== null ? prevTime - 1 : null));
    }, 1000);

    return () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    };
}, [timeLeft, handleFinish]);

  const handleExtendTime = () => {
    if (timeLeft !== null && timeExtensionsUsed < MAX_TIME_EXTENSIONS) {
      setTimeLeft(timeLeft + TIME_EXTENSION_SECONDS);
      setTimeExtensionsUsed(timeExtensionsUsed + 1);
      toast({
        title: "Time Extended!",
        description: `You've been given an extra ${TIME_EXTENSION_SECONDS} seconds.`,
      });
    }
  };


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
  const isLastQuestion = currentQuestionIndex === quizMcqs.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }

  const handleSkip = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
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
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-2xl font-headline">{topic.title}</CardTitle>
                <CardDescription>
                Question {currentQuestionIndex + 1} of {quizMcqs.length}
                </CardDescription>
            </div>
            {timeLeft !== null && (
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                        <Clock className="h-6 w-6" />
                        <span>{formatTime(timeLeft)}</span>
                    </div>
                     <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={handleExtendTime}
                        disabled={timeExtensionsUsed >= MAX_TIME_EXTENSIONS}
                        aria-label="Extend Time"
                     >
                        <PlusCircle className="h-5 w-5" />
                    </Button>
                </div>
            )}
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-lg mb-6">{currentQuestion.question}</p>
        <RadioGroup
          key={currentQuestionIndex}
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
      <CardFooter className="justify-between">
        <Button onClick={handlePrevious} variant="outline" disabled={isFirstQuestion}>
            Previous
        </Button>
        <div className="flex gap-2">
            {isLastQuestion ? (
            <Button onClick={handleFinish} disabled={!selectedAnswers[currentQuestionIndex]}>
                Finish Exam
            </Button>
            ) : (
            <>
                <Button onClick={handleSkip} variant="outline">
                Skip
                </Button>
                <Button onClick={handleNext} disabled={!selectedAnswers[currentQuestionIndex]}>
                Next
                </Button>
            </>
            )}
        </div>
      </CardFooter>
    </Card>
  );
}
