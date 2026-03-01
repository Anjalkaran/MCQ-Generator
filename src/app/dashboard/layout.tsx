
"use client";

import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { LayoutDashboard, User as UserIcon, History, LogOut, Shield, Loader2, TrendingUp, Menu, BookCopy, FileText, Trophy, HelpCircle, Users, MessageCircle, Star, PenSquare, RefreshCw, Video, Library, UserCheck, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { getDashboardData, updateUserDocument, hasUserSubmittedFeedback, getOnlineUsers as fetchOnlineUsers, updateDoc, doc } from '@/lib/firestore';
import type { UserData, Category, Topic, Notification, VideoClass, StudyMaterial, WeeklyTest } from "@/lib/types";
import { ADMIN_EMAILS } from '@/lib/constants';
import { normalizeDate } from '@/lib/utils';
import { CardDescription } from '@/components/ui/card';
import packageJson from '../../../package.json';
import { AdminNotifications } from '@/components/dashboard/admin-notifications';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { serverTimestamp } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatDistanceToNow } from 'date-fns';

const profileUpdateSchema = z.object({
  employeeId: z.string().length(8, { message: 'Employee ID must be exactly 8 digits.' }).regex(/^\d{8}$/, 'Employee ID must be a number.'),
  mobileNumber: z.string().min(10, { message: 'Mobile number must be at least 10 digits.' }),
});

