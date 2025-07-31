
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Feedback } from '@/lib/types';
import { format } from 'date-fns';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackManagementProps {
    initialFeedback: Feedback[];
}

export function FeedbackManagement({ initialFeedback }: FeedbackManagementProps) {
    const [feedback] = useState<Feedback[]>(initialFeedback);

    return (
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
                                <TableHead>Comment</TableHead>
                                <TableHead className="text-right">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {feedback.length > 0 ? (
                                feedback.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.userName}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <span>{item.rating}</span>
                                                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {item.comment || <em>No comment provided.</em>}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                            {format(item.createdAt, 'dd/MM/yyyy p')}
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
    );
}
