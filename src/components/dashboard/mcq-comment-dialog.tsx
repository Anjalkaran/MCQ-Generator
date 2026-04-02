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
import type { MCQ, MCQReport } from "@/lib/types";

interface MCQCommentDialogProps {
  questionId: string;
  mcq?: MCQ; // Required for admin report mode
  topicId?: string;
  initialComment?: string;
  className?: string;
  mode?: 'personal' | 'admin';
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MCQCommentDialog({ 
  questionId, 
  mcq,
  topicId,
  initialComment = "", 
  className,
  mode = 'personal'
}: MCQCommentDialogProps) {
  const [comment, setComment] = useState(initialComment);
  const [issueType, setIssueType] = useState<MCQReport['issueType']>('other');
  const [severity, setSeverity] = useState<MCQReport['severity']>('medium');
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
        // Ensure the MCQ object has the questionId for live editing tracking
        const mcqWithMetadata = { 
          ...mcq, 
          questionId: mcq.questionId || questionId,
          topicId: mcq.topicId || topicId 
        };
        await submitMCQReport(auth.currentUser.uid, mcqWithMetadata, comment, topicId, issueType, severity);
        toast({
          title: "Report Sent",
          description: "Thank you! The admin will review this question.",
        });
      } else {
        await updateBookmarkComment(auth.currentUser.uid, questionId, comment, mcq, topicId);
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
          className={cn("h-8 w-8 text-muted-foreground hover:text-primary transition-colors", className)}
          title={isPersonal ? "Add Personal Note" : "Report Question to Admin"}
        >
          {isPersonal ? <MessageSquare className="h-5 w-5" /> : <Flag className="h-5 w-5" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-primary/20 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            {isPersonal ? <MessageSquare className="h-5 w-5 text-primary" /> : <Flag className="h-5 w-5 text-destructive" />}
            {isPersonal ? "Add Personal Note" : "Report Question"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isPersonal 
              ? "Keep private notes or explanations for this question." 
              : "Help us improve by identifying errors in this question."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {!isPersonal && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Issue Category</label>
                <Select value={issueType} onValueChange={(v: any) => setIssueType(v)}>
                  <SelectTrigger className="h-10 bg-muted/50 border-none">
                    <SelectValue placeholder="What's wrong?" />
                  </SelectTrigger>
                  <SelectContent className="border-none shadow-xl">
                    <SelectItem value="incorrect_answer">Incorrect Answer</SelectItem>
                    <SelectItem value="wrong_question">Wrong Question</SelectItem>
                    <SelectItem value="typo">Spelling/Typo</SelectItem>
                    <SelectItem value="missing_info">Missing Info</SelectItem>
                    <SelectItem value="other">Other Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority</label>
                <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                  <SelectTrigger className="h-10 bg-muted/50 border-none">
                    <SelectValue placeholder="How urgent?" />
                  </SelectTrigger>
                  <SelectContent className="border-none shadow-xl">
                    <SelectItem value="low">Low (Typo)</SelectItem>
                    <SelectItem value="medium" className="text-orange-600 font-medium">Medium (Incorrect Opt)</SelectItem>
                    <SelectItem value="high" className="text-red-600 font-bold">High (Critical Error)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="space-y-2">
             <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isPersonal ? "Your Note" : "Detailed Feedback"}
             </label>
             <Textarea
                placeholder={isPersonal 
                ? "Add your private notes here..." 
                : "Briefly explain the issue to help us fix it faster..."}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={5}
                className="resize-none bg-muted/50 border-none focus-visible:ring-primary shadow-inner"
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isSaving} className="font-semibold">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving} 
            className={cn(
                "font-bold transition-all active:scale-95",
                isPersonal ? "bg-primary hover:bg-primary/90" : "bg-destructive hover:bg-destructive/90"
            )}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isPersonal ? <Save className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />)}
            {isPersonal ? "Save Note" : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