function ProfileUpdateDialog({ open, onUpdateSubmit, defaultValues }: { open: boolean; onUpdateSubmit: (values: any) => Promise<void>; defaultValues: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm({ resolver: zodResolver(profileUpdateSchema), defaultValues });
  const handleSubmit = async (values: any) => { setIsSubmitting(true); await onUpdateSubmit(values); setIsSubmitting(false); };
  return (
    <Dialog open={open}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} hideCloseButton>
        <DialogHeader><DialogTitle>Update Required</DialogTitle><DialogDescription>Please provide your 8-digit Employee ID and 10-digit mobile number to continue.</DialogDescription></DialogHeader>
        <Form {...form}><form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="employeeId" render={({ field }) => (<FormItem><FormLabel>Employee ID</FormLabel><FormControl><Input placeholder="8-digit ID" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="mobileNumber" render={({ field }) => (<FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input placeholder="10-digit number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save and Continue</Button></DialogFooter>
        </form></Form>
      </DialogContent>
    </Dialog>
  );
}

function NewContentPopup({ newContent, onClose, topics }: { newContent: { videos: VideoClass[], materials: StudyMaterial[] }; onClose: () => void; topics: Topic[] }) {
    const getTopicTitle = (topicId: string) => topics.find(t => t.id === topicId)?.title || 'Unknown Topic';
    return (
        <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent>
                <DialogHeader><DialogTitle>New Content Added!</DialogTitle><DialogDescription>Check out the latest materials we've uploaded for you.</DialogDescription></DialogHeader>
                <ScrollArea className="max-h-80 pr-4">
                    <div className="space-y-4">
                        {newContent.videos.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><Video className="h-5 w-5 text-primary" /> New Video Classes</h3>
                                <div className="space-y-2">{newContent.videos.map(video => (<div key={video.id} className="text-sm p-2 border rounded-md"><p className="font-medium">{video.title}</p><p className="text-xs text-muted-foreground">Added {formatDistanceToNow(normalizeDate(video.uploadedAt)!, { addSuffix: true })}</p></div>))}</div>
                            </div>
                        )}
                         {newContent.materials.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><Library className="h-5 w-5 text-primary" /> New Study Materials</h3>
                                <div className="space-y-2">{newContent.materials.map(material => (<div key={material.id} className="text-sm p-2 border rounded-md"><p className="font-medium">{getTopicTitle(material.topicId)}</p><p className="text-xs text-muted-foreground">File: {material.fileName}</p></div>))}</div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter><Button onClick={onClose}>Got it, thanks!</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface DashboardContextType {
  user: User | null;
  userData: UserData | null;
  categories: Category[];
  topics: Topic[];
  videoClasses: VideoClass[];
  studyMaterials: StudyMaterial[];
  weeklyTests: WeeklyTest[];
  notifications: Notification[];
  onlineUsers: any[];
  isLoading: boolean;
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
  hasGivenFeedback: boolean;
}

const DashboardContext = createContext<DashboardContextType | null>(null);
export const useDashboard = () => { const context = useContext(DashboardContext); if (!context) throw new Error('useDashboard must be used within a DashboardLayout'); return context; };

function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { userData, hasGivenFeedback, onlineUsers, setUserData } = useDashboard();
  const { setOpenMobile, state } = useSidebar();
  const [isLogoutAlertOpen, setIsLogoutAlertOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    try { await signOut(auth); router.push('/'); } catch (error: any) { toast({ title: 'Logout Failed', description: error.message, variant: 'destructive' }); }
  }, [router, toast]);

  const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
  const isIPUser = userData?.examCategory === 'IP';
  
  const uniqueOnlineUsers = useMemo(() => {
    return Array.from(new Map(onlineUsers.map(u => [u.uid, u])).values());
  }, [onlineUsers]);

  const onLinkClick = () => setOpenMobile(false);
  
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader><div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:hidden"><Link href="/" onClick={onLinkClick}><Logo className="h-12 w-auto text-primary" /></Link></div></SidebarHeader>
      <SidebarContent><SidebarMenu>
          <div className="p-2 group-data-[collapsible=icon]:hidden"><CardDescription className="text-center text-sm">{userData ? `Welcome, ${userData.name}!` : ''}</CardDescription></div>
          {isAdmin && (
            <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
                <Label htmlFor="admin-view-select" className="text-xs text-muted-foreground px-2">View As</Label>
                <Select value={userData?.examCategory} onValueChange={(v) => setUserData(prev => prev ? ({ ...prev, examCategory: v as any }) : null)}>
                    <SelectTrigger id="admin-view-select" className="h-9"><SelectValue placeholder="Select Course" /></SelectTrigger>
                    <SelectContent><SelectItem value="MTS">MTS User</SelectItem><SelectItem value="POSTMAN">Postman User</SelectItem><SelectItem value="PA">PA User</SelectItem><SelectItem value="IP">IP User</SelectItem></SelectContent>
                </Select>
            </div>
          )}
          <SidebarMenuItem><SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip="Dashboard"><Link href="/dashboard" onClick={onLinkClick}><LayoutDashboard /><span>Dashboard</span></Link></SidebarMenuButton></SidebarMenuItem>
          {isAdmin && (
            <>
              <SidebarMenuItem><SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/admin')} tooltip="Admin"><Link href="/dashboard/admin" onClick={onLinkClick}><Shield /><span>Admin</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/free-class')} tooltip="Free Class"><Link href="/dashboard/free-class" onClick={onLinkClick}><UserCheck /><span>Free Class</span></Link></SidebarMenuButton></SidebarMenuItem>
            </>
          )}
           {!isIPUser && (
            <><SidebarMenuItem><SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/weekly-test')} tooltip="Weekly Test"><Link href="/dashboard/weekly-test" onClick={onLinkClick}><CalendarCheck /><span>Weekly Test</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/online-test')} tooltip="Practice Exams"><Link href="/dashboard/online-test" onClick={onLinkClick}><PenSquare /><span>Practice Exams</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/video-classes')} tooltip="Video Classes"><Link href="/dashboard/video-classes" onClick={onLinkClick}><Video /><span>Video Classes</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/study-material')} tooltip="Study Material"><Link href="/dashboard/study-material" onClick={onLinkClick}><Library /><span>Study Material</span></Link></SidebarMenuButton></SidebarMenuItem></>
           )}
          <SidebarMenuItem><SidebarMenuButton asChild isActive={pathname === '/dashboard/profile'} tooltip="Profile"><Link href="/dashboard/profile" onClick={onLinkClick}><UserIcon /><span>Profile</span></Link></SidebarMenuButton></SidebarMenuItem>
          <SidebarMenuItem><SidebarMenuButton asChild isActive={pathname === '/dashboard/history'} tooltip="Exam History"><Link href="/dashboard/history" onClick={onLinkClick}><History /><span>Exam History</span></Link></SidebarMenuButton></SidebarMenuItem>
          {isAdmin && (
            <SidebarMenuItem><SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/performance')} tooltip="Performance"><Link href="/dashboard/performance" onClick={onLinkClick}><TrendingUp /><span>Performance</span></Link></SidebarMenuButton></SidebarMenuItem>
          )}
          <SidebarMenuItem><SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/leaderboard')} tooltip="Leaderboard"><Link href="/dashboard/leaderboard" onClick={onLinkClick}><Trophy /><span>Leaderboard</span></Link></SidebarMenuButton></SidebarMenuItem>
          <SidebarMenuItem><SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/feedback')} tooltip="Feedback"><Link href="/dashboard/feedback" onClick={onLinkClick}><Star /><span>Feedback</span></Link></SidebarMenuButton></SidebarMenuItem>
          <SidebarMenuItem><SidebarMenuButton asChild tooltip="WhatsApp Support"><a href="https://wa.me/9003142899" target="_blank" rel="noopener noreferrer"><MessageCircle /><span>WhatsApp Support</span></a></SidebarMenuButton></SidebarMenuItem>
        </SidebarMenu></SidebarContent>
      <SidebarFooter>
        {isAdmin && (
            <div className="p-2 border-t group-data-[collapsible=icon]:hidden"><Dialog><DialogTrigger asChild><Button variant="ghost" className="w-full justify-between text-sm"><div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" /><span>Online Users</span></div><span className="font-semibold text-primary">{uniqueOnlineUsers.length}</span></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Online Users ({uniqueOnlineUsers.length})</DialogTitle></DialogHeader><ScrollArea className="h-72"><Table><TableBody>{uniqueOnlineUsers.length > 0 ? uniqueOnlineUsers.map(u => (<TableRow key={u.uid}><TableCell>{u.name}</TableCell><TableCell>{u.email}</TableCell></TableRow>)) : <TableRow><TableCell className="text-center">No users online.</TableCell></TableRow>}</TableBody></Table></ScrollArea></DialogContent></Dialog></div>
        )}
        <div className="p-2"><AlertDialog open={isLogoutAlertOpen} onOpenChange={setIsLogoutAlertOpen}><Button variant="ghost" className="w-full justify-start" onClick={() => hasGivenFeedback ? handleLogout() : setIsLogoutAlertOpen(true)}><LogOut className="mr-2 h-4 w-4" /><span className="group-data-[collapsible=icon]:hidden">Logout</span></Button><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Log out?</AlertDialogTitle><AlertDialogDescription>Please consider giving feedback before you leave.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="sm:justify-between"><Button variant="outline" onClick={() => { setIsLogoutAlertOpen(false); router.push('/dashboard/feedback'); }}>Give Feedback</Button><div className="flex gap-2"><AlertDialogCancel>Stay</AlertDialogCancel><AlertDialogAction onClick={handleLogout}>Log Out</AlertDialogAction></div></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
        <div className='p-4 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden'><p>&copy; {new Date().getFullYear()} Anjalkaran | v{packageJson.version}</p></div>
      </SidebarFooter>
    </Sidebar>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [videoClasses, setVideoClasses] = useState<VideoClass[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [weeklyTests, setWeeklyTests] = useState<WeeklyTest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGivenFeedback, setHasGivenFeedback] = useState(false);
  const [showProfileUpdateModal, setShowProfileUpdateModal] = useState(false);
  const [profileUpdateDefaults, setProfileUpdateDefaults] = useState({ employeeId: '', mobileNumber: '' });
  const [showNewContentPopup, setShowNewContentPopup] = useState(false);
  const [newContent, setNewContent] = useState({ videos: [], materials: [] });

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { router.push('/auth/login'); setIsLoading(false); return; }
    
    return onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
            const [data, feedbackStatus] = await Promise.all([getDashboardData(currentUser.uid), hasUserSubmittedFeedback(currentUser.uid)]);
            if (!data.userData) { 
                await signOut(auth); 
                router.push('/auth/login'); 
                setIsLoading(false);
                return; 
            }
            
            setUserData(data.userData);
            setCategories(data.categories || []);
            setTopics(data.topics || []);
            setVideoClasses(data.videoClasses || []);
            setStudyMaterials(data.studyMaterials || []);
            setWeeklyTests(data.weeklyTests || []);
            setNotifications(data.notifications || []);
            setHasGivenFeedback(feedbackStatus);

            const lastSeen = localStorage.getItem('lastSeenUpdateTimestamp');
            const lastSeenDate = lastSeen ? new Date(parseInt(lastSeen, 10)) : new Date(0);
            const mostRecent = [...(data.videoClasses || []), ...(data.studyMaterials || [])].reduce((latest, item) => { const d = normalizeDate(item.uploadedAt); return d && d > latest ? d : latest; }, new Date(0));
            if (mostRecent > lastSeenDate) {
                const nv = (data.videoClasses || []).filter(v => normalizeDate(v.uploadedAt)! > lastSeenDate);
                const nm = (data.studyMaterials || []).filter(m => normalizeDate(m.uploadedAt)! > lastSeenDate);
                if (nv.length > 0 || nm.length > 0) { setNewContent({ videos: nv as any, materials: nm as any }); setShowNewContentPopup(true); }
            }
            if (!ADMIN_EMAILS.includes(data.userData.email) && (!data.userData.employeeId || data.userData.employeeId.length !== 8 || !data.userData.phone)) {
                setProfileUpdateDefaults({ employeeId: data.userData.employeeId || '', mobileNumber: data.userData.phone || '' });
                setShowProfileUpdateModal(true);
            }
        } catch (error) { 
            console.error("Dashboard init error:", error);
        } finally {
            setIsLoading(false);
        }
      } else {
        setUser(null);
        setUserData(null);
        if (!pathname.startsWith('/auth')) {
            router.push('/auth/login');
        }
        setIsLoading(false);
      }
    });
  }, [router, pathname]);

  useEffect(() => {
    if (user?.uid) {
      const heartbeat = async () => { try { await updateDoc(doc(getFirebaseDb()!, 'users', user.uid), { lastSeen: serverTimestamp() }); } catch (e) {} };
      heartbeat();
      const id = setInterval(heartbeat, 600000); // 10 minutes
      return () => clearInterval(id);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (userData?.email && ADMIN_EMAILS.includes(userData.email)) {
        const fetch = async () => { try { const users = await fetchOnlineUsers(); setOnlineUsers(users); } catch (e) {} };
        fetch();
        const id = setInterval(fetch, 300000); // 5 minutes
        return () => clearInterval(id);
    }
  }, [userData?.email]);

  const contextValue = useMemo(() => ({ user, userData, categories, topics, videoClasses, studyMaterials, weeklyTests, notifications, onlineUsers, isLoading, setUserData, hasGivenFeedback }), [user, userData, categories, topics, videoClasses, studyMaterials, weeklyTests, notifications, onlineUsers, isLoading, hasGivenFeedback]);

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <SidebarProvider><div className="relative z-20"><AppSidebar /></div>
           <main className="flex-1 bg-muted/40 flex flex-col min-h-0">
              <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
                <SidebarTrigger className="sm:hidden" /><div className="relative flex-1 flex items-center gap-2"><SidebarTrigger className="hidden sm:inline-flex" /></div>
                {userData && ADMIN_EMAILS.includes(userData.email) && <AdminNotifications initialNotifications={notifications} />}
              </header>
              <div className="p-4 md:p-6 flex-1 overflow-auto min-h-0">
                {isLoading ? <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div> : (
                    <>{showProfileUpdateModal && <ProfileUpdateDialog open={showProfileUpdateModal} onUpdateSubmit={async (v) => { await updateUserDocument(user!.uid, { employeeId: v.employeeId, phone: v.mobileNumber }); setUserData(p => p ? { ...p, ...v } : null); setShowProfileUpdateModal(false); }} defaultValues={profileUpdateDefaults} />}
                      {showNewContentPopup && <NewContentPopup newContent={newContent} onClose={() => { setShowNewContentPopup(false); localStorage.setItem('lastSeenUpdateTimestamp', String(Date.now())); }} topics={topics} />}
                      {children}</>
                )}
              </div>
          </main>
        </SidebarProvider>
      </div>
    </DashboardContext.Provider>
  );
}
