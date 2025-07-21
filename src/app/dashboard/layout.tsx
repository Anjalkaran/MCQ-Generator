
"use client";

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { LayoutDashboard, User as UserIcon, History, LogOut, Shield, Loader2, TrendingUp, Gem, Menu } from 'lucide-react';
import Link from 'next/link';
import { getFirebaseAuth } from '@/lib/firebase';
import { signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { getDashboardData } from '@/lib/firestore';
import type { UserData, Category, Topic, BankedQuestion } from "@/lib/types";
import { ADMIN_EMAIL, FREE_TOPIC_EXAM_LIMIT } from '@/lib/constants';
import { normalizeDate } from '@/lib/utils';
import { CardDescription } from '@/components/ui/card';

interface DashboardContextType {
  user: User | null;
  userData: UserData | null;
  categories: Category[];
  topics: Topic[];
  bankedQuestions: BankedQuestion[];
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
  
  return (
    <main className="flex-1 bg-muted/40 flex flex-col">
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
      </header>
      <div className="p-4 md:p-6 flex-1">
          {children}
      </div>
    </main>
  );
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
        
        const userIsAdmin = currentUser.email === ADMIN_EMAIL;

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
                const { categories, topics, bankedQuestions } = await getDashboardData(currentUser.uid, true);
                setUserData(adminUserData);
                setCategories(categories);
                setTopics(topics);
                setBankedQuestions(bankedQuestions);

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
        if (!pathname.startsWith('/auth')) {
            router.push('/auth/login');
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
    
  }, [router, toast, handleLogout, pathname]);

  // Direct computation of pro status from userData.
  const proValidUntilDate = normalizeDate(userData?.proValidUntil);
  const isPro = !!(userData && (
      (userData.isPro && proValidUntilDate && proValidUntilDate > new Date()) ||
      userData.email === ADMIN_EMAIL
  ));
  const isAdmin = userData?.email === ADMIN_EMAIL;
  
  const showUpgradeButton = userData && !isPro && !isAdmin;

  const getWelcomeMessage = () => {
    if (isLoading || !userData) return null;
    
    if (isAdmin) {
        return "Welcome, Admin! Enjoy unlimited access.";
    }
    if(isPro) {
        return `Welcome, ${userData.name}!`;
    }

    const examsRemaining = FREE_TOPIC_EXAM_LIMIT - (userData.topicExamsTaken || 0);
    return `Welcome, ${userData.name}! You have ${examsRemaining > 0 ? examsRemaining : 0} free exam(s) remaining.`;
  }

  const contextValue = { user, userData, categories, topics, bankedQuestions, isLoading, setUserData };

  return (
    <DashboardContext.Provider value={contextValue}>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:hidden">
              <Link href="/" className="flex items-center gap-2">
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
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/admin')} tooltip="Admin">
                    <Link href="/dashboard/admin">
                      <Shield />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/profile'} tooltip="Profile">
                  <Link href="/dashboard/profile">
                    <UserIcon />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/history'} tooltip="Exam History">
                  <Link href="/dashboard/history">
                    <History />
                    <span>Exam History</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/performance')} tooltip="Performance">
                  <Link href="/dashboard/performance">
                    <TrendingUp />
                    <span>Performance</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               {showUpgradeButton && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/dashboard/upgrade'} variant="outline" className="text-primary hover:bg-primary/10 hover:text-primary border-primary/50" tooltip="Upgrade to Pro">
                    <Link href="/dashboard/upgrade">
                      <Gem />
                      <span>Upgrade to Pro</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <div className="p-2">
              <Button onClick={() => handleLogout()} variant="ghost" className="w-full justify-start">
                <LogOut className="mr-2 h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Logout</span>
              </Button>
            </div>
            <div className='p-4 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden'>
              <p>&copy; {new Date().getFullYear()} Anjalkaran</p>
            </div>
          </SidebarFooter>
        </Sidebar>
         <MainContent>
            {isLoading ? (
                 <div className="flex h-full w-full items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 </div>
            ) : children}
        </MainContent>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
