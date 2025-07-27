
"use client";

import { useState, useEffect, useMemo } from "react";
import { useDashboard } from "@/app/dashboard/layout";
import { UserManagement } from '@/components/admin/user-management';
import { TopicManagement } from '@/components/admin/topic-management';
import { QuestionBankManagement } from '@/components/admin/question-bank-management';
import { TopicMCQManagement } from '@/components/admin/topic-mcq-management';
import { LiveTestManagement } from '@/components/admin/live-test-management';
import { ReportsManagement } from '@/components/admin/reports-management';
import { ReasoningBankManagement } from '@/components/admin/reasoning-bank-management';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, Shield, BookCopy, FileText, BarChart3, Download, Trophy, FileQuestion, BrainCircuit } from "lucide-react";
import { getAllUsers, getQnAUsage, getLiveTests } from "@/lib/firestore";
import type { UserData, QnAUsage, LiveTest } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_EMAILS } from "@/lib/constants";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import React from "react";

function AnalyticsTab({ qnaUsage }: { qnaUsage: QnAUsage[] }) {
    const uniqueUsers = useMemo(() => {
        const userIds = new Set(qnaUsage.map(item => item.userId));
        return userIds.size;
    }, [qnaUsage]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Feature Analytics</CardTitle>
                <CardDescription>Usage statistics for key features.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            'Ask Your Doubt' Usage
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{uniqueUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            unique users have used this feature.
                        </p>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    );
}

const adminSections = [
    { value: 'users', label: 'User Management', icon: Shield },
    { value: 'topics', label: 'Topic Management', icon: BookCopy },
    { value: 'topic-mcq', label: 'MCQ Bank', icon: FileQuestion },
    { value: 'reasoning-bank', label: 'Reasoning Bank', icon: BrainCircuit },
    { value: 'question-bank', label: 'Question Bank', icon: FileText },
    { value: 'live-test', label: 'Live Test', icon: Trophy },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'reports', label: 'Reports', icon: Download },
] as const;

type AdminSection = typeof adminSections[number]['value'];

export default function AdminPage() {
  const { user, userData, categories, topics, bankedQuestions, topicMCQs, liveTestBank, isLoading: isDashboardLoading } = useDashboard();
  const [users, setUsers] = useState<UserData[]>([]);
  const [qnaUsage, setQnaUsage] = useState<QnAUsage[]>([]);
  const [allLiveTests, setAllLiveTests] = useState<LiveTest[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [isLoadingLiveTests, setIsLoadingLiveTests] = useState(true);
  const [activeSection, setActiveSection] = useState<AdminSection>('users');
  const { toast } = useToast();

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [fetchedUsers, fetchedQnAUsage, fetchedLiveTests] = await Promise.all([
            getAllUsers(),
            getQnAUsage(),
            getLiveTests(true) // Fetch all live tests
        ]);
        
        const regularUsers = fetchedUsers.filter(u => !ADMIN_EMAILS.includes(u.email));
        setUsers(regularUsers);
        setQnaUsage(fetchedQnAUsage);
        setAllLiveTests(fetchedLiveTests);

      } catch (error) {
        console.error("Failed to fetch admin data:", error);
        toast({
          title: "Error",
          description: "Could not fetch admin data.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingUsers(false);
        setIsLoadingAnalytics(false);
        setIsLoadingLiveTests(false);
      }
    };

    if (userData?.email && ADMIN_EMAILS.includes(userData.email)) {
        fetchAdminData();
    } else {
        setIsLoadingUsers(false);
        setIsLoadingAnalytics(false);
        setIsLoadingLiveTests(false);
    }
  }, [userData, toast]);

  if (isDashboardLoading || isLoadingUsers || isLoadingAnalytics || isLoadingLiveTests) {
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

  const renderContent = () => {
    if (!activeSection) {
        return null;
    }
    
    switch(activeSection) {
        case 'users':
            return <UserManagement initialUsers={users} />;
        case 'topics':
            return <TopicManagement initialCategories={categories} initialTopics={topics} />;
        case 'topic-mcq':
            return <TopicMCQManagement initialTopics={topics} initialTopicMCQs={topicMCQs} />;
        case 'reasoning-bank':
            return <ReasoningBankManagement />;
        case 'question-bank':
            return <QuestionBankManagement initialBankedQuestions={bankedQuestions} />;
        case 'live-test':
            return <LiveTestManagement initialLiveTestBank={liveTestBank} initialLiveTests={allLiveTests} />;
        case 'analytics':
            return <AnalyticsTab qnaUsage={qnaUsage} />;
        case 'reports':
            return <ReportsManagement allUsers={users} />;
        default:
            return null;
    }
  }

  return (
    <div className="space-y-6">
       <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage users, topics, question banks, and view analytics.
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
          {adminSections.map((section) => (
            <Card
              key={section.value}
              onClick={() => setActiveSection(section.value)}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center aspect-square",
                activeSection === section.value && "border-primary ring-2 ring-primary"
              )}
            >
              <CardHeader className="items-center text-center p-4">
                {React.createElement(section.icon, { className: "h-6 w-6 text-muted-foreground mb-2" })}
                <CardTitle className="text-sm font-medium">
                  {section.label}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-6">
            {renderContent()}
        </div>
    </div>
  );
}
