
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, Award, Repeat, Home } from "lucide-react";
import type { ReasoningQuestion } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ReasoningTestResultsClientProps {
  quizId: string;
}

interface StoredResultsData {
  answers: { [key: number]: number };
  questions: ReasoningQuestion[];
  durationInSeconds?: number;
}

export function ReasoningTestResultsClient({ quizId }: ReasoningTestResultsClientProps) {
  const [results, setResults] = useState<StoredResultsData | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const savedResults = localStorage.getItem(`quizResults-${quizId}`);
    if (savedResults) {
      const parsedData: StoredResultsData = JSON.parse(savedResults);
      setResults(parsedData);

      let correctCount = 0;
      parsedData.questions.forEach((q, index) => {
        if (parsedData.answers[index] === q.correctAnswerIndex) {
          correctCount++;
        }
      });
      setScore(correctCount);

      // Clean up local storage
      localStorage.removeItem(`quizSettings-${quizId}`);
      localStorage.removeItem(`quizResults-${quizId}`);
    }
  }, [quizId]);

  if (!results) {
    return <Card><CardHeader><CardTitle>Loading Results...</CardTitle></CardHeader></Card>;
  }

  const { questions, answers } = results;

  return (
    <div className="space-y-8">
      <Card className="text-center shadow-lg">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <Award className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Test Completed!</CardTitle>
          <CardDescription>Here are your results for the reasoning test.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-5xl font-bold text-primary">{score} / {questions.length}</p>
          <p className="text-xl text-muted-foreground mt-2">Correct Answers</p>
          <div className="flex justify-center gap-4 mt-8">
            <Button asChild>
                <Link href="/dashboard/reasoning-test"><Repeat className="mr-2 h-4 w-4" />New Test</Link>
            </Button>
            <Button variant="outline" asChild>
                <Link href="/dashboard"><Home className="mr-2 h-4 w-4" />Back to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review Your Answers</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-8">
            {questions.map((q, index) => {
              const userAnswerIndex = answers[index];
              const isCorrect = userAnswerIndex === q.correctAnswerIndex;
              return (
                <li key={q.id}>
                  <p className="font-semibold mb-2">{index + 1}. {q.questionText || "Which of the options is correct?"}</p>
                  <div className="relative w-full h-48 border rounded-md overflow-hidden mb-4">
                    <Image src={q.questionImageUrl} alt={`Question ${index + 1}`} layout="fill" objectFit="contain" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {q.optionImageUrls.map((url, optionIndex) => {
                        const isUserChoice = userAnswerIndex === optionIndex;
                        const isTheCorrectAnswer = q.correctAnswerIndex === optionIndex;
                        return (
                            <div key={optionIndex} className={cn("relative p-2 rounded-lg border-2", 
                                isTheCorrectAnswer ? "border-green-500 bg-green-50" : "",
                                isUserChoice && !isTheCorrectAnswer ? "border-red-500 bg-red-50" : ""
                            )}>
                                <div className="relative w-full h-32 overflow-hidden">
                                     <Image src={url} alt={`Option ${optionIndex + 1}`} layout="fill" objectFit="contain" />
                                </div>
                                {isTheCorrectAnswer && <CheckCircle className="absolute top-2 right-2 h-6 w-6 text-green-600 bg-white rounded-full" />}
                                {isUserChoice && !isTheCorrectAnswer && <XCircle className="absolute top-2 right-2 h-6 w-6 text-red-600 bg-white rounded-full" />}
                            </div>
                        )
                    })}
                  </div>
                  
                  {q.solutionImageUrl && (
                    <div className="mt-4">
                        <p className="font-semibold">Solution:</p>
                        <div className="relative w-full h-48 border rounded-md overflow-hidden mt-2">
                             <Image src={q.solutionImageUrl} alt={`Solution for question ${index + 1}`} layout="fill" objectFit="contain" />
                        </div>
                    </div>
                  )}

                  {index < questions.length - 1 && <Separator className="mt-8" />}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
