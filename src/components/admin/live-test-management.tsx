
"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Calendar as CalendarIcon, Clock, Trash2 } from 'lucide-react';
import { addLiveTest } from '@/lib/firestore';
import type { BankedQuestion, LiveTest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, normalizeDate } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

const examCategories = ["MTS", "POSTMAN", "PA"] as const;

const scheduleSchema = z.object({
  title: z.string().min(3, "Title is required."),
  questionPaperId: z.string().min(1, "You must select a question paper."),
  examCategory: z.enum(examCategories),
  price: z.coerce.number().min(0, "Price must be a positive number.").optional().default(0),
  startTime: z.date({ required_error: "A start date and time is required." }),
  endTime: z.date({ required_error: "An end date and time is required." })
}).refine(data => data.endTime > data.startTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
});

interface LiveTestManagementProps {
    initialLiveTestBank: BankedQuestion[];
    initialLiveTests: LiveTest[];
}

export function LiveTestManagement({ initialLiveTestBank, initialLiveTests }: LiveTestManagementProps) {
  const [isScheduling, setIsScheduling] = useState(false);
  const [liveTestBank] = useState<BankedQuestion[]>(initialLiveTestBank);
  const [liveTests, setLiveTests] = useState<LiveTest[]>(initialLiveTests);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof scheduleSchema>>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      title: '',
      questionPaperId: undefined,
      examCategory: undefined,
      price: 0,
      startTime: undefined,
      endTime: undefined,
    }
  });

  const onSubmit = async (values: z.infer<typeof scheduleSchema>) => {
    setIsScheduling(true);
    try {
        const liveTestData: Omit<LiveTest, 'id'> = {
            ...values,
            startTime: Timestamp.fromDate(values.startTime),
            endTime: Timestamp.fromDate(values.endTime),
        };
        const newDocRef = await addLiveTest(liveTestData);
        
        const newLiveTest: LiveTest = {
          id: newDocRef.id,
          ...values,
          startTime: Timestamp.fromDate(values.startTime),
          endTime: Timestamp.fromDate(values.endTime),
        }
        
        setLiveTests(prev => [newLiveTest, ...prev].sort((a,b) => normalizeDate(b.startTime)!.getTime() - normalizeDate(a.startTime)!.getTime()));
        
        toast({ title: 'Success', description: 'Live test scheduled successfully.' });
        form.reset();
    } catch (error: any) {
      console.error("Live test scheduling error:", error);
      toast({ title: 'Scheduling Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsScheduling(false);
    }
  };
  
  const selectedCategory = form.watch('examCategory');
  const filteredPapers = selectedCategory 
    ? liveTestBank.filter(p => p.examCategory === selectedCategory) 
    : [];
    
  const getStatus = (test: LiveTest) => {
    const now = new Date();
    const startTime = normalizeDate(test.startTime)!;
    const endTime = normalizeDate(test.endTime)!;

    if (now > endTime) return <Badge variant="secondary">Completed</Badge>;
    if (now >= startTime && now <= endTime) return <Badge className="bg-green-600 hover:bg-green-700">Live</Badge>;
    return <Badge variant="outline">Upcoming</Badge>;
  };
  
  const getQuestionPaperName = (id: string) => {
    return liveTestBank.find(p => p.id === id)?.fileName || 'Unknown Paper';
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
        <Card>
        <CardHeader>
            <CardTitle>Schedule a New Live Test</CardTitle>
            <CardDescription>Select a question paper and set the schedule for the live test.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Test Title</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., All India MTS Mock Test" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="examCategory"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Exam Category</FormLabel>
                            <Select onValueChange={(value) => {
                                field.onChange(value);
                                form.resetField('questionPaperId');
                            }} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an exam category" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {examCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="questionPaperId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Question Paper</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategory}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={!selectedCategory ? "Select category first" : "Select a paper"} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {filteredPapers.map(p => <SelectItem key={p.id} value={p.id}>{p.fileName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Price (INR)</FormLabel>
                             <FormControl>
                                <Input type="number" placeholder="e.g., 29" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Start Date & Time</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP HH:mm")
                                ) : (
                                    <span>Pick a date and time</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                                initialFocus
                            />
                            <div className="p-2 border-t border-border">
                               <Input 
                                 type="time" 
                                 onChange={(e) => {
                                     const [hours, minutes] = e.target.value.split(':').map(Number);
                                     const newDate = new Date(field.value || new Date());
                                     newDate.setHours(hours, minutes);
                                     field.onChange(newDate);
                                 }}
                               />
                            </div>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>End Date & Time</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP HH:mm")
                                ) : (
                                    <span>Pick a date and time</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < (form.getValues('startTime') || new Date())}
                                initialFocus
                            />
                             <div className="p-2 border-t border-border">
                               <Input 
                                 type="time" 
                                 onChange={(e) => {
                                     const [hours, minutes] = e.target.value.split(':').map(Number);
                                     const newDate = new Date(field.value || new Date());
                                     newDate.setHours(hours, minutes);
                                     field.onChange(newDate);
                                 }}
                               />
                            </div>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <Button type="submit" disabled={isScheduling}>
                {isScheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                Schedule Live Test
                </Button>
            </form>
            </Form>
        </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>All Scheduled Live Tests</CardTitle>
                <CardDescription>A complete list of upcoming, live, and past tests.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Start Time</TableHead>
                                <TableHead>End Time</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {liveTests.length > 0 ? (
                                liveTests.map((test) => (
                                    <TableRow key={test.id}>
                                        <TableCell className="font-medium">{test.title}<br/><span className="text-xs text-muted-foreground">{getQuestionPaperName(test.questionPaperId)}</span></TableCell>
                                        <TableCell>{format(normalizeDate(test.startTime)!, "dd/MM/yy hh:mm a")}</TableCell>
                                        <TableCell>{format(normalizeDate(test.endTime)!, "dd/MM/yy hh:mm a")}</TableCell>
                                        <TableCell>{getStatus(test)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No live tests scheduled yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
