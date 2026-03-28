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
  Bookmark,
  Flag,
  LineChart
} from 'lucide-react';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
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

  const handleCategoryChange = useCallback(async (newCategory: string) => {
    if (!userData?.uid) return;
    
    // Update local state first for immediate UI feedback
    setUserData(prev => prev ? ({ ...prev, examCategory: newCategory as any }) : null);

    try {
      const db = getFirebaseDb();
      if (db) {
        await updateDoc(doc(db, 'users', userData.uid), {
          examCategory: newCategory
        });
        toast({
          title: "Category Switched",
          description: `You are now viewing ${newCategory} content.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [userData?.uid, setUserData, toast]);

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
            <Logo height={32} width={96} />
          </div>
          
          {/* Category Switcher for Students */}
          {!isAdmin && userData && (
            <div className="flex flex-col gap-1.5 px-0.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-tight ml-1">
                Active Course
              </Label>
              {userData.examCategory === 'IP' ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border text-sm font-medium text-muted-foreground select-none">
                  <Shield className="h-4 w-4 text-orange-500" />
                  Inspector Posts (IP)
                </div>
              ) : (
                <Select value={userData.examCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-9 text-sm font-medium bg-background border-muted-foreground/20 hover:bg-accent transition-colors">
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="MTS" className="text-slate-900 focus:bg-red-50">MTS (Multi Tasking Staff)</SelectItem>
                    {['POSTMAN', 'PA', 'IP'].includes(userData.subscribedCategory || userData.examCategory || 'MTS') && (
                      <SelectItem value="POSTMAN" className="text-slate-900 focus:bg-red-50">POSTMAN / Mail Guard</SelectItem>
                    )}
                    {['PA', 'IP'].includes(userData.subscribedCategory || userData.examCategory || 'MTS') && (
                      <SelectItem value="PA" className="text-slate-900 focus:bg-red-50">PA / SA (Postal Assistant)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <div className="p-2 group-data-[collapsible=icon]:hidden text-center">
            <CardDescription className="text-sm font-medium">
              {userData ? `Welcome, ${userData.name}!` : ''}
            </CardDescription>
          </div>
          
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Exams</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
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
                <SidebarGroupContent>
                    <div className="px-2 pb-4 group-data-[collapsible=icon]:hidden">
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
                </SidebarGroupContent>
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
                        <SidebarMenuButton asChild isActive={pathname === '/dashboard/admin/reports'} tooltip="Question Reports">
                            <Link href="/dashboard/admin/reports" onClick={onLinkClick}>
                                <Flag />
                                <span>Question Reports</span>
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