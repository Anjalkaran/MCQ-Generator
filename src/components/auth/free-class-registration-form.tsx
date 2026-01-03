
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

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  gender: z.string().min(1, { message: 'Please select a gender.' }),
  mobileNumber: z.string().min(10, { message: 'Please enter a valid 10-digit mobile number.' }).max(10),
  division: z.string().min(1, { message: 'Division is required.' }),
  employeeId: z.string().min(1, { message: 'Employee ID is required.' }),
  designation: z.string().min(1, { message: 'Please select a designation.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
});

export function FreeClassRegistrationForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
        const response = await fetch('/api/free-class-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Something went wrong.');
        }
        
        setIsSubmitted(true);
        form.reset();

    } catch (error: any) {
        toast({
            title: 'Registration Failed',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
        <Card className="w-full">
            <CardHeader className="text-center">
                <div className="mx-auto bg-green-100 dark:bg-green-900/50 p-4 rounded-full w-fit">
                    <PartyPopper className="h-8 w-8 text-green-500" />
                </div>
                <CardTitle className="text-2xl pt-4">Registration Successful!</CardTitle>
                <CardDescription className="max-w-md mx-auto">
                    Thank you for registering. If you are a new user, a password has been sent to your email address. You can now log in.
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
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle>Free Class Registration</CardTitle>
        <CardDescription>Fill out the form below to register for the free class.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
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
                    control={form.control}
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
                control={form.control}
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
                control={form.control}
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
                control={form.control}
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
                    control={form.control}
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
              control={form.control}
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
  );
}
