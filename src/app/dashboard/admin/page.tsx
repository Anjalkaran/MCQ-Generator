
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from '@/components/admin/user-management';
import { TopicManagement } from '@/components/admin/topic-management';

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
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
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
    return null; 
  }

  return (
    <div className="space-y-6">
       <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage users, topics, and categories for the application.
          </p>
        </div>
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="topics">Topic Management</TabsTrigger>
          <TabsTrigger value="categories" disabled>More Soon</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
        <TabsContent value="topics">
          <TopicManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
