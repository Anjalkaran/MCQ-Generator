"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleBookmark, isQuestionBookmarked } from "@/lib/firestore";
import { getFirebaseAuth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { MCQ } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  mcq: MCQ;
  topicId?: string;
  className?: string;
  onToggle?: (isBookmarked: boolean) => void;
}

export function BookmarkButton({ mcq, topicId, className, onToggle }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const auth = getFirebaseAuth();

  useEffect(() => {
    async function checkStatus() {
      if (!auth?.currentUser) return;
      const questionId = mcq.questionId || mcq.question;
      const status = await isQuestionBookmarked(auth.currentUser.uid, questionId);
      setIsBookmarked(status);
    }
    checkStatus();
  }, [auth?.currentUser, mcq]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!auth?.currentUser) {
      toast({
        title: "Login Required",
        description: "Please login to bookmark questions.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const newStatus = await toggleBookmark(auth.currentUser.uid, mcq, topicId);
      setIsBookmarked(newStatus);
      if (onToggle) onToggle(newStatus);
      
      toast({
        title: newStatus ? "Bookmarked" : "Removed",
        description: newStatus ? "Question saved to your bookmarks." : "Question removed from bookmarks.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update bookmark.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8 transition-colors",
        isBookmarked ? "text-yellow-500 hover:text-yellow-600" : "text-muted-foreground hover:text-yellow-500",
        className
      )}
      onClick={handleToggle}
      disabled={isLoading}
      title={isBookmarked ? "Remove Bookmark" : "Bookmark Question"}
    >
      <Star className={cn("h-5 w-5", isBookmarked && "fill-current")} />
    </Button>
  );
}
