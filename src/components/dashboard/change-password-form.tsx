
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required.' }),
  newPassword: z.string().min(6, { message: 'New password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match.",
  path: ['confirmPassword'],
});

export function ChangePasswordForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        const auth = getFirebaseAuth();
        const currentUser = auth?.currentUser;

        if (!currentUser || !currentUser.email) {
            toast({ title: "Error", description: 'Authentication error. Please log in again.', variant: "destructive" });
            setIsLoading(false);
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(currentUser.email, values.currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, values.newPassword);
            
            toast({ title: "Success", description: 'Password updated successfully!' });
            form.reset();

        } catch (error: any) {
            console.error('Error changing password:', error);
            let message = 'An unexpected error occurred.';
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = 'The current password you entered is incorrect.';
            }
            toast({ title: "Error", description: message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

  return (
    <Card>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} method="POST" className="space-y-0">
                <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Enter your current password and a new password.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="currentPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
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
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Password
                    </Button>
                </CardFooter>
            </form>
        </Form>
    </Card>
  );
}
