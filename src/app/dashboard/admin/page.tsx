
"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { UserManagement } from '@/components/admin/user-management';
import { TopicManagement } from '@/components/admin/topic-management';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const { user, userData, categories, topics, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage users, topics, and categories for the application.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading Admin Data...</CardTitle>
            <CardDescription>Please wait while we verify your access.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback in case context is not ready, though isLoading should prevent this.
  if (!user || !userData) {
    return (
        <div className="space-y-6">
            <div className="space-y-0.5">
                <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            </div>
            <Card>
                 <CardHeader>
                    <CardTitle>Authentication Required</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>You must be logged in as an administrator to access this page.</p>
                </CardContent>
            </Card>
        </div>
    );
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
          {/* We can use the initially loaded `users` from the context here if we want, or let UserManagement fetch its own. For simplicity let's pass it. */}
          {/* This assumes the `useDashboard` context gets all users for the admin */}
          <UserManagement initialUsers={[]} /> 
          {/* Note: The user management component will refetch its own data for freshness, so passing an empty array is safe. */}
        </TabsContent>
        <TabsContent value="topics">
          <TopicManagement initialCategories={categories} initialTopics={topics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
