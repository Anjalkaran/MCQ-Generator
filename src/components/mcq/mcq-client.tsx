
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
import type { MCQData, MCQHistory, MCQ } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, PlusCircle, Loader2, CheckCircle, XCircle, Lightbulb, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getGeneratedQuiz, saveMCQHistory } from "@/lib/firestore";
import { getFirebaseAuth } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BookmarkButton } from "@/components/dashboard/bookmark-button";
import { MCQCommentDialog } from "@/components/dashboard/mcq-comment-dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";


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

// Helper function to normalize answer strings for comparison
const normalizeAnswer = (answer: string | undefined): string => {
    if (!answer) return "";
    return answer.trim().toLowerCase();
};

export function MCQClient({ topicId }: MCQClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [quizData, setQuizData] = useState<MCQData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeExtensionsUsed, setTimeExtensionsUsed] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [savedSession, setSavedSession] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const quizStartTimeRef = useRef<number | null>(null);

  const SESSION_KEY = `quiz-session-${topicId}`;

  useEffect(() => {
    const auth = getFirebaseAuth();
    if(auth) {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }
  }, []);

  const handleFinish = useCallback(async () => {
    if (timerRef.current) {
        clearInterval(timerRef.current);
    }

    if (!currentUser || !quizData || quizStartTimeRef.current === null) {
      toast({ title: "Error", description: "Could not submit results. User or quiz data is missing.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
        localStorage.removeItem(SESSION_KEY);
        const durationInSeconds = Math.round((Date.now() - quizStartTimeRef.current) / 1000);

        const score = quizData.mcqs.reduce((acc, mcq, index) => {
             const userAnswer = selectedAnswers[index];
             const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(mcq.correctAnswer);
             return isCorrect ? acc + 1 : acc;
        }, 0);

        const historyPayload: Omit<MCQHistory, 'id'> = {
            userId: currentUser.uid,
            topicId: quizData.topic.id,
            topicTitle: quizData.topic.title,
            score: score,
            totalQuestions: quizData.mcqs.length,
            questions: quizData.mcqs.map(mcq => mcq.question),
            userAnswers: selectedAnswers,
            isMockTest: quizData.isMockTest || false,
            liveTestId: quizData.liveTestId,
            weeklyTestId: quizData.weeklyTestId,
            questionPaperId: quizData.questionPaperId, // Include question paper ID
            durationInSeconds: durationInSeconds,
            takenAt: new Date(),
            language: quizData.language || 'English',
        };
        
        // Save directly to Firestore
        const historyId = await saveMCQHistory(historyPayload);
        
        // Pass a minimal reference to the results page
        localStorage.setItem(`quizResults-${topicId}`, JSON.stringify({ historyId }));

        router.push(`/quiz/${topicId}/results`);

    } catch(error: any) {
        console.error("Error saving exam results:", error);
        toast({ title: "Submission Error", description: "There was an issue saving your results. Please try again or contact support.", variant: "destructive" });
        setIsSubmitting(false);
    }
  }, [quizData, selectedAnswers, router, topicId, currentUser, toast]);

  useEffect(() => {
    setIsClient(true);
    const fetchQuizData = async () => {
        const firestoreQuiz = await getGeneratedQuiz(topicId);
        if (firestoreQuiz) {
            setQuizData(firestoreQuiz);
            
            // Check for saved session
            const localSession = localStorage.getItem(SESSION_KEY);
            if (localSession) {
                try {
                    const parsed = JSON.parse(localSession);
                    setSavedSession(parsed);
                    setShowResumeDialog(true);
                } catch (e) {
                    console.error("Error parsing saved session:", e);
                }
            } else {
                if (firestoreQuiz.timeLimit) {
                    setTimeLeft(firestoreQuiz.timeLimit);
                }
                quizStartTimeRef.current = Date.now();
            }
        } else {
            toast({ title: "Error", description: "Quiz not found. It may have expired.", variant: "destructive" });
            router.push('/dashboard');
        }
    };

    fetchQuizData();
  }, [topicId, router, toast]);
  
  useEffect(() => {
    if (timeLeft === 0) {
      localStorage.removeItem(SESSION_KEY);
      toast({
        title: "Time's Up!",
        description: "Your exam has been automatically submitted.",
      });
      handleFinish();
      return;
    }

    if (timeLeft === null || timeLeft < 0 || showResumeDialog) {
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
}, [timeLeft, handleFinish, toast]);

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

  const handleSaveAndExit = () => {
    const sessionData = {
        currentQuestionIndex,
        selectedAnswers,
        timeLeft,
        timeExtensionsUsed,
        startTime: quizStartTimeRef.current,
        timestamp: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    toast({
        title: "Progress Saved",
        description: "Your exam session has been saved. You can resume later.",
    });
    router.push('/dashboard');
  };

  const resumeSession = () => {
    if (savedSession) {
        setCurrentQuestionIndex(savedSession.currentQuestionIndex);
        setSelectedAnswers(savedSession.selectedAnswers);
        setTimeLeft(savedSession.timeLeft);
        setTimeExtensionsUsed(savedSession.timeExtensionsUsed);
        
        // Adjust start time to account for elapsed time if needed
        // For simplicity, we'll just set it to now, which might reset the total duration slightly
        // but keeps the countdown accurate.
        quizStartTimeRef.current = Date.now(); 
    }
    setShowResumeDialog(false);
  };

  const startNewSession = () => {
    localStorage.removeItem(SESSION_KEY);
    if (quizData?.timeLimit) {
        setTimeLeft(quizData.timeLimit);
    }
    quizStartTimeRef.current = Date.now();
    setShowResumeDialog(false);
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

  const handleAnswerSelect = (value: string) => {
    // Prevent changing the answer once selected for the current question
    if (selectedAnswers[currentQuestionIndex]) return;

    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: value,
    });
  };
  
  const userAnswer = selectedAnswers[currentQuestionIndex];
  const isQuestionAnswered = !!userAnswer;
  const isArithmeticQuestion = quizData.isMockTest && currentQuestion.topic?.toLowerCase().includes('arithmetic');
  const explanationLabel = isArithmeticQuestion ? "View Solution" : "View Explanation";

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
            <div className="flex items-center gap-2">
                <BookmarkButton mcq={currentQuestion} topicId={topicId} />
                <MCQCommentDialog 
                  questionId={currentQuestion.questionId || topicId + currentQuestionIndex} 
                  mode="personal"
                />
                <MCQCommentDialog 
                  questionId={currentQuestion.questionId || topicId + currentQuestionIndex} 
                  mcq={currentQuestion}
                  topicId={topicId}
                  mode="admin"
                />
                {timeLeft !== null && (
                    <div className="flex items-center gap-2 ml-2">
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
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="ml-2 gap-2"
                            onClick={handleSaveAndExit}
                        >
                            <Save className="h-4 w-4" />
                            <span className="hidden sm:inline">Save & Exit</span>
                        </Button>
                    </div>
                )}
            </div>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>

      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Previous Session?</AlertDialogTitle>
            <AlertDialogDescription>
              We found a saved progress for this exam. Would you like to resume where you left off or start a new attempt?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={startNewSession}>Start New</AlertDialogCancel>
            <AlertDialogAction onClick={resumeSession}>Resume Progress</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CardContent>
        <div className="font-semibold text-lg mb-4" dangerouslySetInnerHTML={{ __html: currentQuestion.question }} />
        {quizData.isMockTest && currentQuestion.topic && (
            <Badge variant="outline" className="mb-4">Topic: {currentQuestion.topic}</Badge>
        )}
        <RadioGroup
          key={currentQuestionIndex}
          value={userAnswer}
          onValueChange={handleAnswerSelect}
          className="space-y-4"
          disabled={isQuestionAnswered}
        >
          {currentQuestion.options.map((option, index) => {
              const isTheCorrectAnswer = normalizeAnswer(currentQuestion.correctAnswer) === normalizeAnswer(option);
              const isUserChoice = normalizeAnswer(userAnswer) === normalizeAnswer(option);

              return (
                <div key={index}
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-md border transition-colors",
                        isQuestionAnswered && isTheCorrectAnswer ? "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700" : "",
                        isQuestionAnswered && isUserChoice && !isTheCorrectAnswer ? "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700" : ""
                    )}
                >
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="text-base flex-1 cursor-pointer">
                        {option}
                    </Label>
                    {isQuestionAnswered && isTheCorrectAnswer && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
                    {isQuestionAnswered && isUserChoice && !isTheCorrectAnswer && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                </div>
              )
          })}
        </RadioGroup>

        {isQuestionAnswered && currentQuestion.solution && (
            <Accordion type="single" collapsible className="w-full mt-4">
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <div className="flex items-center gap-2 text-primary">
                            <Lightbulb className="w-5 h-5" />
                            <span className="font-semibold">{explanationLabel}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="p-4 bg-muted/50 rounded-lg border prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: currentQuestion.solution }}/>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        )}

      </CardContent>
      <CardFooter className="justify-between">
        <Button onClick={handlePrevious} variant="outline" disabled={isFirstQuestion || isSubmitting}>
            Previous
        </Button>
        <div className="flex gap-2">
            {isLastQuestion ? (
            <Button onClick={handleFinish} disabled={!isQuestionAnswered || isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Finish Exam
            </Button>
            ) : (
                <Button onClick={handleNext} disabled={!isQuestionAnswered || isSubmitting}>
                Next
                </Button>
            )}
        </div>
      </CardFooter>
    </Card>
  );
}
