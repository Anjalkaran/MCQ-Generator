
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useDashboard } from "@/app/dashboard/layout";
import { UserManagement } from '@/components/admin/user-management';
import { TopicManagement } from '@/components/admin/topic-management';
import { StudyMaterialManagement } from '@/components/admin/study-material-management';
import { QuestionBankManagement } from '@/components/admin/question-bank-management';
import { TopicMCQManagement } from '@/components/admin/topic-mcq-management';
import { LiveTestManagement } from '@/components/admin/live-test-management';
import { WeeklyTestManagement } from '@/components/admin/weekly-test-management';
import { DailyTestManagement } from '@/components/admin/daily-test-management';
import { ReportsManagement } from '@/components/admin/reports-management';
import { ReasoningBankManagement } from '@/components/admin/reasoning-bank-management';
import { FeedbackManagement } from '@/components/admin/feedback-management';
import { VideoClassManagement } from '@/components/admin/video-class-management';
import { DownloadHistoryManagement } from '@/components/admin/download-history-management';
import { SyllabusManagement } from '@/components/admin/syllabus-management';
import { SyllabusPointManagement } from '@/components/admin/syllabus-point-management';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, Shield, BookCopy, FileText, BarChart3, Download, Calendar, FileQuestion, MessageSquare, Video, Library, History, CalendarCheck, Clock, Trophy, ExternalLink, GraduationCap, Layers } from "lucide-react";
import { NewLogoIcon } from '@/components/icons/new-logo-icon';
import { getAllUsers, getQnAUsage, getLiveTests, getReasoningQuestions, getAllFeedback, getStudyMaterials, getCategories, getTopics, getTopicMCQs, getQuestionBankDocuments, getVideoClasses, getWeeklyTests, getDailyTests, getSyllabi, getSyllabusMCQs, getSyllabusMaterials } from "@/lib/firestore";
import type { UserData, QnAUsage, LiveTest, WeeklyTest, DailyTest, ReasoningQuestion, Feedback, StudyMaterial, Category, Topic, TopicMCQ, BankedQuestion, VideoClass, SyllabusBlueprint } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_EMAILS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
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
    { value: 'overview', label: 'Overview', icon: BarChart3 },
    { value: 'users', label: 'User Management', icon: Shield },
    { value: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { value: 'weekly-tests', label: 'Weekly Test', icon: CalendarCheck },
    { value: 'daily-tests', label: 'Daily Test', icon: Clock },
    { value: 'topics', label: 'Topic Management', icon: BookCopy },
    { value: 'study-material', label: 'Study Material', icon: Library },
    { value: 'video-classes', label: 'Video Classes', icon: Video },
    { value: 'syllabi', label: 'Syllabus Explorer', icon: GraduationCap },
    { value: 'topic-mcq', label: 'MCQ Bank', icon: FileQuestion },
    { value: 'question-bank', label: 'Question Bank', icon: FileText },
    { value: 'reasoning-bank', label: 'Reasoning Bank', icon: NewLogoIcon },
    { value: 'scheduled-tests', label: 'Scheduled Tests', icon: Calendar },
    { value: 'downloads', label: 'Download History', icon: History },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'feedback', label: 'Feedback', icon: MessageSquare },
    { value: 'reports', label: 'Reports', icon: Download },
    { value: 'syllabus-points', label: 'Syllabus Points', icon: Layers },
];

// Grouping logic for the sidebar/tabs in Overview
import { AdminOverview } from "@/components/admin/admin-overview";

type AdminSection = typeof adminSections[number]['value'];

