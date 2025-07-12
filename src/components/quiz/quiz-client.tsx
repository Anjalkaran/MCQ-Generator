"use client";

import { useState } from "react";
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
import type { Topic } from "@/lib/types";

interface QuizClientProps {
  topic: Omit<Topic, 'icon'>;
}

export function QuizClient({ topic }: QuizClientProps) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  
  const quizMcqs = topic.mcqs.slice(0, 50);
  const currentQuestion = quizMcqs[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizMcqs.length) * 100;

  const handleNext = () => {
    if (currentQuestionIndex < quizMcqs.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const handleFinish = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`quizAnswers-${topic.id}`, JSON.stringify(selectedAnswers));
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
