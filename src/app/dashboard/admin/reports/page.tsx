"use client";

import { useState, useEffect } from "react";
import { 
  Flag, 
  User, 
  Calendar, 
  CheckCircle,
  Loader2,
  AlertCircle,
  MessageSquare,
  Clock,
  Check
} from "lucide-react";
import { getMCQReports, deleteMCQReport } from "@/lib/firestore";
import { updateReportStatusAction } from "./actions";
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

  const handleStatusUpdate = async (reportId: string, status: MCQReport['status']) => {
    try {
      const result = await updateReportStatusAction(reportId, status);
      if (result.success) {
        if (status === 'resolved') {
          setReports(prev => prev.filter(r => r.id !== reportId));
        } else {
          setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
        }
        toast({
          title: "Status Updated",
          description: `Report moved to ${status.replace('_', ' ')}.`,
        });
      }
    } catch (e) {
      toast({ 
        title: "Error", 
        description: "Failed to update report status.",
        variant: "destructive"
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
          <h1 className="text-4xl font-extrabold tracking-tight font-headline flex items-center gap-3 text-slate-900">
            <Flag className="h-10 w-10 text-destructive" />
            Question Reports
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Review and resolve quality issues reported by our learning community.
          </p>
        </div>
        <div className="flex items-center gap-3">
             <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-900">{reports.length} Reports Total</p>
                <div className="flex gap-2 justify-end">
                    <span className="text-[10px] font-black text-destructive uppercase">
                        {reports.filter(r => r.status === 'pending').length} Pending
                    </span>
                    <span className="text-[10px] font-black text-blue-600 uppercase">
                        {reports.filter(r => r.status === 'in_review').length} Reviewing
                    </span>
                </div>
             </div>
             <div className="h-10 px-4 flex items-center bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-sm font-black">
                {reports.filter(r => r.status === 'pending').length > 0 ? 'ACTION REQUIRED' : 'MONITORING'}
             </div>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-20 text-center bg-slate-50/50 rounded-3xl">
          <div className="bg-green-100 p-6 rounded-full mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold mb-2">Zero technical debt!</CardTitle>
          <CardDescription className="text-base max-w-md mx-auto">
            You've cleared all reported question issues. Great job maintaining the question bank!
          </CardDescription>
        </Card>
      ) : (
        <div className="space-y-8">
          {reports.map((report) => {
             const severityColor = report.severity === 'high' ? 'bg-red-600' : report.severity === 'medium' ? 'bg-orange-500' : 'bg-blue-500';
             const categoryLabel = report.issueType?.replace('_', ' ').toUpperCase() || 'GENERAL';
             
             return (
                <Card key={report.id} className="overflow-hidden border-none shadow-xl rounded-3xl transition-all hover:shadow-2xl hover:scale-[1.002]">
                    <div className={cn("h-2 w-full", severityColor)} />
                    <CardHeader className="bg-white pb-4 border-b">
                        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <Badge className={cn("text-[10px] font-black tracking-widest px-2 py-0.5 border-none text-white", severityColor)}>
                                        {report.severity?.toUpperCase() || 'MEDIUM'} PRIORITY
                                    </Badge>
                                    <Badge variant="outline" className="bg-slate-100 font-bold border-none text-slate-700">
                                        {categoryLabel}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-slate-500 font-medium">
                                    <span className="flex items-center gap-1.5">
                                        <User className="h-4 w-4" /> {report.userName} ({report.userEmail})
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4" /> {formatDate(report.createdAt)}
                                    </span>
                                </div>
                            </div>
                                <div className="flex gap-2">
                                    {report.topicId && report.question.questionId && (
                                    <MCQEditDialog
                                        reportId={report.id}
                                        mcq={report.question}
                                        topicId={report.topicId}
                                        onUpdateSuccess={() => setReports(prev => prev.filter(r => r.id !== report.id))}
                                        className="bg-green-600 text-white hover:bg-green-700 h-10 px-6 font-bold rounded-xl border-none"
                                    />
                                    )}
                                    
                                    {report.status === 'pending' && (
                                        <Button 
                                            variant="outline" 
                                            className="h-10 px-4 font-bold rounded-xl border-slate-200 hover:bg-slate-100"
                                            onClick={() => handleStatusUpdate(report.id, 'in_review')}
                                        >
                                            <Clock className="h-4 w-4 mr-2" />
                                            In Review
                                        </Button>
                                    )}

                                    <Button 
                                        variant="outline" 
                                        className="h-10 px-4 font-bold rounded-xl border-slate-200 hover:bg-destructive hover:text-white"
                                        onClick={() => handleStatusUpdate(report.id, 'resolved')}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Dismiss
                                    </Button>
                                </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 bg-slate-50/30">
                        <div className="grid lg:grid-cols-2 gap-8 items-start">
                            {/* Left Side: Feedback */}
                            <div className="space-y-4">
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <MessageSquare className="h-4 w-4 text-primary" />
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">User Complaint</h3>
                                    </div>
                                    <p className="text-lg font-semibold text-slate-900 leading-tight">
                                        "{report.comment}"
                                    </p>
                                    
                                    {(!report.topicId || !report.question.questionId) && (
                                        <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold ring-1 ring-red-100 italic">
                                            <AlertCircle className="h-4 w-4" />
                                            Question metadata missing. Live editing is disabled.
                                        </div>
                                    )}
                                </div>
                                
                                {report.topicId && (
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                        <p className="text-xs font-bold text-slate-500">SOURCE: {report.topicId}</p>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Question Card */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                    <CheckCircle className="h-24 w-24" />
                                </div>
                                
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Original content</h3>
                                
                                <div 
                                    className="font-bold text-slate-800 text-base mb-6 leading-relaxed" 
                                    dangerouslySetInnerHTML={{ __html: report.question.question }} 
                                />

                                <div className="space-y-2">
                                    {report.question.options.map((option, i) => {
                                    const isCorrect = option.trim().toLowerCase() === report.question.correctAnswer.trim().toLowerCase();
                                    return (
                                        <div 
                                        key={i} 
                                        className={cn(
                                            "p-3 rounded-xl border text-sm flex items-center justify-between transition-colors",
                                            isCorrect ? "bg-green-50 border-green-200 ring-1 ring-green-100" : "bg-transparent border-slate-100"
                                        )}
                                        >
                                            <span className={cn("font-medium", isCorrect ? "text-green-800" : "text-slate-600")}>
                                                {String.fromCharCode(65 + i)}. {option}
                                            </span>
                                            {isCorrect && (
                                                <Badge className="bg-green-600 text-white font-black text-[10px] h-5 px-2">KEY</Badge>
                                            )}
                                        </div>
                                    );
                                    })}
                                </div>

                                {report.question.solution && (
                                    <div className="mt-6 pt-6 border-t border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Stored Solution</p>
                                        <div 
                                        className="text-sm text-slate-600 font-medium bg-slate-50 p-4 rounded-xl prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: report.question.solution }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
             );
          })}
        </div>
      )}
    </div>
  );
}
