
"use client";

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { LayoutDashboard, User as UserIcon, History, LogOut, Shield, Loader2, TrendingUp, Gem, Menu, BookCopy, FileText, Trophy, HelpCircle, LifeBuoy, Users, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { getFirebaseAuth } from '@/lib/firebase';
import { signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { getDashboardData } from '@/lib/firestore';
import type { UserData, Category, Topic, BankedQuestion, TopicMCQ, QnAUsage, Notification } from "@/lib/types";
import { ADMIN_EMAILS, FREE_EXAM_LIMIT } from '@/lib/constants';
import { normalizeDate } from '@/lib/utils';
import { CardDescription } from '@/components/ui/card';
import packageJson from '../../../package.json';
import { AdminNotifications } from '@/components/dashboard/admin-notifications';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface OnlineUser {
    uid: string;
    name: string;
    email: string;
}
interface DashboardContextType {
  user: User | null;
  userData: UserData | null;
  categories: Category[];
  topics: Topic[];
  bankedQuestions: BankedQuestion[];
  topicMCQs: TopicMCQ[];
  liveTestBank: BankedQuestion[];
  qnaUsage: QnAUsage[];
  notifications: Notification[];
  onlineUsers: OnlineUser[];
  isLoading: boolean;
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardLayout');
  }
  return context;
}

function MainContent({ children }: { children: React.ReactNode }) {
  const { state, isMobile } = useSidebar();
  const { userData, notifications } = useDashboard();
  const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
  
  return (
    <main className="flex-1 bg-muted/40 flex flex-col min-h-0">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <SidebarTrigger className="sm:hidden" />
        <div className="relative flex-1 flex items-center gap-2">
          <SidebarTrigger className="hidden sm:inline-flex" />
           {!isMobile && state === 'collapsed' && (
              <Link href="/" className="flex items-center gap-2">
                <Logo className="h-10 w-auto text-primary" />
              </Link>
            )}
        </div>
        {isAdmin && <AdminNotifications initialNotifications={notifications} />}
      </header>
      <div className="p-4 md:p-6 flex-1 overflow-auto min-h-0">
          {children}
      </div>
    </main>
  );
}

function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData, isLoading, onlineUsers } = useDashboard();
  const { setOpenMobile } = useSidebar();

  const handleLogout = useCallback(async (authInstance = getFirebaseAuth(), showToast = true) => {
    if (!authInstance) {
      if (showToast) toast({ title: "Authentication Error", description: "Could not connect to service.", variant: "destructive" });
      return;
    }
    try {
      await signOut(authInstance);
      if (showToast) toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/');
    } catch (error: any) {
      if (showToast) toast({ title: 'Logout Failed', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
    }
  }, [router, toast]);

  const onLinkClick = () => {
    setOpenMobile(false);
  }

  const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
  const proValidUntilDate = normalizeDate(userData?.proValidUntil);
  const isPro = !!(userData && (
      (userData.isPro && proValidUntilDate && proValidUntilDate > new Date()) ||
      isAdmin
  ));
  
  const showUpgradeButton = userData && !isPro && !isAdmin;

  const getWelcomeMessage = () => {
    if (isLoading || !userData) return null;
    
    if(isPro) {
        return `Welcome, ${userData.name}!`;
    }

    const totalExamsTaken = (userData.topicExamsTaken || 0) + (userData.mockTestsTaken || 0);
    const examsRemaining = FREE_EXAM_LIMIT - totalExamsTaken;
    return `Welcome, ${userData.name}! You have ${examsRemaining > 0 ? examsRemaining : 0} free exam(s) remaining.`;
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:hidden">
          <Link href="/" onClick={onLinkClick}>
            <Logo className="h-12 w-auto text-primary" />
          </Link>
        </div>
          <div className="hidden items-center gap-2 p-2 group-data-[collapsible=icon]:flex">
          </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <div className="p-2 group-data-[collapsible=icon]:hidden">
            <CardDescription className="text-center text-sm">
              {getWelcomeMessage()}
            </CardDescription>
          </div>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip="Dashboard">
              <Link href="/dashboard" onClick={onLinkClick}>
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {isAdmin && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/admin')} tooltip="Admin">
                  <Link href="/dashboard/admin" onClick={onLinkClick}>
                    <Shield />
                    <span>Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/topic-wise-mcq')} tooltip="Practice MCQ">
                <Link href="/dashboard/topic-wise-mcq" onClick={onLinkClick}>
                  <BookCopy />
                  <span>Practice MCQ</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
              <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/mock-test')} tooltip="Mock Test">
                <Link href="/dashboard/mock-test" onClick={onLinkClick}>
                  <FileText />
                  <span>Mock Test</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/q-and-a')} tooltip="Ask Your Doubt">
                <Link href="/dashboard/q-and-a" onClick={onLinkClick}>
                  <HelpCircle />
                  <span>Ask Your Doubt</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/dashboard/profile'} tooltip="Profile">
              <Link href="/dashboard/profile" onClick={onLinkClick}>
                <UserIcon />
                <span>Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/dashboard/history'} tooltip="Exam History">
              <Link href="/dashboard/history" onClick={onLinkClick}>
                <History />
                <span>Exam History</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/performance')} tooltip="Performance">
              <Link href="/dashboard/performance" onClick={onLinkClick}>
                <TrendingUp />
                <span>Performance</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/leaderboard')} tooltip="Leaderboard">
              <Link href="/dashboard/leaderboard" onClick={onLinkClick}>
                <Trophy />
                <span>Leaderboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
            {showUpgradeButton && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/dashboard/upgrade'} variant="outline" className="text-primary hover:bg-primary/10 hover:text-primary border-primary/50" tooltip="Upgrade to Pro">
                <Link href="/dashboard/upgrade" onClick={onLinkClick}>
                  <Gem />
                  <span>Upgrade to Pro</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {isAdmin && (
            <div className="p-2 border-t group-data-[collapsible=icon]:hidden">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between text-sm">
                             <div className="flex items-center gap-2 text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>Online Users</span>
                            </div>
                            <span className="font-semibold text-primary">{onlineUsers.length}</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Online Users ({onlineUsers.length})</DialogTitle>
                            <DialogDescription>
                                This list shows users who have been active in the last two minutes.
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-72">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {onlineUsers.length > 0 ? (
                                        onlineUsers.map(u => (
                                            <TableRow key={u.uid}>
                                                <TableCell>{u.name}</TableCell>
                                                <TableCell>{u.email}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center">No users are currently online.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </div>
        )}
        <div className="p-2">
          <Button onClick={() => handleLogout()} variant="ghost" className="w-full justify-start">
            <LogOut className="mr-2 h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </Button>
        </div>
        <div className='p-4 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden'>
          <p>&copy; {new Date().getFullYear()} Anjalkaran | v{packageJson.version}</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [bankedQuestions, setBankedQuestions] = useState<BankedQuestion[]>([]);
  const [topicMCQs, setTopicMCQs] = useState<TopicMCQ[]>([]);
  const [liveTestBank, setLiveTestBank] = useState<BankedQuestion[]>([]);
  const [qnaUsage, setQnaUsage] = useState<QnAUsage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = useCallback(async (authInstance = getFirebaseAuth(), showToast = true) => {
    if (!authInstance) {
      if (showToast) toast({ title: "Authentication Error", description: "Could not connect to service.", variant: "destructive" });
      return;
    }
    try {
      await signOut(authInstance);
      if (showToast) toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/');
    } catch (error: any) {
      if (showToast) toast({ title: 'Logout Failed', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
    }
  }, [router, toast]);

  // Heartbeat effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (user) {
      const sendHeartbeat = async () => {
        try {
          await fetch('/api/user/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid }),
          });
        } catch (error) {
          console.error("Failed to send heartbeat:", error);
        }
      };
      // Send initial heartbeat immediately
      sendHeartbeat();
      // Then send every 60 seconds
      intervalId = setInterval(sendHeartbeat, 60000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user]);
  
  // Online user count refresh effect for admins
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    if (userData?.email && ADMIN_EMAILS.includes(userData.email)) {
        const fetchOnlineUsers = async () => {
            try {
                const response = await fetch('/api/admin/online-users');
                if (response.ok) {
                    const data = await response.json();
                    setOnlineUsers(data.onlineUsers);
                }
            } catch (error) {
                console.error("Failed to fetch online users:", error);
            }
        };
        // Fetch immediately and then set interval
        fetchOnlineUsers();
        intervalId = setInterval(fetchOnlineUsers, 30000); // Refresh every 30 seconds
    }
    return () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
  }, [userData]);


  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      router.push('/auth/login');
      setIsLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoading(true);
      if (currentUser) {
        setUser(currentUser);
        
        const userIsAdmin = currentUser.email ? ADMIN_EMAILS.includes(currentUser.email) : false;

        try {
            if (userIsAdmin) {
                const adminUserData: UserData = {
                    uid: currentUser.uid,
                    name: currentUser.displayName || 'Admin',
                    email: currentUser.email!,
                    examCategory: 'PA', 
                    topicExamsTaken: 0,
                    mockTestsTaken: 0,
                    isPro: true,
                };
                const { categories, topics, bankedQuestions, topicMCQs, liveTestBank, qnaUsage, notifications } = await getDashboardData(currentUser.uid, true);
                setUserData(adminUserData);
                setCategories(categories);
                setTopics(topics);
                setBankedQuestions(bankedQuestions);
                setTopicMCQs(topicMCQs);
                setLiveTestBank(liveTestBank);
                setQnaUsage(qnaUsage);
                setNotifications(notifications);
                
            } else {
                const { userData: fetchedUserData, categories, topics, bankedQuestions } = await getDashboardData(currentUser.uid);
                if (!fetchedUserData) {
                     toast({ title: "Authentication Error", description: "Could not load user profile. Please log in again.", variant: "destructive" });
                     handleLogout(auth, false);
                     return;
                }

                setUserData(fetchedUserData);
                setCategories(categories);
                setTopics(topics);
                setBankedQuestions(bankedQuestions);
                setTopicMCQs([]);
                setLiveTestBank([]);
                setQnaUsage([]); // Non-admins don't need this data
                setNotifications([]);
                setOnlineUsers([]);
            }

            if (pathname.startsWith('/dashboard/admin') && !userIsAdmin) {
              toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
              router.push('/dashboard');
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
            handleLogout(auth, false);
        }
      } else {
        setUser(null);
        setUserData(null);
        setCategories([]);
        setTopics([]);
        setBankedQuestions([]);
        setTopicMCQs([]);
        setLiveTestBank([]);
        setQnaUsage([]);
        setNotifications([]);
        setOnlineUsers([]);
        if (!pathname.startsWith('/auth')) {
            router.push('/auth/login');
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
    
  }, [router, toast, handleLogout, pathname]);
  
  const contextValue = { user, userData, categories, topics, bankedQuestions, topicMCQs, liveTestBank, qnaUsage, notifications, onlineUsers, isLoading, setUserData };

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <SidebarProvider>
          <div className="relative z-20">
              <AppSidebar />
          </div>
           <MainContent>
              {isLoading ? (
                   <div className="flex h-full w-full items-center justify-center">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                   </div>
              ) : children}
          </MainContent>
        </SidebarProvider>
      </div>
    </DashboardContext.Provider>
  );
}
