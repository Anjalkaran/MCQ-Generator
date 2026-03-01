
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Username is required.' }),
  email: z.string().email({ message: 'Invalid email address.' }).refine(
    (email) => {
        const lowercasedEmail = email.toLowerCase();
        return lowercasedEmail.endsWith('@gmail.com') || lowercasedEmail.endsWith('@anjalkaran.com');
    },
    {
        message: "Only @gmail.com and @anjalkaran.com addresses are allowed.",
    }
  ),
  phone: z.string().min(10, { message: 'A valid 10-digit mobile number is required.' }),
  employeeId: z.string().length(8, { message: 'Employee ID must be exactly 8 digits.' }).regex(/^\d{8}$/, 'Employee ID must be a number.'),
  city: z.string().min(2, { message: "City is required." }),
  division: z.string().min(2, { message: 'Division name is required.' }).refine(val => !val.includes('@'), {
    message: 'Division cannot be an email address.',
  }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
  examCategory: z.string().min(1, { message: 'Please select an exam category.' }),
  terms: z.literal<boolean>(true, {
    errorMap: () => ({ message: "You must accept the Terms and Conditions to proceed." }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      employeeId: '',
      city: '',
      division: '',
      password: '',
      confirmPassword: '',
      examCategory: '',
      terms: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    if (!auth || !db) {
        toast({
            title: "Authentication Error",
            description: "Could not connect to authentication service.",
            variant: "destructive",
        });
        setIsLoading(false);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: values.name });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: values.name,
        email: values.email,
        phone: values.phone,
        employeeId: values.employeeId,
        city: values.city,
        division: values.division,
        examCategory: values.examCategory,
        totalExamsTaken: 0,
        isPro: false, // Default set to false
        proValidUntil: null,
        createdAt: new Date(),
        lastSeen: serverTimestamp(),
        hasSeenReasoningUpdate: false,
        mockTestUpdateSeenCount: 2, 
      });

      toast({
        title: "Account Created",
        description: "You have been successfully registered.",
      });
      router.push('/dashboard');
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email address is already registered. Please use a different email or log in.';
          break;
        case 'auth/weak-password':
          errorMessage = 'The password is too weak. Please choose a stronger password with at least 6 characters.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address you entered is not valid. Please check and try again.';
          break;
      }
      toast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>Create an Account</CardTitle>
        <CardDescription>Enter your details to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} method="POST" className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="User Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input placeholder="10-digit mobile number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee ID</FormLabel>
                  <FormControl>
                    <Input placeholder="8-digit Employee ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="Your City" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="division"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Division</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Postal Division" {...field} />
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
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your exam preference" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MTS">MTS</SelectItem>
                      <SelectItem value="POSTMAN">POSTMAN</SelectItem>
                      <SelectItem value="PA">PA</SelectItem>
                      <SelectItem value="IP">IP (Inspector Posts)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                        I agree to the 
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="link" className="p-0 h-auto ml-1">Terms and Conditions</Button>
                            </DialogTrigger>
                             <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Terms and Conditions</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 text-sm text-muted-foreground">
                                    <p>Welcome to Anjalkaran. By using our service, you agree to the following terms:</p>
                                    <ul className="list-disc list-inside space-y-2">
                                        <li>The questions provided are generated by an advanced automated system and are intended for practice purposes only.</li>
                                        <li>While we strive for accuracy, Anjalkaran is not responsible for any inaccuracies in the questions or answers provided.</li>
                                        <li>Information, rules, and regulations regarding postal products, services, and exams may change. Users are advised to always refer to the latest official materials and circulars for definitive information.</li>
                                        <li>This service is a supplementary tool to aid your preparation and should not be considered an official source of information.</li>
                                    </ul>
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Disclaimer</AlertTitle>
                                        <DialogDescription>
                                            The content generated here is for practice only. Always cross-reference with official publications for exam preparation.
                                        </DialogDescription>
                                    </Alert>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="underline">
              Log In
            </Link>
        </div>
      </CardContent>
    </Card>
  );
}
