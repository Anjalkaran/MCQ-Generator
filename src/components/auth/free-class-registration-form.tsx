
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const registrationSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  gender: z.string().min(1, { message: 'Please select a gender.' }),
  mobileNumber: z.string().min(10, { message: 'Please enter a valid 10-digit mobile number.' }).max(10),
  division: z.string().min(1, { message: 'Division is required.' }),
  employeeId: z.string().min(1, { message: 'Employee ID is required.' }),
  designation: z.string().min(1, { message: 'Please select a designation.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
});

const passwordSchema = z.object({
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export function FreeClassRegistrationForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegistrationFormValues | null>(null);

  const registrationForm = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: '',
      gender: '',
      mobileNumber: '',
      division: '',
      employeeId: '',
      designation: '',
      email: '',
    },
  });
  
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
        password: '',
        confirmPassword: '',
    }
  });

  const handleRegistrationSubmit = async (values: RegistrationFormValues) => {
    setIsLoading(true);
    setRegistrationData(values); // Store form data

    try {
        // Step 1: Check if email exists
        const checkResponse = await fetch('/api/user/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: values.email }),
        });

        const { exists } = await checkResponse.json();

        if (exists) {
            // If user exists, proceed with registration directly
            await completeRegistration(values);
        } else {
            // If user does not exist, open password dialog
            setIsPasswordDialogOpen(true);
        }

    } catch (error: any) {
        toast({
            title: 'Error',
            description: error.message || 'Could not check email status.',
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (passwordValues: PasswordFormValues) => {
      if (!registrationData) return;
      setIsLoading(true);
      
      const finalData = {
          ...registrationData,
          password: passwordValues.password
      };
      
      await completeRegistration(finalData);
      setIsPasswordDialogOpen(false);
      setIsLoading(false);
  }

  const completeRegistration = async (data: any) => {
      try {
            const response = await fetch('/api/free-class-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Something went wrong.');
            }
            
            setIsSubmitted(true);
            registrationForm.reset();

        } catch (error: any) {
            toast({
                title: 'Registration Failed',
                description: error.message,
                variant: 'destructive',
            });
        }
  }


  if (isSubmitted) {
    return (
        <Card className="w-full">
            <CardHeader className="text-center">
                <div className="mx-auto bg-green-100 dark:bg-green-900/50 p-4 rounded-full w-fit">
                    <PartyPopper className="h-8 w-8 text-green-500" />
                </div>
                <CardTitle className="text-2xl pt-4">Registration Successful!</CardTitle>
                <CardDescription className="max-w-md mx-auto">
                    Thank you for registering. You can now log in to access the platform. If you're a new user, please use the password you just created.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Button asChild>
                    <Link href="/auth/login">
                        Proceed to Login
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
  }

  return (
    <>
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle>Free Class Registration</CardTitle>
        <CardDescription>Fill out the form below to register for the free class.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...registrationForm}>
          <form onSubmit={registrationForm.handleSubmit(handleRegistrationSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={registrationForm.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="Full Name" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                    control={registrationForm.control}
                    name="gender"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                control={registrationForm.control}
                name="mobileNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl><Input type="tel" placeholder="10-digit number" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={registrationForm.control}
                name="division"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Division</FormLabel>
                    <FormControl><Input placeholder="e.g., Chennai" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={registrationForm.control}
                name="employeeId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl><Input placeholder="Your Employee ID" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                    control={registrationForm.control}
                    name="designation"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Designation</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Designation" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="GDS">GDS</SelectItem>
                                <SelectItem value="MTS">MTS</SelectItem>
                                <SelectItem value="POSTMAN">Postman</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
              control={registrationForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your.email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register for Free Class
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>

    <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create Your Account</DialogTitle>
                <DialogDescription>
                    Welcome! It looks like you're new here. Please create a password to complete your registration.
                </DialogDescription>
            </DialogHeader>
             <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                    <FormField
                        control={passwordForm.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl><Input type="password" placeholder="********" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl><Input type="password" placeholder="********" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Account
                        </Button>
                    </DialogFooter>
                </form>
             </Form>
        </DialogContent>
    </Dialog>
    </>
  );
}