function AdminContent({ userData, isLoadingAdminData, activeSection, setActiveSection, fetchAdminData, users, categories, topics, studyMaterials, videoClasses, topicMCQs, bankedQuestions, reasoningQuestions, scheduledTests, weeklyTests, dailyTests, feedback, qnaUsage, syllabi, syllabusMCQs, syllabusMaterials }: any) {
  const searchParams = useSearchParams();
  const initialSection = searchParams.get('section') as AdminSection | null;

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection, setActiveSection]);

  const renderContent = () => {
    switch(activeSection) {
        case 'overview': return (
            <AdminOverview 
                users={users}
                qnaUsage={qnaUsage}
                topics={topics}
                videos={videoClasses}
                materials={studyMaterials}
                bankedQuestions={bankedQuestions}
                onNavigate={(v) => setActiveSection(v as AdminSection)}
            />
        );
        case 'users': return <UserManagement initialUsers={users} />;
        case 'leaderboard': return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Competition Leaderboard</h2>
                    <a href="/dashboard/leaderboard" target="_blank" className="text-primary hover:underline flex items-center gap-1 text-sm font-medium">
                        View in Full Page <ExternalLink className="h-4 w-4" />
                    </a>
                </div>
                <div className="border rounded-xl h-[800px] w-full overflow-hidden bg-muted/20 relative shadow-inner">
                    <iframe src="/dashboard/leaderboard" className="absolute inset-0 w-full h-full border-none scale-90 sm:scale-100 origin-top" title="Leaderboard Preview" />
                </div>
            </div>
        );
        case 'weekly-tests': return <WeeklyTestManagement initialWeeklyTests={weeklyTests} initialBankedQuestions={bankedQuestions} />;
        case 'daily-tests': return <DailyTestManagement initialDailyTests={dailyTests} initialBankedQuestions={bankedQuestions} />;
        case 'topics': return <TopicManagement initialCategories={categories} initialTopics={topics} initialTopicMCQs={topicMCQs} />;
        case 'study-material': return <StudyMaterialManagement initialTopics={topics} initialMaterials={studyMaterials} initialCategories={categories} />;
        case 'video-classes': return <VideoClassManagement initialVideos={videoClasses} />;
        case 'topic-mcq': return <TopicMCQManagement initialTopics={topics} initialTopicMCQs={topicMCQs} onUpdate={fetchAdminData} />;
        case 'syllabi': return <SyllabusManagement />;
        case 'question-bank': return <QuestionBankManagement initialBankedQuestions={bankedQuestions} />;
        case 'reasoning-bank': return <ReasoningBankManagement initialQuestions={reasoningQuestions} />;
        case 'scheduled-tests': return <LiveTestManagement initialLiveTestBank={bankedQuestions} initialLiveTests={scheduledTests} />;
        case 'downloads': return <DownloadHistoryManagement />;
        case 'analytics': return <AnalyticsTab qnaUsage={qnaUsage} />;
        case 'feedback': return <FeedbackManagement initialFeedback={feedback} />;
        case 'reports': return <ReportsManagement allUsers={users} allTopics={topics} />;
        case 'syllabus-points': return <SyllabusPointManagement initialMCQs={syllabusMCQs} initialMaterials={syllabusMaterials} />;
        default: return null;
    }
  }

  const currentSection = adminSections.find(s => s.value === activeSection);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
       <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
               {activeSection !== 'overview' && (
                 <button 
                  onClick={() => setActiveSection('overview')}
                  className="p-1 px-2 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-500 transition-colors uppercase"
                 >
                   &larr; Back to hub
                 </button>
               )}
               <div className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
               <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Admin Console</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {currentSection?.label || 'Admin Panel'}
            </h1>
            <p className="text-sm text-slate-500">
              {activeSection === 'overview' 
                ? 'High-level insights and system management modules.' 
                : `Managing ${currentSection?.label} data and configurations.`}
            </p>
          </div>
          
          {activeSection === 'overview' && (
            <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-right">
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">System Health</p>
                   <p className="text-sm font-bold text-emerald-600">Operational</p>
                </div>
                <div className="h-8 w-[1px] bg-slate-100" />
                <div className="flex -space-x-2">
                   {users.filter((u: any) => u.isPro).slice(0, 3).map((u: any, i: number) => (
                     <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                        {u.name[0]}
                     </div>
                   ))}
                </div>
            </div>
          )}
        </div>
        
        <div className="min-h-[600px]">
          {renderContent()}
        </div>
    </div>
  );
}

