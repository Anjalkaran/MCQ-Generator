
"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { UserManagement } from '@/components/admin/user-management';
import { TopicManagement } from '@/components/admin/topic-management';
import { QuestionBankManagement } from '@/components/admin/question-bank-management';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const { user, userData, categories, topics, isLoading } = useDashboard();

  if (isLoading) {
    return (
       <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userData) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Authentication Required</CardTitle>
            </CardHeader>
            <CardContent>
                <p>You must be logged in as an administrator to access this page.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
       <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage users, topics, and question banks for the application.
          </p>
        </div>
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="topics">Topic Management</TabsTrigger>
          <TabsTrigger value="question-bank">Question Bank</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UserManagement initialUsers={[]} /> 
        </TabsContent>
        <TabsContent value="topics">
          <TopicManagement initialCategories={categories} initialTopics={topics} />
        </TabsContent>
        <TabsContent value="question-bank">
            <QuestionBankManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
