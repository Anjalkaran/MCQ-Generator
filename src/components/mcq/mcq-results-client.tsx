
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Award, Repeat, Home, Lightbulb, Trophy, Share2, Loader2 } from "lucide-react";
import type { MCQ, Topic, UserData, MCQData, MCQHistory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getGeneratedQuiz, getExamHistoryForUser } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface MCQResultsClientProps {
  topicId: string; // This is the quizId
}

// Helper function to normalize answer strings for comparison
const normalizeAnswer = (answer: string | undefined): string => {
    if (!answer) return "";
    return answer.trim().toLowerCase();
};

export function MCQResultsClient({ topicId }: MCQResultsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [historyEntry, setHistoryEntry] = useState<MCQHistory | null>(null);
  const [quizData, setQuizData] = useState<MCQData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      const savedResultsRef = localStorage.getItem(`quizResults-${topicId}`);
      if (!savedResultsRef) {
        toast({ title: "Error", description: "Could not find your quiz results. You may have already viewed them.", variant: "destructive" });
        router.push('/dashboard/history');
        return;
      }
      
      const { historyId } = JSON.parse(savedResultsRef);
      if (!historyId) {
         toast({ title: "Error", description: "Invalid results reference.", variant: "destructive" });
         router.push('/dashboard/history');
         return;
      }
      
      try {
        const [fetchedHistory, fetchedQuizData] = await Promise.all([
          getExamHistoryForUser(undefined, historyId),
          getGeneratedQuiz(topicId)
        ]);

        if (!fetchedHistory[0] || !fetchedQuizData) {
            toast({ title: "Error", description: "Could not load your results from the database.", variant: "destructive" });
            router.push('/dashboard/history');
            return;
        }

        setHistoryEntry(fetchedHistory[0]);
        setQuizData(fetchedQuizData);
        
        localStorage.removeItem(`quizResults-${topicId}`); // Clean up

      } catch (error) {
        console.error("Error fetching results data:", error);
        toast({ title: "Error", description: "Failed to load results.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResults();
  }, [topicId, router, toast]);


  if (isLoading || !historyEntry || !quizData) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading your results...</p>
      </div>
    );
  }
  
  const { topic, mcqs: quizMcqs, isMockTest, liveTestId, examCategory } = quizData;
  const { score, totalQuestions, userAnswers } = historyEntry;
  
  const marksPerQuestion = (liveTestId && examCategory === 'PA') ? 1 : 2;
  const totalMarks = score * marksPerQuestion;
  const maxMarks = totalQuestions * marksPerQuestion;

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
          <p className="text-muted-foreground">You have completed the ${topic.title} exam.</p>
        </CardHeader>
        <CardContent>
          <p className="text-5xl font-bold text-primary">${totalMarks}</p>
          <p className="text-xl text-muted-foreground mt-2">
            Total Marks out of ${maxMarks}
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
                       <Badge variant="outline" className="mb-2">Topic: ${mcq.topic}</Badge>
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
                          {isTheCorrectAnswer ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : isUserChoice ? (
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          ) : (
                            <div className="w-5 h-5"/>
                          )}
                          <span className="flex-1">{option}</span>
                        </div>
                      );
                    })}
                  </div>
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
