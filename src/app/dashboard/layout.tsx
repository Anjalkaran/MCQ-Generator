
"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger } from '@/components/ui/sidebar';
import { LayoutDashboard, User as UserIcon, History, LogOut } from 'lucide-react';
import Link from 'next/link';
import { getFirebaseAuth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

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
           <div className="p-2">
             <Button onClick={handleLogout} variant="ghost" className="w-full justify-start">
               <LogOut className="mr-2 h-4 w-4" />
               <span className="group-data-[collapsible=icon]:hidden">Logout</span>
             </Button>
           </div>
            <div className='p-4 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden'>
                <p>Anjalkaran MCQ Generator</p>
            </div>
        </SidebarFooter>
      </Sidebar>
      <main className="flex-1 bg-muted/40 p-4 md:p-6">{children}</main>
    </SidebarProvider>
  );
}
