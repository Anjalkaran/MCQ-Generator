import { getFirebaseAuth } from '@/lib/firebase';
import { getUserData } from '@/lib/firestore';
import { ProfileForm } from '@/components/dashboard/profile-form';
import { ChangePasswordForm } from '@/components/dashboard/change-password-form';
import { Separator } from '@/components/ui/separator';
import { notFound } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User } from 'lucide-react';
import { ADMIN_EMAIL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
    const auth = getFirebaseAuth();
    const currentUser = auth?.currentUser;

    if (!currentUser) {
        return (
          <div className="space-y-6">
            <div className="space-y-0.5">
                <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
                <p className="text-muted-foreground">
                  Manage your account settings and exam preferences.
                </p>
            </div>
            <div>Loading user data...</div>
          </div>
        );
    }

    if (currentUser.email === ADMIN_EMAIL) {
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

    const userData = await getUserData(currentUser.uid);

    if (!userData) {
        notFound();
    }

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and security.
          </p>
      </div>
      <Separator />
      <ProfileForm user={userData} />
      <ChangePasswordForm />
    </div>
  );
}
