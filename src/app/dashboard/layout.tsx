
"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger } from '@/components/ui/sidebar';
import { LayoutDashboard, User as UserIcon, History, LogOut, Shield, Loader2, TrendingUp, Gem } from 'lucide-react';
import Link from 'next/link';
import { getFirebaseAuth } from '@/lib/firebase';
import { signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { getDashboardData } from '@/lib/firestore';
import type { UserData, Category, Topic } from "@/lib/types";
import { ADMIN_EMAIL, FREE_TOPIC_EXAM_LIMIT } from '@/lib/constants';
import { normalizeDate } from '@/lib/utils';

interface DashboardContextType {
  user: User | null;
  userData: UserData | null;
  categories: Category[];
  topics: Topic[];
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = async (authInstance = getFirebaseAuth(), showToast = true) => {
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
  };

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
        setIsAdmin(userIsAdmin);

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
                const { categories, topics } = await getDashboardData(currentUser.uid, true);
                setUserData(adminUserData);
                setCategories(categories);
                setTopics(topics);

            } else {
                const { userData: fetchedUserData, categories, topics } = await getDashboardData(currentUser.uid);
                if (!fetchedUserData) {
                     toast({ title: "Authentication Error", description: "Could not load user profile. Please log in again.", variant: "destructive" });
                     handleLogout(auth, false);
                     return;
                }

                setUserData(fetchedUserData);
                setCategories(categories);
                setTopics(topics);
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
        setIsAdmin(false);
        setUserData(null);
        setCategories([]);
        setTopics([]);
        if (!pathname.startsWith('/auth')) {
            router.push('/auth/login');
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
    
  }, [pathname]);

  const proValidUntilDate = normalizeDate(userData?.proValidUntil);
  const isPro = !!(userData?.isPro && proValidUntilDate && proValidUntilDate > new Date());

  const showUpgradeButton = userData && !isPro && !isAdmin && userData.topicExamsTaken >= FREE_TOPIC_EXAM_LIMIT;

  const contextValue = { user, userData, categories, topics, isLoading, setUserData };

  return (
    <DashboardContext.Provider value={contextValue}>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2 p-2">
              <SidebarTrigger />
              <Link href="/" className="flex items-center gap-2">
                <Logo className="h-12 w-auto text-primary" />
              </Link>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard'}>
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/admin')}>
                    <Link href="/dashboard/admin">
                      <Shield />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/profile'}>
                  <Link href="/dashboard/profile">
                    <UserIcon />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/history'}>
                  <Link href="/dashboard/history">
                    <History />
                    <span>Exam History</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/performance')}>
                  <Link href="/dashboard/performance">
                    <TrendingUp />
                    <span>Performance</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               {showUpgradeButton && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/dashboard/upgrade'} variant="outline" className="text-primary hover:bg-primary/10 hover:text-primary border-primary/50">
                    <Link href="/dashboard/upgrade">
                      <Gem />
                      <span>Upgrade</span>
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
        <main className="flex-1 bg-muted/40 p-4 md:p-6">
            {isLoading ? (
                 <div className="flex h-screen w-full items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 </div>
            ) : children}
        </main>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
