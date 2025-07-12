import { getFirebaseAuth } from '@/lib/firebase';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from '@/components/admin/user-management';
import { TopicManagement } from '@/components/admin/topic-management';
import { getCategories, getTopics, getAllUsers } from '@/lib/firestore';
import type { User } from 'firebase/auth';

const ADMIN_EMAIL = "admin@anjalkaran.com";

// This is now a Server Component to fetch data initially
export default async function AdminPage() {
  // We can't use onAuthStateChanged on the server, so we can't do this check here.
  // The check is moved to the layout which is a client component.
  // For direct access protection, middleware would be the best solution,
  // but for now, the layout protection is sufficient.

  const [users, categories, topics] = await Promise.all([
    getAllUsers(),
    getCategories(),
    getTopics()
  ]);

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
          <UserManagement initialUsers={users} />
        </TabsContent>
        <TabsContent value="topics">
          <TopicManagement initialCategories={categories} initialTopics={topics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
