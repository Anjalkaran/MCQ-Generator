
"use client";

import { useRef, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useFormState } from 'react-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserData } from "@/lib/types";
import { updateUserProfile } from '@/actions/update-user-profile';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ProfileFormProps {
  user: UserData;
}

const initialState = {
  message: '',
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Save Changes
    </Button>
  );
}

export function ProfileForm({ user }: ProfileFormProps) {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    
    // Bind the user ID to the server action
    const updateUserProfileWithId = updateUserProfile.bind(null, user.uid);
    const [state, formAction] = useFormState(updateUserProfileWithId, initialState);
    
    useEffect(() => {
        if (state.message) {
            if (state.success) {
                toast({ title: "Success", description: state.message });
            } else {
                toast({ title: "Error", description: state.message, variant: "destructive" });
            }
        }
    }, [state, toast]);


  return (
    <form ref={formRef} action={formAction} className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Personal & Course Details</CardTitle>
                <CardDescription>Manage your personal information and exam preferences. Changing this will update the price for your next renewal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" defaultValue={user.name} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={user.email} disabled />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="examCategory">Preferred Exam Category</Label>
                    <Select name="examCategory" defaultValue={user.examCategory}>
                        <SelectTrigger>
                        <SelectValue placeholder="Select your exam preference" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="MTS">MTS</SelectItem>
                        <SelectItem value="POSTMAN">POSTMAN</SelectItem>
                        <SelectItem value="PA">PA</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <SubmitButton />
            </CardFooter>
        </Card>
    </form>
  );
}
