
import { getCategories, getTopics, getAllUsers } from '@/lib/firestore';
import { UserManagement } from '@/components/admin/user-management';
import { TopicManagement } from '@/components/admin/topic-management';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
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
