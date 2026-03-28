
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Feedback } from '@/lib/types';
import { format } from 'date-fns';
import { Star, MessageSquare, Edit, Loader2 } from 'lucide-react';
import { replyToFeedback } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';

interface FeedbackManagementProps {
    initialFeedback: Feedback[];
}

export function FeedbackManagement({ initialFeedback }: FeedbackManagementProps) {
    const [feedback, setFeedback] = useState<Feedback[]>(initialFeedback);
    const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentFeedback, setCurrentFeedback] = useState<Feedback | null>(null);
    const [replyText, setReplyText] = useState("");
    const { toast } = useToast();

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

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>User Feedback</CardTitle>
                    <CardDescription>A list of all feedback and ratings submitted by users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead className="text-center">Rating</TableHead>
                                    <TableHead>Comment & Reply</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {feedback.length > 0 ? (
                                    feedback.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.userName}<br/><span className="text-xs text-muted-foreground">{format(item.createdAt, 'dd/MM/yyyy')}</span></TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <span>{item.rating}</span>
                                                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-muted-foreground">{item.comment || <em>No comment provided.</em>}</p>
                                                {item.reply && (
                                                    <div className="mt-2 p-2 bg-muted/50 border-l-2 border-primary text-sm">
                                                        <p className="font-semibold text-primary">Your Reply:</p>
                                                        <p className="text-foreground">{item.reply}</p>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenReplyDialog(item)}>
                                                    {item.reply ? <Edit className="mr-2 h-4 w-4" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                                                    {item.reply ? 'Edit Reply' : 'Reply'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No feedback has been submitted yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Feedback Details</DialogTitle>
                        <DialogDescription>From {currentFeedback?.userName || 'User'} on {currentFeedback ? format(currentFeedback.createdAt, 'PPp') : ''}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-3 bg-muted rounded-md border">
                            <p className="text-sm font-semibold">Original Comment:</p>
                            <p className="text-sm text-muted-foreground italic">"{currentFeedback?.comment || 'No comment provided.'}"</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reply-text">Your Reply</Label>
                            <Textarea
                                id="reply-text"
                                placeholder="Type your reply here..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={5}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReplyDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSendReply} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Reply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
