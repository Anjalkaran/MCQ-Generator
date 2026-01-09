
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PartyPopper } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name is required.' }),
  mobile: z.string().length(10, { message: 'Mobile number must be 10 digits.' }),
  employeeId: z.string().length(8, { message: 'Employee ID must be 8 digits.' }),
  city: z.string().min(2, { message: 'City is required.' }),
  division: z.string().min(2, { message: 'Division is required.' }),
});

export function FreeClassRegistrationForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      mobile: '',
      employeeId: '',
      city: '',
      division: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const db = getFirebaseDb();
    if (!db) {
        toast({ title: "Error", description: "Could not connect to the database.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    try {
        await addDoc(collection(db, "freeClassRegistrations"), {
            ...values,
            registeredAt: new Date(),
        });
        setIsSubmitted(true);
    } catch (error) {
        console.error("Error submitting registration:", error);
        toast({ title: "Error", description: "Could not submit your registration. Please try again.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };
  
  if (isSubmitted) {
    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <div className="mx-auto bg-green-100 dark:bg-green-900/50 p-4 rounded-full w-fit">
                    <PartyPopper className="h-8 w-8 text-green-500" />
                </div>
                <CardTitle className="text-2xl pt-4">Registration Successful!</CardTitle>
                <CardDescription>
                    Thank you for registering. You will receive a WhatsApp message with the class link before it begins.
                </CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>Free Class Registration</CardTitle>
        <CardDescription>Fill in your details to join our free online class.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="Your Name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Mobile Number</FormLabel>
                  <FormControl><Input placeholder="10-digit number" {...field} /></FormControl>
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
                  <FormControl><Input placeholder="8-digit ID" {...field} /></FormControl>
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
                  <FormControl><Input placeholder="Your City" {...field} /></FormControl>
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
                  <FormControl><Input placeholder="Your Postal Division" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register Now
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
