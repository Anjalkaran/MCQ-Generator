
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Award, Repeat, Home, Lightbulb, Trophy, Share2, Loader2 } from "lucide-react";
import type { MCQ, Topic, UserData, MCQData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from 'firebase/auth';
import { saveMCQHistory, getGeneratedQuiz } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface MCQResultsClientProps {
  topicId: string;
}

interface StoredResultsData {
  answers: { [key: number]: string };
  durationInSeconds?: number;
}

// Helper function to normalize answer strings for comparison
const normalizeAnswer = (answer: string | undefined): string => {
    if (!answer) return "";
    return answer.trim().toLowerCase().replace(/^[a-d][\\)\.]\\s*|^[1-4][\\)\.]\\s*/, '');
};

export function MCQResultsClient({ topicId }: MCQResultsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [quizData, setQuizData] = useState<MCQData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasSavedHistory = useRef(false);

  useEffect(() => {
    const savedResults = localStorage.getItem(`quizState-${topicId}`);
    if (!savedResults) {
      toast({ title: "Error", description: "Could not find your quiz results. You may have already viewed them.", variant: "destructive" });
      router.push('/dashboard/history');
      return;
    }

    const { answers, durationInSeconds } = JSON.parse(savedResults) as StoredResultsData;
    
    const fetchDataAndProcess = async (currentUser: User) => {
        if (hasSavedHistory.current) return;
        hasSavedHistory.current = true;

        const fetchedQuizData = await getGeneratedQuiz(topicId);

        if (!fetchedQuizData) {
            toast({ title: "Error", description: "Could not load quiz data.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        setQuizData(fetchedQuizData);
        setUserAnswers(answers);

        let correctCount = 0;
        fetchedQuizData.mcqs.forEach((mcq: MCQ, index: number) => {
            if (normalizeAnswer(answers[index]) === normalizeAnswer(mcq.correctAnswer)) {
                correctCount++;
            }
        });
        setScore(correctCount);

        const historyPayload = {
            userId: currentUser.uid,
            topicId: fetchedQuizData.topic.id,
            topicTitle: fetchedQuizData.topic.title,
            score: correctCount,
            totalQuestions: fetchedQuizData.mcqs.length,
            questions: fetchedQuizData.mcqs.map((mcq: MCQ) => mcq.question),
            isMockTest: fetchedQuizData.isMockTest || false,
            liveTestId: fetchedQuizData.liveTestId, // Ensure this is passed correctly
            durationInSeconds: durationInSeconds,
        };

        try {
            await saveMCQHistory(historyPayload);
            localStorage.removeItem(`quizState-${topicId}`); // Clean up after successful save
        } catch (err) {
            console.error("Failed to save quiz history:", err);
            toast({ title: "Error", description: "Your exam result could not be saved.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const auth = getFirebaseAuth();
    if (auth) {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                fetchDataAndProcess(currentUser);
            } else {
                setIsLoading(false);
                toast({ title: "Authentication Error", description: "You must be logged in to save your results.", variant: "destructive" });
            }
        });
        return () => unsubscribe();
    } else {
        setIsLoading(false);
    }
  }, [topicId, router, toast]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Calculating your results...</p>
      </div>
    );
  }
  
  if (!quizData) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Could not load quiz results. Please go back to your dashboard.</p>
                 <Button asChild className="mt-4">
                    <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
            </CardContent>
        </Card>
    );
  }
  
  const { topic, mcqs: quizMcqs, isMockTest, liveTestId, examCategory } = quizData;
  const quizLength = quizMcqs.length;
  
  const marksPerQuestion = (liveTestId && examCategory === 'PA') ? 1 : 2;
  const totalMarks = score * marksPerQuestion;
  const maxMarks = quizLength * marksPerQuestion;

  const handleRetake = () => {
    const destination = isMockTest ? '/dashboard/mock-test' : '/dashboard/topic-wise-mcq';
    router.push(destination);
  };

  const handleShare = () => {
    const message = `I scored ${totalMarks} out of ${maxMarks} in the ${topic.title} exam on Anjalkaran! Test your knowledge too. Download the app: https://anjalkaran.in`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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
          <p className="text-5xl font-bold text-primary">{totalMarks}</p>
          <p className="text-xl text-muted-foreground mt-2">
            Total Marks out of {maxMarks}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
             {liveTestId && (
              <Button asChild>
                <Link href={`/dashboard/leaderboard?liveTestId=${liveTestId}`}>
                  <Trophy className="mr-2 h-4 w-4" />
                  View Leaderboard
                </Link>
              </Button>
            )}
            {!liveTestId && (
                <Button onClick={handleRetake}>
                    <Repeat className="mr-2 h-4 w-4" />
                    New Exam
                </Button>
            )}
             <Button onClick={handleShare} variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                Share on WhatsApp
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
                  <div className="font-semibold mb-2" dangerouslySetInnerHTML={{ __html: `${index + 1}. ${mcq.question}` }} />
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
                                    <Lightbulb className="w-5 h-5" />
                                    <span className="font-semibold">{explanationLabel}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="p-4 bg-muted/50 rounded-lg border prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: mcq.solution }}/>
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
