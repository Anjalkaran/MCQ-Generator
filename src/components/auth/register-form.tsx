
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb, googleProvider } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, User, Mail, Phone, Building, MapPin, Lock, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { ScaleIn, StaggerContainer, StaggerItem, HoverScale, FadeIn } from '@/components/animations/motion-wrapper';

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
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [googleUid, setGoogleUid] = useState<string | null>(null);

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

  const handleGoogleSignUp = async () => {
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
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        toast({
            title: "Welcome back!",
            description: "You already have an account. Logging you in...",
        });
        router.push('/dashboard');
      } else {
        setIsGoogleUser(true);
        setGoogleUid(user.uid);
        form.setValue('name', user.displayName || '');
        form.setValue('email', user.email || '');
        form.setValue('password', 'GOOGLE_AUTH_USER');
        form.setValue('confirmPassword', 'GOOGLE_AUTH_USER');
        
        toast({
          title: "Successfully authenticated!",
          description: "Please fill in the remaining details to complete your registration.",
        });
      }
    } catch (error: any) {
        if (error.code !== 'auth/popup-closed-by-user') {
            toast({
                title: "Authentication Failed",
                description: error.message,
                variant: "destructive",
            });
        }
    } finally {
      setIsLoading(false);
    }
  };

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
      let uid = googleUid;
      
      if (!isGoogleUser) {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;
        uid = user.uid;
        await updateProfile(user, { displayName: values.name });
      }

      if (!uid) throw new Error("No user ID found.");

      await setDoc(doc(db, "users", uid), {
        uid: uid,
        name: values.name,
        email: values.email,
        phone: values.phone,
        employeeId: values.employeeId,
        city: values.city,
        division: values.division,
        examCategory: values.examCategory,
        totalExamsTaken: 0,
        isPro: false,
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
    <ScaleIn className="w-full max-w-xl">
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
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
                {isGoogleUser ? "Complete Your Profile" : "Create an Account"}
            </CardTitle>
            <CardDescription className="text-slate-500">
                {isGoogleUser 
                    ? "Just a few more details to get you started." 
                    : "Join Anjalkaran and start preparing for your future."}
            </CardDescription>
        </CardHeader>

        <CardContent className="relative z-10">
            <StaggerContainer className="space-y-6">
                {!isGoogleUser && (
                    <StaggerItem>
                        <HoverScale>
                            <Button 
                                type="button" 
                                variant="outline" 
                                className="w-full bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all h-12 text-base font-semibold group/btn"
                                onClick={handleGoogleSignUp}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <svg className="mr-2 h-5 w-5 group-hover/btn:scale-110 transition-transform" viewBox="0 0 48 48">
                                        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                                        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                                        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                                        <path fill="#1976D2" d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                                    </svg>
                                )}
                                Sign up with Gmail
                            </Button>
                        </HoverScale>
                    </StaggerItem>
                )}

                <StaggerItem className="relative">
                    {!isGoogleUser && (
                        <>
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-4 text-slate-400 rounded-full py-1">Or register with email</span>
                            </div>
                        </>
                    )}
                </StaggerItem>

                <StaggerItem>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 font-medium">Full Name</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                    <Input 
                                                        placeholder="John Doe" 
                                                        className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-red-500/50" 
                                                        disabled={isGoogleUser}
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
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 font-medium">Email Address</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                    <Input 
                                                        placeholder="john@example.com" 
                                                        className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-red-500/50" 
                                                        disabled={isGoogleUser}
                                                        {...field} 
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="employeeId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 font-medium">Employee ID</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                    <Input 
                                                        placeholder="EMP123456" 
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
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 font-medium">Phone Number</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                    <Input 
                                                        placeholder="+91 98765 43210" 
                                                        className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-red-500/50" 
                                                        {...field} 
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {!isGoogleUser && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-medium">Password</FormLabel>
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
                                    <FormField
                                        control={form.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-medium">Confirm Password</FormLabel>
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
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 font-medium">City</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                    <Input 
                                                        placeholder="Your City" 
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
                                    name="division"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 font-medium">Postal Division</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                    <Input 
                                                        placeholder="Your Division" 
                                                        className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-red-500/50" 
                                                        {...field} 
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="examCategory"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-medium">Exam Category</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-white border-slate-200 text-slate-900 focus:ring-red-500/50">
                                                    <SelectValue placeholder="Select your preferred exam" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-white border-slate-200">
                                                <SelectItem value="MTS" className="text-slate-900 focus:bg-red-50 focus:text-red-900">MTS (Multi Tasking Staff)</SelectItem>
                                                <SelectItem value="Postman" className="text-slate-900 focus:bg-red-50 focus:text-red-900">Postman / Mail Guard</SelectItem>
                                                <SelectItem value="PA_SA" className="text-slate-900 focus:bg-red-50 focus:text-red-900">PA / SA (Postal Assistant)</SelectItem>
                                                <SelectItem value="IP" className="text-slate-900 focus:bg-red-50 focus:text-red-900">IP (Inspector Post)</SelectItem>
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
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                className="border-slate-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="text-slate-500 text-xs text-wrap">
                                                I agree to the{" "}
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <span className="text-red-600 hover:text-red-700 font-semibold underline underline-offset-4 cursor-pointer ml-1">
                                                            Terms and Conditions
                                                        </span>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl bg-white border-slate-200">
                                                        <DialogHeader>
                                                            <VisuallyHidden>
                                                                <DialogTitle>Terms and Conditions</DialogTitle>
                                                            </VisuallyHidden>
                                                            <VisuallyHidden>
                                                                <DialogDescription>Legal agreement and practice disclaimer.</DialogDescription>
                                                            </VisuallyHidden>
                                                        </DialogHeader>
                                                        <ScrollArea className="h-[400px] mt-4 pr-4">
                                                            <div className="prose prose-sm prose-slate max-w-none text-slate-600">
                                                                <h3 className="text-slate-900 font-bold mb-2">Terms and Conditions</h3>
                                                                <p>Welcome to Anjalkaran. By using our service, you agree to the following terms:</p>
                                                                <ul className="list-disc list-inside space-y-2 mt-2">
                                                                    <li>The questions provided are generated by an advanced automated system and are intended for practice purposes only.</li>
                                                                    <li>While we strive for accuracy, Anjalkaran is not responsible for any inaccuracies in the questions or answers provided.</li>
                                                                    <li>Information, rules, and regulations regarding postal products, services, and exams may change. Users are advised to always refer to the latest official materials and circulars for definitive information.</li>
                                                                    <li>This service is a supplementary tool to aid your preparation and should not be considered an official source of information.</li>
                                                                </ul>
                                                                <Alert variant="destructive" className="bg-red-50 mt-6 border-red-200 text-red-800">
                                                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                                                    <AlertTitle className="font-bold text-red-900">Disclaimer</AlertTitle>
                                                                    <p className="text-xs mt-1">
                                                                        The content generated here is for practice only. Always cross-reference with official publications for exam preparation.
                                                                    </p>
                                                                </Alert>
                                                            </div>
                                                        </ScrollArea>
                                                    </DialogContent>
                                                </Dialog>
                                            </FormLabel>
                                            <FormMessage />
                                        </div>
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
                                        isGoogleUser ? "Complete Registration" : "Create Account"
                                    )}
                                </Button>
                            </HoverScale>
                        </form>
                    </Form>
                </StaggerItem>

                {!isGoogleUser && (
                    <StaggerItem className="mt-8 text-center text-sm text-slate-500">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-red-600 hover:text-red-700 font-semibold underline underline-offset-4 decoration-red-600/30 hover:decoration-red-600 transition-all">
                            Log In
                        </Link>
                    </StaggerItem>
                )}
            </StaggerContainer>
        </CardContent>
      </Card>
    </ScaleIn>
  );
}
