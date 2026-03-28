
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb, googleProvider } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock } from 'lucide-react';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import { ScaleIn, StaggerContainer, StaggerItem, HoverScale } from '@/components/animations/motion-wrapper';

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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    if (!auth || !db) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        toast({
          title: 'Account Not Found',
          description: 'No account exists for this Google account. Please register first.',
          variant: 'destructive',
        });
        await auth.signOut();
        router.push('/auth/register');
        return;
      }

      router.push('/dashboard');
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          title: 'Login Failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const auth = getFirebaseAuth();
    if (!auth || !emailForReset) return;

    try {
      await sendPasswordResetEmail(auth, emailForReset);
      toast({
        title: 'Password Reset Email Sent',
        description: `A link to create your password has been sent to ${emailForReset}. Please check your inbox.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Could not send reset email. Please try again.',
        variant: 'destructive',
      });
    }
    setShowResetPrompt(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    if (!auth || !db) {
      toast({
        title: 'Authentication Error',
        description: 'Could not connect to authentication service.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push('/dashboard');
    } catch (error: any) {
      // If login fails, check if the user exists in Firestore as a legacy "Free Class" user
      // who was added manually and may not have a password set
      if (
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found'
      ) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', values.email), limit(1));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // User exists in Firestore but can't log in - likely a legacy user
            setEmailForReset(values.email);
            setShowResetPrompt(true);
            setIsLoading(false);
            return;
          }
        } catch (dbError) {
          // If Firestore lookup fails, fall through to generic error
        }
      }

      let errorMessage = 'An unexpected error occurred. Please try again.';
      switch (error.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Incorrect email or password. Please check your credentials.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email. Please register first.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed login attempts. Please try again later or reset your password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid.';
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
              It looks like you&apos;ve registered for our free class. To log in and secure your account, please create a password. A password creation link will be sent to <strong>{emailForReset}</strong>.
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

      <ScaleIn className="w-full max-w-md">
        <Card className="border-slate-200 bg-white/70 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 opacity-50 group-hover:opacity-75 transition-opacity pointer-events-none" />

          <CardHeader className="text-center pt-8 pb-4 relative z-10">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                <Image
                  src="/header-logo.png"
                  alt="Anjalkaran Logo"
                  width={120}
                  height={40}
                  className="h-10 w-auto"
                  priority
                />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">Welcome Back</CardTitle>
            <CardDescription className="text-slate-500">Sign in to continue your learning journey.</CardDescription>
          </CardHeader>

          <CardContent className="relative z-10">
            <StaggerContainer className="space-y-6">
              <StaggerItem>
                <HoverScale>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all h-12 text-base font-semibold group/btn"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-5 w-5 group-hover/btn:scale-110 transition-transform" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                        <path fill="#1976D2" d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                      </svg>
                    )}
                    Continue with Gmail
                  </Button>
                </HoverScale>
              </StaggerItem>

              <StaggerItem className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-slate-400 rounded-full py-1">Or continue with</span>
                </div>
              </StaggerItem>

              <StaggerItem>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} method="POST" className="space-y-5">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-medium">Email Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                              <Input
                                placeholder="name@example.com"
                                className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-red-500/50"
                                {...field}
                              />
                            </div>
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
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-slate-700 font-medium">Password</FormLabel>
                            <Link href="/auth/forgot-password">
                              <span className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors cursor-pointer font-medium">
                                Forgot password?
                              </span>
                            </Link>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                              <Input
                                type="password"
                                placeholder="••••••••"
                                className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-red-500/50"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <HoverScale>
                      <Button
                        type="submit"
                        className="w-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 h-12 text-base font-bold transition-all active:scale-[0.98]"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          'Log In'
                        )}
                      </Button>
                    </HoverScale>
                  </form>
                </Form>
              </StaggerItem>

              <StaggerItem className="mt-8 text-center text-sm text-slate-500">
                New to Anjalkaran?{' '}
                <Link href="/auth/register" className="text-red-600 hover:text-red-700 font-semibold underline underline-offset-4 decoration-red-600/30 hover:decoration-red-600 transition-all">
                  Create an account
                </Link>
              </StaggerItem>
            </StaggerContainer>
          </CardContent>
        </Card>
      </ScaleIn>
    </>
  );
}
