
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDashboard } from '@/app/dashboard/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    if (!user || !userData) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...values,
                userId: user.uid,
                userName: userData.name,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to submit feedback.');
        }

        setIsSubmitted(true);

    } catch (error: any) {
        console.error('Error submitting feedback:', error);
        toast({ title: 'Error', description: error.message || 'Failed to submit feedback.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <Card>
                <CardHeader className="text-center">
                    <div className="mx-auto bg-green-100 dark:bg-green-900/50 p-4 rounded-full w-fit">
                        <PartyPopper className="h-8 w-8 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl pt-4">Thank You!</CardTitle>
                    <CardDescription className="max-w-md mx-auto">
                        Your feedback has been submitted successfully. We appreciate you taking the time to help us improve.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground">
          We'd love to hear your thoughts on our application.
        </p>
      </div>
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
                <CardTitle>Share Your Experience</CardTitle>
                <CardDescription>Your rating and comments will help us improve.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <fieldset disabled={isSubmitting || isDashboardLoading} className="space-y-6">
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overall Rating</FormLabel>
                      <FormControl>
                        <div 
                          className="flex items-center gap-2"
                          onMouseLeave={() => setHoverRating(0)}
                        >
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                'h-8 w-8 cursor-pointer transition-colors',
                                (hoverRating >= star || field.value >= star)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-muted-foreground'
                              )}
                              onMouseEnter={() => setHoverRating(star)}
                              onClick={() => field.onChange(star)}
                            />
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
                        <FormItem>
                        <FormLabel>Comments (Optional)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Tell us what you liked or what could be better..." rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
              </fieldset>
            </CardContent>
            <CardFooter>
            <Button type="submit" disabled={isSubmitting || isDashboardLoading || form.watch('rating') === 0}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className="mr-2 h-4 w-4" />}
                Submit Feedback
            </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
