import { getFirebaseAuth } from '@/lib/firebase';
import { getUserData } from '@/lib/firestore';
import { ProfileForm } from '@/components/dashboard/profile-form';
import { ChangePasswordForm } from '@/components/dashboard/change-password-form';
import { Separator } from '@/components/ui/separator';

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

    const userData = await getUserData(currentUser.uid);

    if (!userData) {
        return <div>Could not load user data. Please contact support.</div>;
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
