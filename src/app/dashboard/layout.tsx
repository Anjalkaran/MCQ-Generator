
"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger } from '@/components/ui/sidebar';
import { LayoutDashboard, User as UserIcon, History, LogOut, Shield, Loader2, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { getFirebaseAuth } from '@/lib/firebase';
import { signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { getCategories, getTopics, getUserData } from '@/lib/firestore';
import type { UserData, Category, Topic } from "@/lib/types";

const ADMIN_EMAIL = "admin@anjalkaran.com";

interface DashboardContextType {
  user: User | null;
  userData: UserData | null;
  categories: Category[];
  topics: Topic[];
  isLoading: boolean;
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

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          const userIsAdmin = currentUser.email === ADMIN_EMAIL;
          setIsAdmin(userIsAdmin);

          if (pathname.startsWith('/dashboard/admin') && !userIsAdmin) {
            toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
            router.push('/dashboard');
            setIsLoading(false);
            return;
          }

          // Fetch all data here
          const [fetchedUserData, fetchedCategories, fetchedTopics] = await Promise.all([
            getUserData(currentUser.uid),
            getCategories(),
            getTopics()
          ]);
          setUserData(fetchedUserData);
          setCategories(fetchedCategories);
          setTopics(fetchedTopics);

        } else {
          setUser(null);
          setIsAdmin(false);
          setUserData(null);
          setCategories([]);
          setTopics([]);
          router.push('/auth/login');
        }
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      router.push('/auth/login');
      setIsLoading(false);
    }
  }, [router, pathname, toast]);

  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      toast({
        title: "Authentication Error",
        description: "Could not connect to authentication service.",
        variant: "destructive",
      });
      return;
    }
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/');
    } catch (error: any) {
      toast({
        title: 'Logout Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  const contextValue = { user, userData, categories, topics, isLoading };

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
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <div className="p-2">
              <Button onClick={handleLogout} variant="ghost" className="w-full justify-start">
                <LogOut className="mr-2 h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Logout</span>
              </Button>
            </div>
            <div className='p-4 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden'>
              <p>&copy; {new Date().getFullYear()} Anjalkaran</p>
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 bg-muted/40 p-4 md:p-6">{children}</main>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
