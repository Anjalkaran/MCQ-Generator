
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
});

export function ForgotPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const auth = getFirebaseAuth();
    if (!auth) {
        toast({
            title: "Authentication Error",
            description: "Could not connect to authentication service.",
            variant: "destructive",
        });
        setIsLoading(false);
        return;
    }

    try {
      await sendPasswordResetEmail(auth, values.email);
      setIsSubmitted(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <CardTitle>Check Your Email</CardTitle>
                <CardDescription>
                    A password reset link has been sent to your email address. Please check your inbox and spam folder.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild className="w-full">
                    <Link href="/auth/login">
                        Back to Login
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>Forgot Password</CardTitle>
        <CardDescription>Enter your email to receive a password reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
          </form>
        </Form>
         <div className="mt-4 text-center text-sm">
            Remember your password?{' '}
            <Link href="/auth/login" className="underline">
              Log In
            </Link>
        </div>
      </CardContent>
    </Card>
  );
}
