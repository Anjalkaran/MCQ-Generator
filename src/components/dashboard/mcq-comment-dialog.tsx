"use client";

import { useState } from "react";
import { MessageSquare, Save, Loader2, Flag, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { updateBookmarkComment, submitMCQReport } from "@/lib/firestore";
import { getFirebaseAuth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { MCQ } from "@/lib/types";

interface MCQCommentDialogProps {
  questionId: string;
  mcq?: MCQ; // Required for admin report mode
  topicId?: string;
  initialComment?: string;
  className?: string;
  mode?: 'personal' | 'admin';
}

export function MCQCommentDialog({ 
  questionId, 
  mcq,
  topicId,
  initialComment = "", 
  className,
  mode = 'personal'
}: MCQCommentDialogProps) {
  const [comment, setComment] = useState(initialComment);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const auth = getFirebaseAuth();

  const handleSave = async () => {
    if (!auth?.currentUser) {
      toast({
        title: "Login Required",
        description: "Please sign in to perform this action.",
        variant: "destructive",
      });
      return;
    }
    
    if (mode === 'admin' && !comment.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide a reason or correction for the admin.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      if (mode === 'admin') {
        if (!mcq) throw new Error("MCQ data missing for report");
        await submitMCQReport(auth.currentUser.uid, mcq, comment, topicId);
        toast({
          title: "Report Sent",
          description: "Thank you! The admin will review this question.",
        });
      } else {
        await updateBookmarkComment(auth.currentUser.uid, questionId, comment);
        toast({
          title: "Comment Saved",
          description: "Your note has been added to this bookmark.",
        });
      }
      setIsOpen(false);
      if (mode === 'admin') setComment(""); // Reset for next time if it was a report
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${mode === 'admin' ? 'send report' : 'save comment'}.`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isPersonal = mode === 'personal';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8 text-muted-foreground hover:text-primary", className)}
          title={isPersonal ? "Add Personal Note" : "Report Question to Admin"}
        >
          {isPersonal ? <MessageSquare className="h-5 w-5" /> : <Flag className="h-5 w-5" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isPersonal ? "Add Personal Note" : "Report Question to Admin"}</DialogTitle>
          <DialogDescription>
            {isPersonal 
              ? "Keep private notes or explanations for this question." 
              : "Let us know if there is an error in the question, options, or solution."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder={isPersonal 
              ? "Add your own notes, shortcuts, or explanations here..." 
              : "Describe the issue or correction for the admin..."}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={5}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isPersonal ? <Save className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />)}
            {isPersonal ? "Save Note" : "Send Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
