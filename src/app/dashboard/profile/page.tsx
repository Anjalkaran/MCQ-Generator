import { getFirebaseAuth } from '@/lib/firebase';
import { getUserData } from '@/lib/firestore';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/dashboard/profile-form';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
    const auth = getFirebaseAuth();
    const currentUser = auth?.currentUser;

    if (!currentUser) {
        // This should be handled by the layout, but as a safeguard
        redirect('/auth/login');
    }

    const userData = await getUserData(currentUser.uid);

    if (!userData) {
        // Handle case where user data is not in Firestore
        return <div>Could not load user data. Please contact support.</div>;
    }

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and exam preferences.
          </p>
      </div>
      <ProfileForm user={userData} />
    </div>
  );
}
