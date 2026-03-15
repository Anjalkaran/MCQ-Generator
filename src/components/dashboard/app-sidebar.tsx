"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarFooter, 
  useSidebar 
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  User as UserIcon, 
  History, 
  LogOut, 
  Shield, 
  Trophy, 
  Users, 
  Star, 
  PenSquare, 
  Video, 
  Library, 
  MessageCircle as MessageCircleIcon, 
  CalendarCheck 
} from 'lucide-react';
import { getFirebaseAuth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { ADMIN_EMAILS } from '@/lib/constants';
import { useDashboard } from '@/context/dashboard-context';
import { CardDescription } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { userData, hasGivenFeedback, onlineUsers, setUserData } = useDashboard();
  const { setOpenMobile } = useSidebar();
  const [isLogoutAlertOpen, setIsLogoutAlertOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    try { 
      await signOut(auth); 
      router.push('/'); 
    } catch (error: any) { 
      toast({ title: 'Logout Failed', description: error.message, variant: 'destructive' }); 
    }
  }, [router, toast]);

  const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
  
  const uniqueOnlineUsers = useMemo(() => {
    return Array.from(new Map(onlineUsers.map(u => [u.uid, u])).values());
  }, [onlineUsers]);

  const onLinkClick = () => setOpenMobile(false);
  
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:hidden">
          <Link href="/" onClick={onLinkClick}>
            <Logo className="h-12 w-auto text-primary" />
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <div className="p-2 group-data-[collapsible=icon]:hidden text-center">
            <CardDescription className="text-sm font-medium">
              {userData ? `Welcome, ${userData.name}!` : ''}
            </CardDescription>
          </div>
          
          {isAdmin && (
            <div className="px-2 pb-4 group-data-[collapsible=icon]:hidden">
              <Label htmlFor="admin-view-select" className="text-[10px] uppercase font-bold text-muted-foreground px-2 tracking-widest">Admin Control</Label>
              <Select value={userData?.examCategory} onValueChange={(v) => setUserData(prev => prev ? ({ ...prev, examCategory: v as any }) : null)}>
                <SelectTrigger id="admin-view-select" className="h-9 mt-1 bg-primary/5 border-primary/20">
                  <SelectValue placeholder="Select Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTS">View as MTS</SelectItem>
                  <SelectItem value="POSTMAN">View as Postman</SelectItem>
                  <SelectItem value="PA">View as PA</SelectItem>
                  <SelectItem value="IP">View as IP (Inspector)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip="Dashboard">
              <Link href="/dashboard" onClick={onLinkClick}>
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/admin')} tooltip="Admin Panel">
                <Link href="/dashboard/admin" onClick={onLinkClick}>
                  <Shield />
                  <span>Admin Panel</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/weekly-test')} tooltip="Weekly Test">
              <Link href="/dashboard/weekly-test" onClick={onLinkClick}>
                <CalendarCheck />
                <span>Weekly Test</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/online-test')} tooltip="Practice Exams">
              <Link href="/dashboard/online-test" onClick={onLinkClick}>
                <PenSquare />
                <span>Practice Exams</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/video-classes')} tooltip="Video Classes">
              <Link href="/dashboard/video-classes" onClick={onLinkClick}>
                <Video />
                <span>Video Classes</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/study-material')} tooltip="Study Material">
              <Link href="/dashboard/study-material" onClick={onLinkClick}>
                <Library />
                <span>Study Material</span>
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
            <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/leaderboard')} tooltip="Leaderboard">
              <Link href="/dashboard/leaderboard" onClick={onLinkClick}>
                <Trophy />
                <span>Leaderboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/feedback')} tooltip="Feedback">
              <Link href="/dashboard/feedback" onClick={onLinkClick}>
                <Star />
                <span>Feedback</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="WhatsApp Support">
              <a href="https://wa.me/9003142899" target="_blank" rel="noopener noreferrer">
                <MessageCircleIcon />
                <span>WhatsApp Support</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
                  <span className="font-semibold text-primary">{uniqueOnlineUsers.length}</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Online Users ({uniqueOnlineUsers.length})</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-72">
                  <Table>
                    <TableBody>
                      {uniqueOnlineUsers.length > 0 ? (
                        uniqueOnlineUsers.map(u => (
                          <TableRow key={u.uid}>
                            <TableCell>{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell className="text-center">No users online.</TableCell>
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
          <SidebarMenuButton onClick={() => hasGivenFeedback ? handleLogout() : setIsLogoutAlertOpen(true)}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </SidebarMenuButton>
          <AlertDialog open={isLogoutAlertOpen} onOpenChange={setIsLogoutAlertOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Log out?</AlertDialogTitle>
                <AlertDialogDescription>Please consider giving feedback before you leave. It helps us improve the platform.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="sm:justify-between">
                <Button variant="outline" onClick={() => { setIsLogoutAlertOpen(false); router.push('/dashboard/feedback'); }}>Give Feedback</Button>
                <div className="flex gap-2">
                  <AlertDialogCancel>Stay</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>Log Out</AlertDialogAction>
                </div>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className='p-4 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden'>
          <p>&copy; {new Date().getFullYear()} Anjalkaran Academy</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}