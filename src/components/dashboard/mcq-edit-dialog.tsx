"use client";

import { useState } from "react";
import { 
  Edit, 
  Save, 
  Loader2, 
  CheckCircle,
  AlertCircle
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateReportedMCQAction } from "@/app/dashboard/admin/reports/actions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { MCQ } from "@/lib/types";

interface MCQEditDialogProps {
  reportId: string;
  mcq: MCQ;
  topicId: string;
  onUpdateSuccess?: () => void;
  className?: string;
}

export function MCQEditDialog({ 
  reportId,
  mcq,
  topicId,
  onUpdateSuccess,
  className
}: MCQEditDialogProps) {
  const [questionText, setQuestionText] = useState(mcq.question);
  const [options, setOptions] = useState<string[]>([...(mcq.options || [])]);
  const [correctAnswer, setCorrectAnswer] = useState(mcq.correctAnswer);
  const [solution, setSolution] = useState(mcq.solution || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleOptionChange = (idx: number, val: string) => {
    const updatedOptions = [...options];
    // If the old option was the correct answer, update correct answer too
    const oldVal = updatedOptions[idx];
    updatedOptions[idx] = val;
    setOptions(updatedOptions);
    
    if (correctAnswer === oldVal) {
      setCorrectAnswer(val);
    }
  };

  const handleSave = async () => {
    if (!questionText.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide the question text.",
        variant: "destructive",
      });
      return;
    }

    if (options.some(opt => !opt.trim())) {
      toast({
        title: "Validation Error",
        description: "All options must have content.",
        variant: "destructive",
      });
      return;
    }

    if (!correctAnswer.trim() || !options.includes(correctAnswer)) {
      toast({
        title: "Validation Error",
        description: "Please select a valid correct answer from the options.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const updatedMCQ: MCQ = {
        ...mcq,
        question: questionText,
        options,
        correctAnswer,
        solution: solution || undefined,
        questionId: mcq.questionId,
        topicId: mcq.topicId || topicId
      };

      const result = await updateReportedMCQAction(
        reportId,
        topicId,
        mcq.questionId || "", 
        updatedMCQ
      );

      if (result.success) {
        toast({
          title: "MCQ Updated",
          description: "The question has been corrected and the report marked as resolved.",
        });
        setIsOpen(false);
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update MCQ question.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 gap-1.5", className)}
        >
          <Edit className="h-4 w-4" />
          Edit & Fix
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit & Fix Question</DialogTitle>
          <DialogDescription>
            Correct the question details based on user feedback. Saving will update the source database and resolve the report.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="question" className="text-sm font-bold flex items-center justify-between">
              Question Text 
              <span className="text-[10px] text-muted-foreground uppercase">Supports HTML</span>
            </Label>
            <Textarea
              id="question"
              placeholder="Question text..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={4}
              className="resize-none font-medium"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold">Options</Label>
            <div className="grid grid-cols-1 gap-3">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <div className="flex-none font-bold text-muted-foreground w-6">
                    {String.fromCharCode(65 + i)}.
                  </div>
                  <Input 
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    className={cn(
                      "flex-1",
                      correctAnswer === opt && "border-green-500 bg-green-50 dark:bg-green-900/10 focus-visible:ring-green-500"
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full",
                      correctAnswer === opt ? "text-green-600 bg-green-100" : "text-muted-foreground hover:text-green-600"
                    )}
                    onClick={() => setCorrectAnswer(opt)}
                    title="Mark as correct"
                  >
                    <CheckCircle className={cn("h-5 w-5", correctAnswer === opt && "fill-green-600 text-white")} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="solution" className="text-sm font-bold flex items-center justify-between">
              Detailed Solution
              <span className="text-[10px] text-muted-foreground uppercase">Optional</span>
            </Label>
            <Textarea
              id="solution"
              placeholder="Explain why the answer is correct..."
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              rows={3}
              className="resize-none italic text-sm"
            />
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 bg-background pt-2 border-t mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save & Resolve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
