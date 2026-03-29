"use client";

import { useState, useEffect } from "react";
import { 
  Flag, 
  User, 
  Calendar, 
  CheckCircle,
  Loader2,
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { getMCQReports, deleteMCQReport } from "@/lib/firestore";
import type { MCQReport } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MCQEditDialog } from "@/components/dashboard/mcq-edit-dialog";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<MCQReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchReports() {
      try {
        const data = await getMCQReports();
        setReports(data);
      } catch (error) {
        console.error("Error fetching reports:", error);
        toast({
          title: "Error",
          description: "Failed to load reports.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchReports();
  }, [toast]);

  const handleResolve = async (reportId: string) => {
    try {
      await deleteMCQReport(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast({
        title: "Resolved",
        description: "Report marked as resolved and removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resolve report.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    try {
      if (date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleString();
      }
      return new Date(date).toLocaleString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <Flag className="h-8 w-8 text-destructive" />
            Question Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Review feedback and corrections submitted by users for specific questions.
          </p>
        </div>
        <Badge variant="destructive" className="w-fit text-sm py-1.5 px-3">
          {reports.length} Pending {reports.length === 1 ? 'Report' : 'Reports'}
        </Badge>
      </div>

      {reports.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
          <div className="bg-green-100 p-4 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="mb-2">All caught up!</CardTitle>
          <CardDescription>
            There are no pending reports review at this time.
          </CardDescription>
        </Card>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => (
            <Card key={report.id} className="overflow-hidden border-destructive/20 transition-all hover:shadow-md">
              <CardHeader className="bg-destructive/5 pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant="outline" className="bg-background">
                        <User className="h-3 w-3 mr-1" />
                        {report.userName || 'Unknown'} ({report.userEmail})
                      </Badge>
                      <Badge variant="outline" className="bg-background">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(report.createdAt)}
                      </Badge>
                      {report.topicId && (
                        <Badge variant="secondary" className="bg-background text-xs">
                          topic: {report.topicId}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {report.topicId && report.question.questionId && (
                      <MCQEditDialog
                        reportId={report.id}
                        mcq={report.question}
                        topicId={report.topicId}
                        onUpdateSuccess={() => setReports(prev => prev.filter(r => r.id !== report.id))}
                        className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                      />
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="shrink-0 border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleResolve(report.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Ignore / Resolve
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 relative group">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-destructive mt-1 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-destructive uppercase tracking-wider mb-1">User Feedback</p>
                      <p className="text-sm font-medium">"{report.comment}"</p>
                    </div>
                  </div>
                  {(!report.topicId || !report.question.questionId) && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-destructive-foreground bg-destructive rounded px-2 py-0.5 w-fit font-bold">
                      <AlertCircle className="h-3 w-3" />
                      EDIT NOT SUPPORTED: MISSING QUESTION/TOPIC METADATA
                    </div>
                  )}
                </div>

                <div className="border border-muted rounded-md p-4 bg-muted/20">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Reported Question</p>
                  <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
                    <div 
                      className="font-semibold text-base" 
                      dangerouslySetInnerHTML={{ __html: report.question.question }} 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {report.question.options.map((option, i) => {
                      const isCorrect = option.trim().toLowerCase() === report.question.correctAnswer.trim().toLowerCase();
                      return (
                        <div 
                          key={i} 
                          className={cn(
                            "p-2 rounded-md border text-sm flex items-center justify-between",
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

                  {report.question.solution && (
                    <div className="pt-4 border-t border-muted">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Existing Solution</p>
                        <div 
                          className="text-sm prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: report.question.solution }}
                        />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
