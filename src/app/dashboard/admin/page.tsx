
"use client";

import { useState, useEffect, useMemo } from "react";
import { useDashboard } from "@/app/dashboard/layout";
import { UserManagement } from '@/components/admin/user-management';
import { TopicManagement } from '@/components/admin/topic-management';
import { StudyMaterialManagement } from '@/components/admin/study-material-management';
import { QuestionBankManagement } from '@/components/admin/question-bank-management';
import { TopicMCQManagement } from '@/components/admin/topic-mcq-management';
import { LiveTestManagement } from '@/components/admin/live-test-management';
import { ReportsManagement } from '@/components/admin/reports-management';
import { ReasoningBankManagement } from '@/components/admin/reasoning-bank-management';
import { FeedbackManagement } from '@/components/admin/feedback-management';
import { VideoClassManagement } from '@/components/admin/video-class-management';
import { DownloadHistoryManagement } from '@/components/admin/download-history-management';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, Shield, BookCopy, FileText, BarChart3, Download, Trophy, FileQuestion, MessageSquare, Video, Library, History } from "lucide-react";
import { NewLogoIcon } from '@/components/icons/new-logo-icon';
import { AptiSolveIcon } from "@/components/icons/aptisolve-icon";
import { getAllUsers, getQnAUsage, getLiveTests, getReasoningQuestions, getAllFeedback, getStudyMaterials, getAptiSolveLaunches, getCategories, getTopics, getTopicMCQs, getQuestionBankDocuments, getVideoClasses } from "@/lib/firestore";
import type { UserData, QnAUsage, LiveTest, ReasoningQuestion, Feedback, StudyMaterial, AptiSolveLaunch, Category, Topic, TopicMCQ, BankedQuestion, VideoClass } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_EMAILS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

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

