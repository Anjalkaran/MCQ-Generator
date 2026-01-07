

"use client";

import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { LayoutDashboard, User as UserIcon, History, LogOut, Shield, Loader2, TrendingUp, Gem, Menu, BookCopy, FileText, Trophy, HelpCircle, LifeBuoy, Users, BarChart3, MessageCircle, Star, PenSquare, RefreshCw, Video, UserCheck, BookOpen } from 'lucide-react';
import { NewLogoIcon } from '@/components/icons/new-logo-icon';
import Link from 'next/link';
import { getFirebaseAuth } from '@/lib/firebase';
import { signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { getDashboardData, updateUserDocument, hasUserSubmittedFeedback } from '@/lib/firestore';
import type { UserData, Category, Topic, BankedQuestion, TopicMCQ, QnAUsage, Notification, VideoClass, StudyMaterial } from "@/lib/types";
import { ADMIN_EMAILS } from '@/lib/constants';
import { normalizeDate } from '@/lib/utils';
import { CardDescription } from '@/components/ui/card';
import packageJson from '../../../package.json';
import { AdminNotifications } from '@/components/dashboard/admin-notifications';
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { increment } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatDistanceToNow } from 'date-fns';

const profileUpdateSchema = z.object({
  employeeId: z.string().length(8, { message: 'Employee ID must be exactly 8 digits.' }).regex(/^\d{8}$/, 'Employee ID must be a number.'),
  mobileNumber: z.string().min(10, { message: 'Mobile number must be at least 10 digits.' }),
});

interface ProfileUpdateDialogProps {
  open: boolean;
  onUpdateSubmit: (values: { employeeId: string; mobileNumber: string }) => Promise<void>;
  defaultValues: { employeeId: string; mobileNumber: string };
}

function ProfileUpdateDialog({ open, onUpdateSubmit, defaultValues }: ProfileUpdateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof profileUpdateSchema>>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues,
  });

  const handleSubmit = async (values: z.infer<typeof profileUpdateSchema>) => {
    setIsSubmitting(true);
    await onUpdateSubmit(values);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} hideCloseButton>
        <DialogHeader>
          <DialogTitle>Update Required</DialogTitle>
          <DialogDescription>
            Please provide your 8-digit Employee ID and 10-digit mobile number to continue.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your 8-digit Employee ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobileNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your 10-digit mobile number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save and Continue
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


interface NewContentPopupProps {
  newContent: { videos: VideoClass[], studyMaterials: StudyMaterial[] };
  onClose: () => void;
  topics: Topic[];
}

