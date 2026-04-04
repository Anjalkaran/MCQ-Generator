
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDashboard } from '@/context/dashboard-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, PartyPopper, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { submitFeedback, getUserFeedback } from '@/lib/firestore';
import type { Feedback } from '@/lib/types';
import { format } from 'date-fns';

const formSchema = z.object({
  rating: z.number().min(1, 'Please select a rating.'),
  comment: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function FeedbackPage() {
  const { toast } = useToast();
  const { user, userData, isLoading: isDashboardLoading } = useDashboard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [previousFeedback, setPreviousFeedback] = useState<Feedback[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  useEffect(() => {
    if (user?.uid) {
      loadFeedbackHistory();
    }
  }, [user?.uid]);

  const loadFeedbackHistory = async () => {
    if (!user?.uid) return;
    setIsLoadingHistory(true);
    try {
      const history = await getUserFeedback(user.uid);
      setPreviousFeedback(history);
    } catch (error) {
      console.error('Failed to load feedback history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    if (!user || !userData) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    try {
        await submitFeedback({
            rating: values.rating,
            comment: values.comment || '',
            userId: user.uid,
            userName: userData.name,
            userEmail: user.email || '',
            createdAt: new Date(),
        });

        setIsSubmitted(true);
        toast({ title: 'Feedback Submitted', description: 'Thank you for your feedback!' });
        loadFeedbackHistory();

    } catch (error: any) {
        console.error('Error submitting feedback:', error);
        toast({ title: 'Error', description: error.message || 'Failed to submit feedback.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
        <div className="space-y-6 max-w-2xl mx-auto py-10">
            <Card className="border-2 border-green-500/20 shadow-lg shadow-green-500/5">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-green-100 dark:bg-green-900/50 p-4 rounded-full w-fit">
                        <PartyPopper className="h-8 w-8 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl pt-4">Thank You!</CardTitle>
                    <CardDescription className="max-w-md mx-auto text-base">
                        Your feedback has been submitted successfully. We appreciate you taking the time to help us improve.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-center pt-2 pb-8">
                    <Button variant="outline" onClick={() => setIsSubmitted(false)}>Submit Another Feedback</Button>
                </CardFooter>
            </Card>

            {previousFeedback.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Your Recent Feedback
                    </h2>
                    {previousFeedback.map((item) => (
                        <FeedbackCard key={item.id} feedback={item} />
                    ))}
                </div>
            )}
        </div>
    );
  }

  return (
    <div className="space-y-10 max-w-2xl mx-auto py-6 px-4">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Feedback</h1>
        <p className="text-muted-foreground text-lg">
          Help us build the best learning platform for postal exams.
        </p>
      </div>

      <Card className="shadow-xl border-t-4 border-t-primary overflow-hidden">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader className="bg-muted/30">
                <CardTitle>Share Your Experience</CardTitle>
                <CardDescription>How would you rate your overall experience with Anjalkaran?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              <fieldset disabled={isSubmitting || isDashboardLoading} className="space-y-8">
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-base font-semibold">Your Rating</FormLabel>
                      <FormControl>
                        <div 
                          className="flex items-center gap-4 py-2"
                          onMouseLeave={() => setHoverRating(0)}
                        >
                          {[1, 2, 3, 4, 5].map((star) => (
                            <div key={star} className="relative group">
                                <Star
                                    className={cn(
                                        'h-10 w-10 cursor-pointer transition-all duration-200 transform group-hover:scale-110',
                                        (hoverRating >= star || field.value >= star)
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-muted-foreground/30'
                                    )}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onClick={() => field.onChange(star)}
                                />
                                {field.value === star && (
                                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">
                                        {star === 1 ? 'Poor' : star === 2 ? 'Fair' : star === 3 ? 'Good' : star === 4 ? 'Great' : 'Best'}
                                    </span>
                                )}
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel className="text-base font-semibold">Comments (Optional)</FormLabel>
                        <FormControl>
                            <Textarea 
                                placeholder="What's working well? What can we do better? Any feature requests?" 
                                className="min-h-[150px] resize-none focus-visible:ring-primary border-muted"
                                {...field} 
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
              </fieldset>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t flex justify-end py-6">
                <Button 
                    type="submit" 
                    size="lg"
                    className="px-8 font-bold shadow-lg shadow-primary/20"
                    disabled={isSubmitting || isDashboardLoading || form.watch('rating') === 0}
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Star className="mr-2 h-5 w-5" />}
                    Submit Feedback
                </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {previousFeedback.length > 0 && (
        <div className="space-y-6 pt-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                Your Feedback History
            </h2>
            <div className="grid gap-4">
                {previousFeedback.map((item) => (
                    <FeedbackCard key={item.id} feedback={item} />
                ))}
            </div>
        </div>
      )}

      {isLoadingHistory && previousFeedback.length === 0 && (
          <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
      )}
    </div>
  );
}

function FeedbackCard({ feedback }: { feedback: Feedback }) {
    return (
        <Card className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-primary/30">
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-1 text-yellow-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={cn("h-4 w-4", s <= feedback.rating ? "fill-current" : "text-muted-foreground/30")} />
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(feedback.createdAt, 'PP')}
                    </div>
                </div>
                <p className="text-sm dark:text-gray-300 italic mb-4">"{feedback.comment || 'No comment provided.'}"</p>
                
                {feedback.reply && (
                    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg p-4 mt-2">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] text-white font-bold">A</div>
                            <span className="text-sm font-bold text-primary">Admin Reply</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{feedback.repliedAt ? format(feedback.repliedAt, 'PP') : ''}</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{feedback.reply}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