export default function AdminPage() {
  const { userData, isLoading: isDashboardLoading } = useDashboard();
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [isLoadingAdminData, setIsLoadingAdminData] = useState(true);
  const { toast } = useToast();

  const [users, setUsers] = useState<UserData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [videoClasses, setVideoClasses] = useState<VideoClass[]>([]);
  const [topicMCQs, setTopicMCQs] = useState<TopicMCQ[]>([]);
  const [bankedQuestions, setBankedQuestions] = useState<BankedQuestion[]>([]);
  const [reasoningQuestions, setReasoningQuestions] = useState<ReasoningQuestion[]>([]);
  const [scheduledTests, setScheduledTests] = useState<LiveTest[]>([]);
  const [weeklyTests, setWeeklyTests] = useState<WeeklyTest[]>([]);
  const [dailyTests, setDailyTests] = useState<DailyTest[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [qnaUsage, setQnaUsage] = useState<QnAUsage[]>([]);
  const [syllabi, setSyllabi] = useState<SyllabusBlueprint[]>([]);
  const [syllabusMCQs, setSyllabusMCQs] = useState<TopicMCQ[]>([]);
  const [syllabusMaterials, setSyllabusMaterials] = useState<StudyMaterial[]>([]);

  const fetchedSections = React.useRef(new Set<AdminSection>());

  const fetchSectionData = useCallback(async (section: AdminSection) => {
    if (!userData || !ADMIN_EMAILS.includes(userData.email)) return;
    if (fetchedSections.current.has(section)) return; // Prevents double fetching
    
    setIsLoadingAdminData(true);
    try {
      switch(section) {
        case 'users':
          const fetchedUsers = await getAllUsers();
          setUsers(fetchedUsers.filter(u => !ADMIN_EMAILS.includes(u.email)));
          break;
        case 'topics':
          const [fetchedCategories, fetchedTopics] = await Promise.all([getCategories(), getTopics()]);
          setCategories(fetchedCategories);
          setTopics(fetchedTopics);
          break;
        case 'study-material':
          const mats = await getStudyMaterials();
          setStudyMaterials(mats);
          break;
        case 'video-classes':
          const vids = await getVideoClasses();
          setVideoClasses(vids);
          break;
        case 'topic-mcq':
          const tMcqs = await getTopicMCQs();
          setTopicMCQs(tMcqs);
          break;
        case 'question-bank':
          const bank = await getQuestionBankDocuments();
          setBankedQuestions(bank);
          break;
        case 'reasoning-bank':
          const rBank = await getReasoningQuestions();
          setReasoningQuestions(rBank);
          break;
        case 'scheduled-tests':
          const tests = await getLiveTests(true);
          setScheduledTests(tests);
          break;
        case 'weekly-tests':
          const wTests = await getWeeklyTests();
          setWeeklyTests(wTests);
          break;
        case 'daily-tests':
          const dTests = await getDailyTests();
          setDailyTests(dTests);
          break;
        case 'feedback':
          const feed = await getAllFeedback();
          setFeedback(feed);
          break;
        case 'analytics':
          const usage = await getQnAUsage();
          setQnaUsage(usage);
          break;
        case 'syllabi':
          const sys = await getSyllabi();
          setSyllabi(sys);
          break;
        case 'syllabus-points':
          const [sm, sq] = await Promise.all([getSyllabusMaterials(), getSyllabusMCQs()]);
          setSyllabusMaterials(sm);
          setSyllabusMCQs(sq);
          break;
      }
      fetchedSections.current.add(section);
    } catch (error) {
      console.error(`Failed to fetch data for ${section}:`, error);
      toast({ title: "Error", description: `Could not fetch ${section} data.`, variant: "destructive" });
    } finally {
      setIsLoadingAdminData(false);
    }
  }, [userData, toast]);

  useEffect(() => {
    // Initial fetch for overview/defaults
    const initAdmin = async () => {
      if (!userData || !ADMIN_EMAILS.includes(userData.email)) return;
      setIsLoadingAdminData(true);
      try {
        // Fetch core metrics for Overview cards
        const [fetchedUsers, fetchedTopics, fetchedBank] = await Promise.all([
          getAllUsers(),
          getTopics(),
          getQuestionBankDocuments()
        ]);
        
        setUsers(fetchedUsers.filter(u => !ADMIN_EMAILS.includes(u.email)));
        setTopics(fetchedTopics);
        setBankedQuestions(fetchedBank);
        
        // Mark as fetched so tabs don't re-fetch
        fetchedSections.current.add('users');
        fetchedSections.current.add('topics');
        fetchedSections.current.add('question-bank');
      } catch (e) {
        console.error("Overview stats fetch failed:", e);
      } finally {
        setIsLoadingAdminData(false);
      }
    };
    initAdmin();
  }, [userData]);

  useEffect(() => {
    if (activeSection !== 'overview') {
       fetchSectionData(activeSection);
    }
  }, [activeSection, fetchSectionData]);

  useEffect(() => {
    const handleSwitchSection = (e: CustomEvent<{ section: AdminSection; topicId?: string }>) => {
      setActiveSection(e.detail.section);
      if (e.detail.topicId) {
        sessionStorage.setItem('highlight_topic_id', e.detail.topicId);
      }
    };
    window.addEventListener('switch-admin-section' as any, handleSwitchSection);
    return () => window.removeEventListener('switch-admin-section' as any, handleSwitchSection);
  }, []);

  if (isDashboardLoading || isLoadingAdminData) {
    return (
       <div className="flex h-[50vh] w-full items-center justify-center flex-col gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading Admin Console...</p>
      </div>
    );
  }

  return (
    <React.Suspense fallback={<div className="flex h-[50vh] w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <AdminContent 
        userData={userData}
        isLoadingAdminData={isLoadingAdminData}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        fetchAdminData={() => fetchSectionData(activeSection)}
        users={users}
        categories={categories}
        topics={topics}
        studyMaterials={studyMaterials}
        videoClasses={videoClasses}
        topicMCQs={topicMCQs}
        bankedQuestions={bankedQuestions}
        reasoningQuestions={reasoningQuestions}
        scheduledTests={scheduledTests}
        weeklyTests={weeklyTests}
        dailyTests={dailyTests}
        feedback={feedback}
        qnaUsage={qnaUsage}
        syllabi={syllabi}
        syllabusMCQs={syllabusMCQs}
        syllabusMaterials={syllabusMaterials}
      />
    </React.Suspense>
  );
}
