
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
import { FeedbackManagement } from '@/components/admin/feedback-management';
import { VideoClassManagement } from '@/components/admin/video-class-management';
import { SyllabusManagement } from '@/components/admin/syllabus-management';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, Shield, BookCopy, FileText, BarChart3, Download, Trophy, FileQuestion, MessageSquare, Video, Layers } from "lucide-react";
import { NewLogoIcon } from '@/components/icons/new-logo-icon';
import { getAllUsers, getQnAUsage, getLiveTests, getReasoningQuestions, getAllFeedback, getStudyMaterials } from "@/lib/firestore";
import type { UserData, QnAUsage, LiveTest, ReasoningQuestion, Feedback, StudyMaterial } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_EMAILS } from "@/lib/constants";
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
    { value: 'users', label: 'User Management', icon: Shield, group: 'Management' },
    { value: 'topics', label: 'Topic Management', icon: BookCopy, group: 'Management' },
    { value: 'video-classes', label: 'Video Classes', icon: Video, group: 'Management' },
    { value: 'syllabus', label: 'Syllabus', icon: Layers, group: 'Management' },
    { value: 'topic-mcq', label: 'MCQ Bank', icon: FileQuestion, group: 'Assessments' },
    { value: 'question-bank', label: 'Question Bank', icon: FileText, group: 'Assessments' },
    { value: 'reasoning-bank', label: 'Reasoning Bank', icon: NewLogoIcon, group: 'Assessments' },
    { value: 'live-test', label: 'Live Test', icon: Trophy, group: 'Assessments' },
    { value: 'analytics', label: 'Analytics', icon: BarChart3, group: 'System' },
    { value: 'feedback', label: 'Feedback', icon: MessageSquare, group: 'System' },
    { value: 'reports', label: 'Reports', icon: Download, group: 'System' },
] as const;

const groups = ['Management', 'Assessments', 'System'] as const;

type AdminSection = typeof adminSections[number]['value'];

export default function AdminPage() {
  const { user, userData, categories, topics, videoClasses, isLoading: isDashboardLoading } = useDashboard();
  const [users, setUsers] = useState<UserData[]>([]);
  const [qnaUsage, setQnaUsage] = useState<QnAUsage[]>([]);
  const [allLiveTests, setAllLiveTests] = useState<LiveTest[]>([]);
  const [reasoningQuestions, setReasoningQuestions] = useState<ReasoningQuestion[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [isLoadingAdminData, setIsLoadingAdminData] = useState(true);
  const [activeSection, setActiveSection] = useState<AdminSection>('users');
  const { toast } = useToast();

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [fetchedUsers, fetchedQnAUsage, fetchedLiveTests, fetchedReasoningQuestions, fetchedFeedback] = await Promise.all([
            getAllUsers(),
            getQnAUsage(),
            getLiveTests(true),
            getReasoningQuestions(),
            getAllFeedback(),
        ]);
        
        const regularUsers = fetchedUsers.filter(u => !ADMIN_EMAILS.includes(u.email));
        setUsers(regularUsers);
        setQnaUsage(fetchedQnAUsage);
        setAllLiveTests(fetchedLiveTests);
        setReasoningQuestions(fetchedReasoningQuestions);
        setFeedback(fetchedFeedback);

      } catch (error) {
        console.error("Failed to fetch admin data:", error);
        toast({
          title: "Error",
          description: "Could not fetch admin data.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingAdminData(false);
      }
    };

    if (userData?.email && ADMIN_EMAILS.includes(userData.email)) {
        fetchAdminData();
    } else {
        setIsLoadingAdminData(false);
    }
  }, [userData, toast]);

  if (isDashboardLoading || isLoadingAdminData) {
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
    switch(activeSection) {
        case 'users':
            return <UserManagement initialUsers={users} />;
        case 'topics':
            return <TopicManagement initialCategories={categories} initialTopics={topics} initialTopicMCQs={[]} />;
        case 'video-classes':
            return <VideoClassManagement initialVideos={videoClasses} />;
        case 'topic-mcq':
            return <TopicMCQManagement initialTopics={topics} initialTopicMCQs={[]} />;
        case 'question-bank':
            return <QuestionBankManagement initialBankedQuestions={[]} />;
        case 'reasoning-bank':
            return <ReasoningBankManagement initialQuestions={reasoningQuestions} />;
        case 'live-test':
            return <LiveTestManagement initialLiveTestBank={[]} initialLiveTests={allLiveTests} />;
        case 'syllabus':
            return <SyllabusManagement />;
        case 'analytics':
            return <AnalyticsTab qnaUsage={qnaUsage} />;
        case 'feedback':
            return <FeedbackManagement initialFeedback={feedback} />;
        case 'reports':
            return <ReportsManagement allUsers={users} allTopics={topics} />;
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
        
        <div className="space-y-8">
          {groups.map(group => (
            <div key={group} className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 pl-1">{group}</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                {adminSections.filter(s => s.group === group).map((section) => (
                  <Card
                    key={section.value}
                    onClick={() => setActiveSection(section.value)}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center h-28 border-none ring-1 ring-slate-100",
                      activeSection === section.value && "bg-primary/5 ring-2 ring-primary"
                    )}
                  >
                    <CardHeader className="items-center text-center p-4">
                      {React.createElement(section.icon, { 
                        className: cn(
                          "h-6 w-6 mb-2 transition-colors",
                          activeSection === section.value ? "text-primary" : "text-slate-400"
                        ) 
                      })}
                      <CardTitle className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        activeSection === section.value ? "text-primary" : "text-slate-600"
                      )}>
                        {section.label}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
            {renderContent()}
        </div>
    </div>
  );
}
