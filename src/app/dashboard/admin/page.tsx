
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';

const ADMIN_EMAIL = "admin@anjalkaran.com";

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user && user.email === ADMIN_EMAIL) {
          setIsAuthorized(true);
        } else {
          router.push('/dashboard');
        }
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      router.push('/auth/login');
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
            <Card>
                <CardHeader>
                <CardTitle><Skeleton className="h-8 w-1/4" /></CardTitle>
                </CardHeader>
                <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
                </CardContent>
            </Card>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // or a more explicit "access denied" message, but redirect should handle it
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      <Card>
        <CardHeader>
          <CardTitle>Welcome, Admin!</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is the admin-only area.</p>
          <p>You can add admin-specific components and functionality here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
