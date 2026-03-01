
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alertDialog';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';


const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [emailForReset, setEmailForReset] = useState('');


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handlePasswordReset = async () => {
    const auth = getFirebaseAuth();
    if (!auth || !emailForReset) return;
    try {
        await sendPasswordResetEmail(auth, emailForReset);
        toast({
            title: "Password Reset Email Sent",
            description: "Please check your inbox to create your password.",
        });
    } catch (error) {
        toast({
            title: "Error",
            description: "Failed to send password reset email. Please try again.",
            variant: "destructive",
        });
    } finally {
        setShowResetPrompt(false);
    }
  };

  const checkIfFreeClassUser = async (email: string) => {
    const db = getFirebaseDb();
    if (!db) return false;
    try {
        const registrationsRef = collection(db, 'freeClassRegistrations');
        const q = query(registrationsRef, where('email', '==', email), limit(1));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error("Error checking free class registrations:", error);
        return false;
    }
  };

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
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push('/dashboard');
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
       switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. Please try again.';
          const isFreeUser = await checkIfFreeClassUser(values.email);
          if (isFreeUser) {
              setEmailForReset(values.email);
              setShowResetPrompt(true);
              setIsLoading(false);
              return;
          }
          break;
        case 'auth/invalid-email':
            errorMessage = 'The email address you entered is not valid.';
            break;
        case 'auth/too-many-requests':
            errorMessage = 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
            break;
      }
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      <AlertDialog open={showResetPrompt} onOpenChange={setShowResetPrompt}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Set Your Password</AlertDialogTitle>
            <AlertDialogDescription>
                It looks like you've registered for our free class. To log in and secure your account, please create a password. A password creation link will be sent to <strong>{emailForReset}</strong>.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handlePasswordReset}>
                    Send Link
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} method="POST" className="space-y-6">
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
                <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="flex items-center justify-end">
                    <Link href="/auth/forgot-password" passHref>
                        <Button variant="link" className="px-0">Forgot password?</Button>
                    </Link>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log In
                </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="underline">
                Register
              </Link>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
