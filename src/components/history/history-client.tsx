
"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye } from 'lucide-react';
import type { MCQHistory } from '@/lib/types';

interface HistoryClientProps {
  initialHistory: MCQHistory[];
}

export function HistoryClient({ initialHistory }: HistoryClientProps) {
  const [history] = useState<MCQHistory[]>(initialHistory);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Past Exams</CardTitle>
        <CardDescription>A list of all the exams you have taken.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Date Taken</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length > 0 ? (
                history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.topicTitle}</TableCell>
                    <TableCell>{`${item.score} / ${item.totalQuestions}`}</TableCell>
                    <TableCell>{format(item.takenAt, 'PPP p')}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Questions</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl">
                          <DialogHeader>
                            <DialogTitle>Questions for: {item.topicTitle}</DialogTitle>
                            <DialogDescription>
                              Exam taken on {format(item.takenAt, 'PPP p')}
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-72 w-full pr-4">
                            <ol className="list-decimal list-inside space-y-4">
                              {item.questions.map((q, index) => (
                                <li key={index} className="text-sm">{q}</li>
                              ))}
                            </ol>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    You have not taken any exams yet.
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
