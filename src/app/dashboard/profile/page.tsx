
"use client";

import { useDashboard } from '@/app/dashboard/layout';
import { ProfileForm } from '@/components/dashboard/profile-form';
import { ChangePasswordForm } from '@/components/dashboard/change-password-form';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, User, Gem } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { normalizeDate } from '@/lib/utils';
import { ADMIN_EMAILS } from '@/lib/constants';
import { format } from 'date-fns';

export default function ProfilePage() {
    const { user, userData, isLoading } = useDashboard();

    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!userData || !user) {
        return (
            <div className="space-y-6">
              <div className="space-y-0.5">
                  <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
                  <p className="text-muted-foreground">
                    Manage your account settings and exam preferences.
                  </p>
              </div>
              <div>Could not load user data. Please try logging in again.</div>
            </div>
          );
    }
    
    if (ADMIN_EMAILS.includes(userData.email)) {
         return (
            <div className="space-y-6">
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">Admin Profile</h1>
                    <p className="text-muted-foreground">
                        Profile management is not applicable for the admin account.
                    </p>
                </div>
                <Separator />
                <Alert>
                    <User className="h-4 w-4" />
                    <AlertTitle>Admin Account</AlertTitle>
                    <AlertDescription>
                        You are currently logged in as the administrator. User profile settings do not apply. Please use the Admin Panel to manage users and content.
                    </AlertDescription>
                </Alert>
            </div>
         )
    }

    const proValidUntilDate = normalizeDate(userData?.proValidUntil);
    const isPro = !!(userData?.isPro && proValidUntilDate && proValidUntilDate > new Date());

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and security.
          </p>
      </div>
      <Separator />
      
      {isPro && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gem className="h-5 w-5 text-primary" />
                    Pro Subscription
                </CardTitle>
                <CardDescription>
                    You have unlimited access to all features.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Your subscription is valid until: <span className="font-semibold">{proValidUntilDate ? format(proValidUntilDate, 'dd/MM/yyyy') : 'N/A'}</span></p>
            </CardContent>
        </Card>
      )}

      <ProfileForm user={user} userData={userData} />
      <ChangePasswordForm />
    </div>
  );
}
