
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Feedback } from '@/lib/types';
import { format } from 'date-fns';
import { Star, MessageSquare, Edit, Loader2, Filter, Mail, User, Info, CheckCircle2, Inbox, Trash2, AlertCircle } from 'lucide-react';
import { replyToFeedback, deleteFeedback } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn, normalizeDate } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FeedbackManagementProps {
    initialFeedback: Feedback[];
}

export function FeedbackManagement({ initialFeedback }: FeedbackManagementProps) {
    const [feedback, setFeedback] = useState<Feedback[]>(initialFeedback);
    const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentFeedback, setCurrentFeedback] = useState<Feedback | null>(null);
    const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null);
    const [replyText, setReplyText] = useState("");
    const [filter, setFilter] = useState("all");
    const { toast } = useToast();

    // Calculate Stats
    const stats = useMemo(() => {
        if (!feedback.length) return { total: 0, average: 0, unreplied: 0 };
        const total = feedback.length;
        const sum = feedback.reduce((acc, f) => acc + (f.rating || 0), 0);
        const average = (sum / total).toFixed(1);
        const unreplied = feedback.filter(f => !f.reply).length;
        return { total, average, unreplied };
    }, [feedback]);

    // Apply Filters
    const filteredFeedback = useMemo(() => {
        let result = [...feedback];
        if (filter === "unreplied") {
            result = result.filter(f => !f.reply);
        } else if (filter === "replied") {
            result = result.filter(f => !!f.reply);
        } else if (filter === "positive") {
            result = result.filter(f => f.rating >= 4);
        } else if (filter === "negative") {
            result = result.filter(f => f.rating <= 2);
        }
        return result;
    }, [feedback, filter]);

    const handleOpenReplyDialog = (item: Feedback) => {
        setCurrentFeedback(item);
        setReplyText(item.reply || "");
        setIsReplyDialogOpen(true);
    };

    const handleSendReply = async () => {
        if (!currentFeedback || !replyText) return;
        setIsSubmitting(true);
        try {
            await replyToFeedback(currentFeedback.id, replyText);
            setFeedback(feedback.map(f => f.id === currentFeedback.id ? { ...f, reply: replyText } : f));
            toast({ title: 'Success', description: 'Your reply has been sent.' });
            setIsReplyDialogOpen(false);
        } catch (error) {
            console.error('Failed to send reply:', error);
            toast({ title: 'Error', description: 'Could not send the reply.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteFeedback = async () => {
        if (!feedbackToDelete) return;
        setIsDeleting(true);
        try {
            await deleteFeedback(feedbackToDelete.id);
            setFeedback(feedback.filter(f => f.id !== feedbackToDelete.id));
            toast({ title: 'Success', description: 'Feedback has been permanently deleted.' });
            setIsDeleteDialogOpen(false);
        } catch (error) {
            console.error('Failed to delete feedback:', error);
            toast({ title: 'Error', description: 'Could not delete the feedback.', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
            setFeedbackToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-l-4 border-l-blue-500">
                    <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Feedback</CardTitle>
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">all time submissions</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-l-4 border-l-yellow-500">
                    <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Average Rating</CardTitle>
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.average} / 5.0</div>
                        <p className="text-xs text-muted-foreground mt-1">overall satisfaction</p>
                    </CardContent>
                </Card>

                <Card className={cn(
                    "bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-l-4 transition-colors",
                    stats.unreplied > 0 ? "border-l-red-500 animate-pulse-subtle" : "border-l-emerald-500"
                )}>
                    <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Unreplied</CardTitle>
                        <Inbox className={cn("h-4 w-4", stats.unreplied > 0 ? "text-red-500" : "text-emerald-500")} />
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold">{stats.unreplied}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.unreplied > 0 ? "pending admin attention" : "all caught up!"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table Card */}
            <Card className="shadow-lg">
                <CardHeader className="border-b bg-muted/20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl">Student Feedback Management</CardTitle>
                            <CardDescription>Analyze ratings and maintain communication with students.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             <Tabs value={filter} onValueChange={setFilter} className="w-full">
                                <TabsList className="bg-background border">
                                    <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
                                    <TabsTrigger value="unreplied" className="text-xs px-3 relative">
                                        Unreplied
                                        {stats.unreplied > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="replied" className="text-xs px-3">Replied</TabsTrigger>
                                    <TabsTrigger value="negative" className="text-xs px-3">Low Rated</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[200px]">User Details</TableHead>
                                    <TableHead className="text-center w-[100px]">Rating</TableHead>
                                    <TableHead>Comment & Status</TableHead>
                                    <TableHead className="text-right w-[150px]">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredFeedback.length > 0 ? (
                                    filteredFeedback.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-muted/10 group">
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="font-bold flex items-center gap-2">
                                                        <User className="h-3 w-3 text-slate-400" />
                                                        {item.userName}
                                                    </div>
                                                    {item.userEmail && (
                                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium bg-muted/50 p-1 px-2 rounded-md w-fit">
                                                            <Mail className="h-2.5 w-2.5" />
                                                            {item.userEmail}
                                                        </div>
                                                    )}
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight pl-1">
                                                        {format(normalizeDate(item.createdAt) || new Date(), 'PP')}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className={cn(
                                                    "inline-flex items-center justify-center gap-1 p-2 rounded-xl font-black text-lg",
                                                    item.rating >= 4 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20" : 
                                                    item.rating <= 2 ? "text-rose-600 bg-rose-50 dark:bg-rose-950/20" : 
                                                    "text-blue-600 bg-blue-50 dark:bg-blue-950/20"
                                                )}>
                                                    {item.rating}
                                                    <Star className={cn("h-4 w-4", item.rating >= 4 ? "fill-emerald-600" : item.rating <= 2 ? "fill-rose-600" : "fill-blue-600")} />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-3">
                                                    <div className="relative pl-4 border-l-2 border-slate-100 italic text-sm text-slate-600 dark:text-slate-300 py-1">
                                                         {item.comment || <em>No comment provided.</em>}
                                                    </div>
                                                    
                                                    {!item.reply ? (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 flex items-center gap-1.5 w-fit font-bold px-2">
                                                            <Info className="h-3 w-3" />
                                                            Pending Reply
                                                        </Badge>
                                                    ) : (
                                                        <div className="bg-emerald-50/50 dark:bg-emerald-950/10 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900 shadow-sm relative group">
                                                             <div className="flex items-center gap-2 mb-1">
                                                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Your Reply</span>
                                                             </div>
                                                             <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{item.reply}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                             <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button 
                                                        variant={item.reply ? "outline" : "default"} 
                                                        size="sm" 
                                                        className={cn(
                                                            "shadow-sm transition-all",
                                                            !item.reply && "bg-blue-600 hover:bg-blue-700"
                                                        )}
                                                        onClick={() => handleOpenReplyDialog(item)}
                                                    >
                                                        {item.reply ? <Edit className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                                                        <span className="ml-2 hidden sm:inline">{item.reply ? 'Edit' : 'Reply'}</span>
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                        onClick={() => {
                                                            setFeedbackToDelete(item);
                                                            setIsDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                                                <div className="bg-muted p-4 rounded-full">
                                                     <Inbox className="h-10 w-10 text-slate-300" />
                                                </div>
                                                <p className="text-lg font-medium">No feedback found</p>
                                                <p className="text-sm">Try changing your filters or check back later.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                             <MessageSquare className="h-5 w-5 text-blue-500" />
                             Feedback Reply
                        </DialogTitle>
                        <DialogDescription>
                            From **{currentFeedback?.userName || 'User'}** on {currentFeedback ? format(normalizeDate(currentFeedback.createdAt) || new Date(), 'PPp') : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        <div className="p-4 bg-muted/40 rounded-xl border border-dashed relative">
                             <span className="absolute -top-3 left-3 bg-background px-2 text-[10px] font-black uppercase text-slate-400">Student Comment</span>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                "{currentFeedback?.comment || 'No comment provided.'}"
                            </p>
                            <div className="flex items-center gap-1 mt-3">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={cn("h-3 w-3", s <= (currentFeedback?.rating || 0) ? "text-yellow-500 fill-yellow-500" : "text-slate-200")} />
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="reply-text" className="text-sm font-bold ml-1">Response Message</Label>
                            <Textarea
                                id="reply-text"
                                placeholder="Type your personalized response here..."
                                className="min-h-[150px] resize-none focus-visible:ring-blue-500 border-slate-200"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground ml-1">
                                💡 Students will be able to see this reply in their feedback history section.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsReplyDialogOpen(false)} className="flex-1">Discard</Button>
                        <Button 
                            onClick={handleSendReply} 
                            disabled={isSubmitting || !replyText.trim()}
                            className="bg-blue-600 hover:bg-blue-700 flex-1 font-bold"
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Publish Reply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="sm:max-w-[420px]">
                    <AlertDialogHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
                            <Trash2 className="h-6 w-6 text-red-600" />
                        </div>
                        <AlertDialogTitle className="text-center text-xl">Delete Feedback?</AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                            Are you sure you want to permanently delete this feedback from **{feedbackToDelete?.userName}**? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="bg-slate-50 p-4 rounded-xl border border-dashed my-2">
                        <p className="text-sm text-slate-600 italic">"{feedbackToDelete?.comment || 'No comment provided.'}"</p>
                    </div>
                    <AlertDialogFooter className="sm:flex-col gap-2">
                        <AlertDialogAction 
                            onClick={handleDeleteFeedback}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold h-11 w-full m-0"
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete Permanently
                        </AlertDialogAction>
                        <AlertDialogCancel className="h-11 w-full m-0 border-slate-200">Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

