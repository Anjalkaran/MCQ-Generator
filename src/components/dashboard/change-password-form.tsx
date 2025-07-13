
"use client";

import { useRef, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { changePassword } from '@/actions/change-password';

const initialState = {
  message: '',
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Update Password
    </Button>
  );
}

export function ChangePasswordForm() {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    
    const [state, formAction] = useActionState(changePassword, initialState);

    useEffect(() => {
        if (state.message) {
            if (state.success) {
                toast({ title: "Success", description: state.message });
                formRef.current?.reset();
            } else {
                toast({ title: "Error", description: state.message, variant: "destructive" });
            }
        }
    }, [state, toast]);


  return (
    <form ref={formRef} action={formAction} className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Enter your current password and a new password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" name="currentPassword" type="password" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" name="newPassword" type="password" required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" required />
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <SubmitButton />
            </CardFooter>
        </Card>
    </form>
  );
}
