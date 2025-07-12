"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Award, Repeat, Home } from "lucide-react";
import type { Topic, MCQ } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface QuizResultsClientProps {
  topic: Omit<Topic, 'icon'>;
}

export function QuizResultsClient({ topic }: QuizResultsClientProps) {
  const router = useRouter();
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [quizLength, setQuizLength] = useState(10);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedState = localStorage.getItem(`quizState-${topic.id}`);
    if (savedState) {
      const { answers, numberOfQuestions } = JSON.parse(savedState);
      setUserAnswers(answers);
      setQuizLength(numberOfQuestions);

      let correctCount = 0;
      topic.mcqs.slice(0, numberOfQuestions).forEach((mcq, index) => {
        if (answers[index] === mcq.correctAnswer) {
          correctCount++;
        }
      });
      setScore(correctCount);
    }
  }, [topic.id, topic.mcqs]);

  if (!isClient) {
    return null; // or a loading spinner
  }

  const quizMcqs = topic.mcqs.slice(0, quizLength);
  const percentage = quizLength > 0 ? Math.round((score / quizLength) * 100) : 0;

  return (
    <div className="space-y-8">
      <Card className="text-center shadow-lg">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <Award className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold font-headline">Quiz Completed!</CardTitle>
          <p className="text-muted-foreground">You have completed the {topic.title} quiz.</p>
        </CardHeader>
        <CardContent>
          <p className="text-5xl font-bold text-primary">{percentage}%</p>
          <p className="text-xl text-muted-foreground mt-2">
            You scored {score} out of {quizLength}
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <Button asChild onClick={() => router.back()}>
              <Link href="#">
                <Repeat className="mr-2 h-4 w-4" />
                Retake Quiz
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Review Your Answers</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-6">
            {quizMcqs.map((mcq, index) => {
              const userAnswer = userAnswers[index];
              const isCorrect = userAnswer === mcq.correctAnswer;
              return (
                <li key={index}>
                  <p className="font-semibold mb-2">
                    {index + 1}. {mcq.question}
                  </p>
                  <div className="space-y-2">
                    {mcq.options.map((option) => {
                      const isUserChoice = userAnswer === option;
                      const isTheCorrectAnswer = mcq.correctAnswer === option;

                      return (
                        <div
                          key={option}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-md border",
                            isTheCorrectAnswer ? "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700" : "",
                            isUserChoice && !isTheCorrectAnswer ? "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700" : ""
                          )}
                        >
                          {isTheCorrectAnswer ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" /> : isUserChoice ? <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" /> : <div className="w-5 h-5"/>}
                          <span className="flex-1">{option}</span>
                        </div>
                      );
                    })}
                  </div>
                   {!isCorrect && userAnswer && (
                     <p className="text-sm mt-2 text-green-700 dark:text-green-400">Correct answer: {mcq.correctAnswer}</p>
                   )}
                   {!userAnswer && (
                     <p className="text-sm mt-2 text-yellow-700 dark:text-yellow-400">You did not answer this question. Correct answer: {mcq.correctAnswer}</p>
                   )}
                  {index < quizMcqs.length - 1 && <Separator className="mt-6" />}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
