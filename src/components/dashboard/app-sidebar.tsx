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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
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
  CalendarCheck,
  Clock,
  Bookmark,
  LineChart,
  Book
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
      <SidebarHeader className="border-b p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Logo height={40} width={120} />
          </div>
          
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip="Dashboard">
                    <Link href="/dashboard" onClick={onLinkClick}>
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Learning</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
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
                  <SidebarMenuButton asChild isActive={pathname === '/dashboard/bookmarks'} tooltip="Bookmarks">
                    <Link href="/dashboard/bookmarks" onClick={onLinkClick}>
                      <Bookmark />
                      <span>Bookmarks</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/dashboard/syllabus'} tooltip="Syllabus Explorer">
                    <Link href="/dashboard/syllabus" onClick={onLinkClick}>
                      <Book />
                      <span>Syllabus Explorer</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Exams</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/daily-test')} tooltip="Daily Test">
                    <Link href="/dashboard/daily-test" onClick={onLinkClick}>
                      <Clock />
                      <span>Daily Test</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/weekly-test')} tooltip="Weekly Test">
                    <Link href="/dashboard/weekly-test" onClick={onLinkClick}>
                      <CalendarCheck />
                      <span>Weekly Test</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/online-test')} tooltip="Topic Wise MCQ Test">
                    <Link href="/dashboard/online-test" onClick={onLinkClick}>
                      <PenSquare />
                      <span>Topic Wise MCQ Test</span>
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Performance & Community</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/leaderboard')} tooltip="Leaderboard">
                    <Link href="/dashboard/leaderboard" onClick={onLinkClick}>
                      <Trophy />
                      <span>Leaderboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/dashboard/performance'} tooltip="Performance">
                    <Link href="/dashboard/performance" onClick={onLinkClick}>
                      <LineChart />
                      <span>Performance</span>
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Account & Support</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/dashboard/profile'} tooltip="Profile">
                    <Link href="/dashboard/profile" onClick={onLinkClick}>
                      <UserIcon />
                      <span>Profile</span>
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
            </SidebarGroupContent>
          </SidebarGroup>

          {isAdmin && (
            <SidebarGroup>
                <SidebarSeparator className="my-2" />
                <SidebarGroupLabel>Admin Control</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/admin')} tooltip="Admin Panel">
                            <Link href="/dashboard/admin" onClick={onLinkClick}>
                                <Shield />
                                <span>Admin Panel</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    
                    <SidebarMenuItem>
                        <Dialog>
                            <DialogTrigger asChild>
                                <SidebarMenuButton tooltip="Online Users">
                                    <Users />
                                    <span>Online Users ({uniqueOnlineUsers.length})</span>
                                </SidebarMenuButton>
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
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
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