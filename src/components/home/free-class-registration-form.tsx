

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const courses = [
  { id: "MTS", label: "MTS" },
  { id: "POSTMAN", label: "POSTMAN" },
  { id: "PA", label: "PA" },
] as const;


const formSchema = z.object({
  name: z.string().min(2, { message: 'Name is required.' }),
  gender: z.string({ required_error: 'Please select a gender.'}),
  mobileNumber: z.string().length(10, { message: 'Mobile number must be 10 digits.' }),
  division: z.string().min(2, { message: 'Division is required.' }),
  employeeId: z.string().min(1, { message: 'Employee ID is required.'}),
  designation: z.string({ required_error: 'Please select a designation.'}),
  email: z.string().email({ message: 'A valid email is required.'}),
  courses: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one course.",
  }),
});

export function FreeClassRegistrationForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      mobileNumber: '',
      employeeId: '',
      division: '',
      email: '',
      courses: [],
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
        <Card className="w-full max-w-lg">
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
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Free Class Registration</CardTitle>
        <CardDescription>Fill out the form below to register for the free class.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select Gender" />
                                </SelectTrigger>
                            </FormControl>
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
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl><Input placeholder="10-digit number" {...field} /></FormControl>
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
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select Designation" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="GDS">GDS</SelectItem>
                                <SelectItem value="MTS">MTS</SelectItem>
                                <SelectItem value="Postman">Postman</SelectItem>
                                <SelectItem value="PA">PA</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
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
                    <FormControl><Input placeholder="your.email@example.com" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="courses"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Course Register For</FormLabel>
                  </div>
                  <div className="flex items-center space-x-4">
                    {courses.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="courses"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {item.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register for Free Class
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