function NewContentPopup({ newContent, onClose, topics }: NewContentPopupProps) {
    const getTopicTitle = (topicId: string) => topics.find(t => t.id === topicId)?.title || 'Unknown Topic';
    
    return (
        <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Content Added!</DialogTitle>
                    <DialogDescription>
                        Check out the latest materials we've uploaded for you.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-80 pr-4">
                    <div className="space-y-4">
                        {newContent.videos.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><Video className="h-5 w-5 text-primary" /> New Video Classes</h3>
                                <div className="space-y-2">
                                    {newContent.videos.map(video => (
                                        <div key={video.id} className="text-sm p-2 border rounded-md">
                                            <p className="font-medium">{video.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Added {formatDistanceToNow(normalizeDate(video.uploadedAt)!, { addSuffix: true })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                         {newContent.studyMaterials.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> New Study Materials</h3>
                                <div className="space-y-2">
                                    {newContent.studyMaterials.map(material => (
                                        <div key={material.id} className="text-sm p-2 border rounded-md">
                                            <p className="font-medium">New material for: {getTopicTitle(material.topicId)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Added {formatDistanceToNow(normalizeDate(material.uploadedAt)!, { addSuffix: true })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button onClick={onClose}>Got it, thanks!</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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
  videoClasses: VideoClass[];
  qnaUsage: QnAUsage[];
  notifications: Notification[];
  onlineUsers: OnlineUser[];
  isLoading: boolean;
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
  hasGivenFeedback: boolean;
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
  const { user, userData, isLoading, onlineUsers, hasGivenFeedback, setUserData } = useDashboard();
  const { setOpenMobile } = useSidebar();
  const [isLogoutAlertOpen, setIsLogoutAlertOpen] = useState(false);

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

  const handleFeedbackClick = () => {
    setIsLogoutAlertOpen(false);
    router.push('/dashboard/feedback');
  };
  
  const handleLogoutClick = () => {
    if (hasGivenFeedback) {
      handleLogout();
    } else {
      setIsLogoutAlertOpen(true);
    }
  };

  const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
  const isIPUser = userData?.examCategory === 'IP';
  
  const handleAdminViewChange = (category: UserData['examCategory']) => {
    if (isAdmin && userData) {
      setUserData({ ...userData, examCategory: category });
      toast({
        title: 'View Changed',
        description: `Now viewing dashboard as a ${category} user.`,
      });
    }
  };
  
  const getWelcomeMessage = () => {
    if (isLoading || !userData) return null;
    return `Welcome, ${userData.name}!`;
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
          {isAdmin && (
            <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
                <Label htmlFor="admin-view-select" className="text-xs text-muted-foreground px-2">View As</Label>
                <Select value={userData?.examCategory} onValueChange={handleAdminViewChange}>
                    <SelectTrigger id="admin-view-select" className="h-9">
                        <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="MTS">MTS User</SelectItem>
                        <SelectItem value="POSTMAN">Postman User</SelectItem>
                        <SelectItem value="PA">PA User</SelectItem>
                        <SelectItem value="IP">IP User</SelectItem>
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
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/admin')} tooltip="Admin">
                <Link href="/dashboard/admin" onClick={onLinkClick}>
                  <Shield />
                  <span>Admin</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
           {!isIPUser && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/online-test')} tooltip="Online Tests">
                  <Link href="/dashboard/online-test" onClick={onLinkClick}>
                    <PenSquare />
                    <span>Online Tests</span>
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
            </>
           )}
           <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/study-material')} tooltip="Study Material">
                <Link href="/dashboard/study-material" onClick={onLinkClick}>
                  <BookOpen />
                  <span>Study Material</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
           {isAdmin && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/q-and-a')} tooltip="Ask Your Doubt">
                  <Link href="/dashboard/q-and-a" onClick={onLinkClick}>
                    <HelpCircle />
                    <span>Ask Your Doubt</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
            )}
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
                <MessageCircle />
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
            <AlertDialog open={isLogoutAlertOpen} onOpenChange={setIsLogoutAlertOpen}>
                <Button variant="ghost" className="w-full justify-start" onClick={handleLogoutClick}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Logout</span>
                </Button>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your feedback helps us improve. Please consider sharing your thoughts before you go.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-between">
                        <Button variant="outline" onClick={handleFeedbackClick}>
                           Give Feedback
                        </Button>
                        <div className="flex gap-2 justify-end">
                           <AlertDialogCancel>Stay Logged In</AlertDialogCancel>
                           <AlertDialogAction onClick={() => handleLogout()}>Log Out</AlertDialogAction>
                        </div>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
        <div className='p-4 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden'>
          <p>&copy; {new Date().getFullYear()} Anjalkaran | v{packageJson.version}</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

function PwaUpdateNotification() {
  const [show, setShow] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.workbox !== undefined) {
      const wb = window.workbox;
      
      const promptNewVersionAvailable = (event: any) => {
        setWaitingWorker(event.waiting);
        setShow(true);
      };

      wb.addEventListener('waiting', promptNewVersionAvailable);
      wb.register();
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.addEventListener('controlling', () => {
        window.location.reload();
      });
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
       <Alert>
          <AlertTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Update Available
          </AlertTitle>
          <AlertDescription>
            A new version of the app is ready. Click to reload.
          </AlertDescription>
           <Button onClick={handleUpdate} className="mt-2 w-full">
            Reload
          </Button>
        </Alert>
    </div>
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
  const [topicMCQs, setTopicMCQs] = useState<TopicMCQ[]>([]);
  const [liveTestBank, setLiveTestBank] = useState<BankedQuestion[]>([]);
  const [videoClasses, setVideoClasses] = useState<VideoClass[]>([]);
  const [qnaUsage, setQnaUsage] = useState<QnAUsage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGivenFeedback, setHasGivenFeedback] = useState(false);
  const [showProfileUpdateModal, setShowProfileUpdateModal] = useState(false);
  const [profileUpdateDefaults, setProfileUpdateDefaults] = useState({ employeeId: '', mobileNumber: '' });
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const [showNewContentPopup, setShowNewContentPopup] = useState(false);
  const [newContent, setNewContent] = useState<{ videos: VideoClass[], studyMaterials: StudyMaterial[] }>({ videos: [], studyMaterials: [] });

  const handleLogout = useCallback(async (authInstance = getFirebaseAuth(), showToast = true, message?: string) => {
    if (!authInstance) {
      if (showToast) toast({ title: "Authentication Error", description: "Could not connect to service.", variant: "destructive" });
      return;
    }
    try {
      await signOut(authInstance);
      if (showToast) toast({ title: "Logged Out", description: message || "You have been successfully logged out." });
      router.push('/');
    } catch (error: any) {
      if (showToast) toast({ title: 'Logout Failed', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
    }
  }, [router, toast]);

  // Version Check Effect
  useEffect(() => {
    if (!user) return;
    const currentVersion = process.env.APP_VERSION;
    
    const versionCheckInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/version');
            if (response.ok) {
                const { version: serverVersion } = await response.json();
                if (currentVersion && serverVersion && currentVersion !== serverVersion) {
                    setShowUpdateAlert(true);
                    clearInterval(versionCheckInterval);
                }
            }
        } catch (error) {
            console.error("Version check failed:", error);
        }
    }, 60 * 1000); // Check every 60 seconds

    return () => clearInterval(versionCheckInterval);
  }, [user]);

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
                 if (!userData || userData.uid !== currentUser.uid) {
                    const adminUserData: UserData = {
                        uid: currentUser.uid,
                        name: currentUser.displayName || 'Admin',
                        email: currentUser.email!,
                        examCategory: 'PA', // Default view for admin
                        totalExamsTaken: 0,
                        isPro: true,
                    };
                    setUserData(adminUserData);
                }
                // Admin needs ALL data
                const { categories, topics, bankedQuestions, topicMCQs, liveTestBank, videoClasses, qnaUsage, notifications } = await getDashboardData(currentUser.uid, true);

                setCategories(categories);
                setTopics(topics);
                setBankedQuestions(bankedQuestions);
                setTopicMCQs(topicMCQs);
                setLiveTestBank(liveTestBank);
                setVideoClasses(videoClasses);
                setQnaUsage(qnaUsage);
                setNotifications(notifications);
                
            } else {
                const [
                    dashboardData,
                    feedbackStatus
                ] = await Promise.all([
                    getDashboardData(currentUser.uid),
                    hasUserSubmittedFeedback(currentUser.uid)
                ]);

                if (!dashboardData.userData) {
                     toast({ title: "Authentication Error", description: "Could not load user profile. Please log in again.", variant: "destructive" });
                     handleLogout(auth, false);
                     return;
                }

                setUserData(dashboardData.userData);
                setCategories(dashboardData.categories || []);
                setTopics(dashboardData.topics || []);
                setBankedQuestions(dashboardData.bankedQuestions || []);
                setVideoClasses(dashboardData.videoClasses || []);
                setHasGivenFeedback(feedbackStatus);

                const lastSeenTimestamp = localStorage.getItem('lastSeenUpdateTimestamp');
                const lastSeenDate = lastSeenTimestamp ? new Date(parseInt(lastSeenTimestamp, 10)) : new Date(0);

                const allContent = [...(dashboardData.videoClasses || [])];
                const mostRecentUpload = allContent.reduce((latest, item) => {
                    const itemDate = normalizeDate(item.uploadedAt);
                    return itemDate && itemDate > latest ? itemDate : latest;
                }, new Date(0));

                if (mostRecentUpload > lastSeenDate) {
                    const newVideos = (dashboardData.videoClasses || []).filter(v => normalizeDate(v.uploadedAt)! > lastSeenDate);
                    if (newVideos.length > 0) {
                        setNewContent({ videos: newVideos, studyMaterials: [] });
                        setShowNewContentPopup(true);
                    }
                }

                const fetchedUserData = dashboardData.userData;
                const isEmployeeIdInvalid = !fetchedUserData.employeeId || fetchedUserData.employeeId.length !== 8;
                const isMobileInvalid = !fetchedUserData.phone;
                
                if (isEmployeeIdInvalid || isMobileInvalid) {
                    setProfileUpdateDefaults({
                        employeeId: fetchedUserData.employeeId || '',
                        mobileNumber: fetchedUserData.phone || '',
                    });
                    setShowProfileUpdateModal(true);
                }
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
        setVideoClasses([]);
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

  // This effect filters data based on the selected exam category for admins
  useEffect(() => {
    if (userData?.email && ADMIN_EMAILS.includes(userData.email)) {
        getDashboardData(userData.uid, true).then(data => {
            const currentViewCategory = userData.examCategory;

            const filteredCategories = (data.categories || []).filter(c => c.examCategories.includes(currentViewCategory));
            
            const filteredTopics = (data.topics || []).filter(t => t.examCategories.includes(currentViewCategory));
            const filteredBankedQuestions = (data.bankedQuestions || []).filter(bq => bq.examCategory === currentViewCategory);
            const filteredVideoClasses = (data.videoClasses || []).filter(vc => vc.examCategories.includes(currentViewCategory));
            
            setCategories(filteredCategories);
            setTopics(filteredTopics);
            setBankedQuestions(filteredBankedQuestions);
            setVideoClasses(filteredVideoClasses);
            
            // Data that is not category-specific
            setTopicMCQs(data.topicMCQs || []);
            setLiveTestBank(data.liveTestBank || []);
            setQnaUsage(data.qnaUsage || []);
            setNotifications(data.notifications || []);
        });
    }
  }, [userData]);
  
  const handleProfileUpdateSubmit = async (values: { employeeId: string; mobileNumber: string }) => {
    if (!user) return;
    try {
        await updateUserDocument(user.uid, { employeeId: values.employeeId, phone: values.mobileNumber });
        setUserData(prev => prev ? { ...prev, employeeId: values.employeeId, phone: values.mobileNumber } : null);
        setShowProfileUpdateModal(false);
        toast({ title: 'Success', description: 'Your profile has been updated.' });
    } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to update your profile.', variant: 'destructive' });
    }
  };

  const handleCloseNewContentPopup = () => {
    setShowNewContentPopup(false);
    localStorage.setItem('lastSeenUpdateTimestamp', String(Date.now()));
  };

  const contextValue = { user, userData, categories, topics, bankedQuestions, topicMCQs, liveTestBank, videoClasses, qnaUsage, notifications, onlineUsers, isLoading, setUserData, hasGivenFeedback };

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
              ) : (
                <>
                  <PwaUpdateNotification />
                  {showProfileUpdateModal && <ProfileUpdateDialog open={showProfileUpdateModal} onUpdateSubmit={handleProfileUpdateSubmit} defaultValues={profileUpdateDefaults} />}
                  {showNewContentPopup && <NewContentPopup newContent={newContent} onClose={handleCloseNewContentPopup} topics={topics} />}
                  <AlertDialog open={showUpdateAlert}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <RefreshCw className="h-5 w-5" />
                                Application Updated
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                A new version of the application is available. Please log in again to get the latest updates.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogAction onClick={() => handleLogout(getFirebaseAuth(), false, "Please log in again to get the latest update.")}>
                                    OK
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  {children}
                </>
              )}
          </MainContent>
        </SidebarProvider>
      </div>
    </DashboardContext.Provider>
  );
}
