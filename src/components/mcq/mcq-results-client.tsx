
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Award, Repeat, Home, BrainCircuit } from "lucide-react";
import type { MCQ, Topic } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getFirebaseAuth } from "@/lib/firebase";
import { saveMCQHistory } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface MCQResultsClientProps {
  topicId: string;
}

interface StoredQuizData {
  answers: { [key: number]: string };
  numberOfQuestions: number;
  mcqs: MCQ[];
  topic: Topic;
  isMockTest?: boolean;
  liveTestId?: string;
  durationInSeconds?: number;
}

// Helper function to normalize answer strings for comparison
const normalizeAnswer = (answer: string | undefined): string => {
    if (!answer) return "";
    // Trim whitespace and remove leading/trailing quotes (single or double)
    return answer.trim().replace(/^["']|["']$/g, '');
};


export function MCQResultsClient({ topicId }: MCQResultsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [quizLength, setQuizLength] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [quizData, setQuizData] = useState<Omit<StoredQuizData, 'answers' | 'numberOfQuestions'> | null>(null);
  const hasSavedHistory = useRef(false);

  useEffect(() => {
    setIsClient(true);
    const savedState = localStorage.getItem(`quizState-${topicId}`);
    const auth = getFirebaseAuth();
    const currentUser = auth?.currentUser;

    const processResults = async () => {
      if (savedState && currentUser && !hasSavedHistory.current) {
        hasSavedHistory.current = true; // Set flag to prevent re-runs
        
        const { answers, numberOfQuestions, mcqs, topic, isMockTest, liveTestId, durationInSeconds } = JSON.parse(savedState) as StoredQuizData;
        setUserAnswers(answers);
        setQuizLength(numberOfQuestions);
        setQuizData({ mcqs, topic, isMockTest, liveTestId });
  
        let correctCount = 0;
        mcqs.forEach((mcq: MCQ, index: number) => {
          if (normalizeAnswer(answers[index]) === normalizeAnswer(mcq.correctAnswer)) {
            correctCount++;
          }
        });
        setScore(correctCount);
  
        try {
          // Save history to Firestore
          await saveMCQHistory({
              userId: currentUser.uid,
              topicId: topic.id,
              topicTitle: topic.title,
              score: correctCount,
              totalQuestions: numberOfQuestions,
              questions: mcqs.map((mcq: MCQ) => mcq.question),
              takenAt: new Date(),
              isMockTest: isMockTest || false,
              liveTestId: liveTestId,
              durationInSeconds: durationInSeconds,
          });

        } catch (err) {
            console.error("Failed to save quiz history or fetch user data:", err);
            toast({
              title: "Error",
              description: "Could not save your exam results.",
              variant: "destructive"
            })
        }
      }
    };

    processResults();

  }, [topicId, toast]);

  if (!isClient || !quizData) {
    return null; // or a loading spinner
  }
  
  const { topic, mcqs: quizMcqs, isMockTest } = quizData;
  const percentage = quizLength > 0 ? Math.round((score / quizLength) * 100) : 0;

  const handleRetake = () => {
    localStorage.removeItem(`quiz-${topicId}`);
    localStorage.removeItem(`quizState-${topicId}`);
    const destination = isMockTest ? '/dashboard/mock-test' : '/dashboard/topic-wise-mcq';
    router.push(destination);
  };
  
  const isArithmeticQuestion = (mcq: MCQ) => {
    return mcq.topic?.toLowerCase().includes('arithmetic');
  };

  return (
    <div className="space-y-8">
      <Card className="text-center shadow-lg">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <Award className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold font-headline">Exam Completed!</CardTitle>
          <p className="text-muted-foreground">You have completed the {topic.title} exam.</p>
        </CardHeader>
        <CardContent>
          <p className="text-5xl font-bold text-primary">{percentage}%</p>
          <p className="text-xl text-muted-foreground mt-2">
            You scored {score} out of {quizLength}
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <Button onClick={handleRetake}>
                <Repeat className="mr-2 h-4 w-4" />
                New Exam
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
              const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(mcq.correctAnswer);
              const isArithmetic = quizData.isMockTest ? isArithmeticQuestion(mcq) : false;
              const explanationLabel = isArithmetic ? "View Solution" : "View Explanation";

              return (
                <li key={index}>
                  <p className="font-semibold mb-2">
                    {index + 1}. {mcq.question}
                  </p>
                   {quizData.isMockTest && mcq.topic && (
                       <Badge variant="outline" className="mb-2">Topic: {mcq.topic}</Badge>
                   )}
                  <div className="space-y-2">
                    {mcq.options.map((option) => {
                      const isUserChoice = normalizeAnswer(userAnswer) === normalizeAnswer(option);
                      const isTheCorrectAnswer = normalizeAnswer(mcq.correctAnswer) === normalizeAnswer(option);

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
                   {mcq.solution && (
                    <Accordion type="single" collapsible className="w-full mt-4">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2 text-primary">
                                    <BrainCircuit className="w-5 h-5" />
                                    <span className="font-semibold">{explanationLabel}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="p-4 bg-muted/50 rounded-lg border prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                                    {mcq.solution}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
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
