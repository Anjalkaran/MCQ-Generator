
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import { updateUserDocument } from '@/lib/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { UserData } from "@/lib/types";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ProfileFormProps {
  user: User;
  userData: UserData;
}

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
});

export function ProfileForm({ user, userData }: ProfileFormProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: userData.name || '',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        try {
            const dataToUpdate: { name: string } = {
                name: values.name
            };

            await updateUserDocument(user.uid, { name: dataToUpdate.name });

            if (user.displayName !== values.name) {
                await updateProfile(user, { displayName: values.name });
            }
            
            toast({ title: "Success", description: "Profile updated successfully!" });

        } catch (error) {
            console.error('Error updating profile:', error);
            toast({ title: "Error", description: "An unexpected error occurred while updating your profile.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
            <CardHeader>
                <CardTitle>Personal & Course Details</CardTitle>
                <CardDescription>Manage your personal information. Your exam category cannot be changed here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={userData.email} disabled />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="examCategory">Preferred Exam Category</Label>
                     <Input id="examCategory" name="examCategory" defaultValue={userData.examCategory} disabled />
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </CardFooter>
        </form>
       </Form>
    </Card>
  );
}
