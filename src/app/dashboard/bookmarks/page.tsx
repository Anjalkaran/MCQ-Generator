"use client";

import { useState, useEffect } from "react";
import { 
  Bookmark as BookmarkIcon, 
  Trash2, 
  MessageSquare, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase";
import { getUserBookmarks, toggleBookmark } from "@/lib/firestore";
import type { Bookmark } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { MCQCommentDialog } from "@/components/dashboard/mcq-comment-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const auth = getFirebaseAuth();

  useEffect(() => {
    async function fetchBookmarks() {
      if (!auth?.currentUser) {
          setIsLoading(false);
          return;
      }
      
      try {
        const data = await getUserBookmarks(auth.currentUser.uid);
        setBookmarks(data);
      } catch (error) {
        console.error("Error fetching bookmarks:", error);
        toast({
          title: "Error",
          description: "Failed to load bookmarks.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchBookmarks();
  }, [auth?.currentUser, toast]);

  const removeBookmark = async (bookmark: Bookmark) => {
    if (!auth?.currentUser) return;

    try {
      await toggleBookmark(auth.currentUser.uid, bookmark.question, bookmark.topicId);
      setBookmarks(prev => prev.filter(b => b.id !== bookmark.id));
      toast({
        title: "Removed",
        description: "Bookmark removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove bookmark.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    try {
      if (date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString();
      }
      return new Date(date).toLocaleDateString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your bookmarks...</p>
      </div>
    );
  }

  if (!auth?.currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Login Required</h2>
        <p className="text-muted-foreground">Please sign in to view your bookmarks.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <BookmarkIcon className="h-8 w-8 text-primary fill-current" />
            My Bookmarks
          </h1>
          <p className="text-muted-foreground mt-1">
            Review your saved questions and personal notes.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit text-sm py-1.5 px-3">
          {bookmarks.length} {bookmarks.length === 1 ? 'Question' : 'Questions'} Saved
        </Badge>
      </div>

      {bookmarks.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <BookmarkIcon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="mb-2">No bookmarks yet</CardTitle>
          <CardDescription className="max-w-xs">
            Start solving MCQs and click the star icon to save questions you want to review later.
          </CardDescription>
          <Button asChild className="mt-6">
            <a href="/dashboard/topic-wise-mcq">Start Learning</a>
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {bookmarks.map((bookmark) => (
            <Card key={bookmark.id} className="overflow-hidden transition-all hover:shadow-md">
              <CardHeader className="bg-muted/30 pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-wrap gap-2">
                    {bookmark.topicId && (
                      <Badge variant="outline" className="bg-background">
                        Topic: {bookmark.topicId}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="bg-background">
                      Saved on {formatDate(bookmark.createdAt)}
                    </Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <MCQCommentDialog 
                      questionId={bookmark.id} 
                      initialComment={bookmark.comment} 
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeBookmark(bookmark)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
                  <div 
                    className="font-semibold text-lg" 
                    dangerouslySetInnerHTML={{ __html: bookmark.question.question }} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {bookmark.question.options.map((option, i) => {
                    const isCorrect = option.trim().toLowerCase() === bookmark.question.correctAnswer.trim().toLowerCase();
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "p-3 rounded-md border text-sm flex items-center justify-between",
                          isCorrect ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-background"
                        )}
                      >
                        <span className={cn(isCorrect ? "font-medium text-green-700 dark:text-green-400" : "text-muted-foreground")}>
                          {String.fromCharCode(65 + i)}. {option}
                        </span>
                        {isCorrect && (
                          <Badge className="bg-green-600 hover:bg-green-600 text-[10px] h-5 px-1.5 ">Correct</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>

                {bookmark.comment && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 relative group">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-primary mt-1 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Your Note</p>
                        <p className="text-sm text-foreground italic">"{bookmark.comment}"</p>
                      </div>
                    </div>
                  </div>
                )}

                {bookmark.question.solution && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="solution" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2 px-4 bg-muted/50 rounded-md">
                        <span className="text-primary font-semibold text-sm">View Explanation</span>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 px-4 bg-muted/20 rounded-b-md">
                        <div 
                          className="text-sm prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: bookmark.question.solution }}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
