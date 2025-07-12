"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuth, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger } from '@/components/ui/sidebar';
import { LayoutDashboard, User as UserIcon, History, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
        setLoading(false);
        router.push('/login');
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return null; // The redirect is handled in the effect, this prevents rendering children without a user
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <SidebarTrigger />
            <h2 className="font-bold text-lg group-data-[collapsible=icon]:hidden transition-opacity duration-200">
              Anjalkaran
            </h2>
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
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <div className='p-4 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden'>
                <p className="font-semibold text-foreground truncate">{user?.email}</p>
                <p>Logged in</p>
            </div>
          <Button variant="ghost" className="justify-start m-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden ml-2">Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <main className="flex-1 bg-muted/40 p-4 md:p-6">{children}</main>
    </SidebarProvider>
  );
}