function AptiSolveReport() {
    const [launches, setLaunches] = useState<AptiSolveLaunch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await getAptiSolveLaunches();
                setLaunches(data);
            } catch (error) {
                toast({ title: "Error", description: "Could not load AptiSolve report.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);
    
    const filteredLaunches = useMemo(() => {
        return launches.filter(l => 
            l.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            l.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [launches, searchTerm]);

    const userLaunchCounts = useMemo(() => {
        const counts: Record<string, { name: string; email: string; count: number }> = {};
        filteredLaunches.forEach(launch => {
            if (!counts[launch.userId]) {
                counts[launch.userId] = { name: launch.userName, email: launch.userEmail, count: 0 };
            }
            counts[launch.userId].count++;
        });
        return Object.values(counts).sort((a,b) => b.count - a.count);
    }, [filteredLaunches]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>AptiSolve Launch Report</CardTitle>
                <CardDescription>
                    Number of times each user has launched the AptiSolve application.
                </CardDescription>
                 <div className="pt-4">
                    <Input 
                        placeholder="Search by user name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-right">Launch Count</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {userLaunchCounts.length > 0 ? (
                                    userLaunchCounts.map((user) => (
                                        <TableRow key={user.email}>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell className="text-right font-semibold">{user.count}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            No AptiSolve launches recorded yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

const adminSections = [
    { value: 'users', label: 'User Management', icon: Shield },
    { value: 'topics', label: 'Topic Management', icon: BookCopy },
    { value: 'study-material', label: 'Study Material', icon: Library },
    { value: 'video-classes', label: 'Video Classes', icon: Video },
    { value: 'topic-mcq', label: 'MCQ Bank', icon: FileQuestion },
    { value: 'question-bank', label: 'Question Bank', icon: FileText },
    { value: 'reasoning-bank', label: 'Reasoning Bank', icon: NewLogoIcon },
    { value: 'live-test', label: 'Live Test', icon: Trophy },
    { value: 'downloads', label: 'Download History', icon: History },
    { value: 'aptisolve', label: 'AptiSolve Report', icon: AptiSolveIcon },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'feedback', label: 'Feedback', icon: MessageSquare },
    { value: 'reports', label: 'Reports', icon: Download },
] as const;

type AdminSection = typeof adminSections[number]['value'];

export default function AdminPage() {
  const { userData, isLoading: isDashboardLoading } = useDashboard();
  const [activeSection, setActiveSection] = useState<AdminSection>('users');
  const [isLoadingAdminData, setIsLoadingAdminData] = useState(true);
  const { toast } = useToast();

  // State for Admin Data
  const [users, setUsers] = useState<UserData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [videoClasses, setVideoClasses] = useState<VideoClass[]>([]);
  const [topicMCQs, setTopicMCQs] = useState<TopicMCQ[]>([]);
  const [bankedQuestions, setBankedQuestions] = useState<BankedQuestion[]>([]);
  const [reasoningQuestions, setReasoningQuestions] = useState<ReasoningQuestion[]>([]);
  const [liveTests, setLiveTests] = useState<LiveTest[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [qnaUsage, setQnaUsage] = useState<QnAUsage[]>([]);

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!userData || !ADMIN_EMAILS.includes(userData.email)) return;
      
      setIsLoadingAdminData(true);
      try {
        const [
            fetchedUsers, fetchedCategories, fetchedTopics, fetchedMaterials, 
            fetchedVideos, fetchedMCQs, fetchedBank, fetchedReasoning, 
            fetchedTests, fetchedFeedback, fetchedQnA
        ] = await Promise.all([
            getAllUsers(), getCategories(), getTopics(), getStudyMaterials(),
            getVideoClasses(), getTopicMCQs(), getQuestionBankDocuments(), getReasoningQuestions(),
            getLiveTests(true), getAllFeedback(), getQnAUsage()
        ]);
        
        setUsers(fetchedUsers.filter(u => !ADMIN_EMAILS.includes(u.email)));
        setCategories(fetchedCategories);
        setTopics(fetchedTopics);
        setStudyMaterials(fetchedMaterials);
        setVideoClasses(fetchedVideos);
        setTopicMCQs(fetchedMCQs);
        setBankedQuestions(fetchedBank);
        setReasoningQuestions(fetchedReasoning);
        setLiveTests(fetchedTests);
        setFeedback(fetchedFeedback);
        setQnaUsage(fetchedQnA);

      } catch (error) {
        console.error("Failed to fetch admin data:", error);
        toast({ title: "Error", description: "Could not fetch admin data.", variant: "destructive" });
      } finally {
        setIsLoadingAdminData(false);
      }
    };

    fetchAdminData();
  }, [userData, toast]);

  if (isDashboardLoading || isLoadingAdminData) {
    return (
       <div className="flex h-[50vh] w-full items-center justify-center flex-col gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading Admin Console...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch(activeSection) {
        case 'users': return <UserManagement initialUsers={users} />;
        case 'topics': return <TopicManagement initialCategories={categories} initialTopics={topics} />;
        case 'study-material': return <StudyMaterialManagement initialTopics={topics} initialMaterials={studyMaterials} />;
        case 'video-classes': return <VideoClassManagement initialVideos={videoClasses} />;
        case 'topic-mcq': return <TopicMCQManagement initialTopics={topics} initialTopicMCQs={topicMCQs} />;
        case 'question-bank': return <QuestionBankManagement initialBankedQuestions={bankedQuestions} />;
        case 'reasoning-bank': return <ReasoningBankManagement initialQuestions={reasoningQuestions} />;
        case 'live-test': return <LiveTestManagement initialLiveTestBank={bankedQuestions} initialLiveTests={liveTests} />;
        case 'downloads': return <DownloadHistoryManagement />;
        case 'aptisolve': return <AptiSolveReport />;
        case 'analytics': return <AnalyticsTab qnaUsage={qnaUsage} />;
        case 'feedback': return <FeedbackManagement initialFeedback={feedback} />;
        case 'reports': return <ReportsManagement allUsers={users} />;
        default: return null;
    }
  }

  return (
    <div className="space-y-6">
       <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, topics, question banks, and view analytics.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-12">
          {adminSections.map((section) => (
            <Card
              key={section.value}
              onClick={() => setActiveSection(section.value)}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center h-28",
                activeSection === section.value && "border-primary ring-2 ring-primary"
              )}
            >
              <CardHeader className="items-center text-center p-4">
                {React.createElement(section.icon, { className: "h-6 w-6 text-muted-foreground mb-2" })}
                <CardTitle className="text-sm font-medium">{section.label}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-6">{renderContent()}</div>
    </div>
  );
}
