
"use client";

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { LayoutDashboard, User as UserIcon, History, LogOut, Shield, Loader2, TrendingUp, BookCopy, FileText, Trophy, HelpCircle, Users, Star, PenSquare, RefreshCw, Video, Library, MessageCircle as MessageCircleIcon } from 'lucide-react';
import Link from 'next/link';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { getDashboardData, updateUserDocument, hasUserSubmittedFeedback } from '@/lib/firestore';
import type { UserData, Category, Topic, Notification, VideoClass, StudyMaterial } from "@/lib/types";
import { ADMIN_EMAILS } from '@/lib/constants';
import { normalizeDate } from '@/lib/utils';
import { CardDescription } from '@/components/ui/card';
import packageJson from '../../../package.json';
import { AdminNotifications } from '@/components/dashboard/admin-notifications';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { serverTimestamp, doc, updateDoc } from 'firebase/firestore';
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
  newContent: { videos: VideoClass[], materials: StudyMaterial[] };
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
                         {newContent.materials.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><Library className="h-5 w-5 text-primary" /> New Study Materials</h3>
                                <div className="space-y-2">
                                    {newContent.materials.map(material => (
                                        <div key={material.id} className="text-sm p-2 border rounded-md">
                                            <p className="font-medium">{getTopicTitle(material.topicId)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                File: {material.fileName}
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

interface DashboardContextType {
  user: User | null;
  userData: UserData | null;
  categories: Category[];
  topics: Topic[];
  videoClasses: VideoClass[];
  studyMaterials: StudyMaterial[];
  notifications: Notification[];
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
  const { user, userData, isLoading, hasGivenFeedback } = useDashboard();
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
               <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/study-material')} tooltip="Study Material">
                  <Link href="/dashboard/study-material" onClick={onLinkClick}>
                    <Library />
                    <span>Study Material</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
           )}
           {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/q-and-a')} tooltip="Ask Your Doubt">
                <Link href="/dashboard/q-and-a" onClick={onLinkClick}>
                  <HelpCircle />
                  <span>Ask Your Doubt</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
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
                <MessageCircleIcon />
                <span>WhatsApp Support</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
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
  const [videoClasses, setVideoClasses] = useState<VideoClass[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGivenFeedback, setHasGivenFeedback] = useState(false);
  const [showProfileUpdateModal, setShowProfileUpdateModal] = useState(false);
  const [profileUpdateDefaults, setProfileUpdateDefaults] = useState({ employeeId: '', mobileNumber: '' });
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const [showNewContentPopup, setShowNewContentPopup] = useState(false);
  const [newContent, setNewContent] = useState<{ videos: VideoClass[], materials: StudyMaterial[] }>({ videos: [], materials: [] });

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
    }, 60 * 1000);

    return () => clearInterval(versionCheckInterval);
  }, [user]);

  // Heartbeat effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (user?.uid) {
      const sendHeartbeat = async () => {
        try {
          const auth = getFirebaseAuth();
          if (auth && auth.currentUser) {
            const userRef = doc(getFirebaseDb()!, 'users', auth.currentUser.uid);
            await updateDoc(userRef, { lastSeen: serverTimestamp() });
          }
        } catch (error) {
          console.error("Failed to send heartbeat:", error);
        }
      };
      sendHeartbeat();
      intervalId = setInterval(sendHeartbeat, 60000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user]);

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
                // Admin login is simplified to prevent crashes from heavy fetching
                const adminUserData: UserData = {
                    uid: currentUser.uid,
                    name: currentUser.displayName || 'Admin',
                    email: currentUser.email!,
                    examCategory: 'PA',
                    totalExamsTaken: 0,
                    isPro: true,
                };
                setUserData(adminUserData);
                
                // Only load basic data needed for the layout (e.g., notifications)
                const data = await getDashboardData(currentUser.uid);
                setNotifications(data.notifications || []);
                
            } else {
                const [dashboardData, feedbackStatus] = await Promise.all([
                    getDashboardData(currentUser.uid),
                    hasUserSubmittedFeedback(currentUser.uid),
                ]);

                if (!dashboardData.userData) {
                     toast({ title: "Authentication Error", description: "Could not load user profile. Please log in again.", variant: "destructive" });
                     handleLogout(auth, false);
                     return;
                }

                setUserData(dashboardData.userData);
                setCategories(dashboardData.categories || []);
                setTopics(dashboardData.topics || []);
                setVideoClasses(dashboardData.videoClasses || []);
                setStudyMaterials(dashboardData.studyMaterials || []);
                setHasGivenFeedback(feedbackStatus);

                const lastSeenTimestamp = localStorage.getItem('lastSeenUpdateTimestamp');
                const lastSeenDate = lastSeenTimestamp ? new Date(parseInt(lastSeenTimestamp, 10)) : new Date(0);

                const mostRecentUpload = [...dashboardData.videoClasses, ...dashboardData.studyMaterials].reduce((latest, item) => {
                    const itemDate = normalizeDate(item.uploadedAt);
                    return itemDate && itemDate > latest ? itemDate : latest;
                }, new Date(0));

                if (mostRecentUpload > lastSeenDate) {
                    const newVideos = dashboardData.videoClasses.filter(v => normalizeDate(v.uploadedAt)! > lastSeenDate);
                    const newMaterials = dashboardData.studyMaterials.filter(m => normalizeDate(m.uploadedAt)! > lastSeenDate);
                    if (newVideos.length > 0 || newMaterials.length > 0) {
                        setNewContent({ videos: newVideos, materials: newMaterials });
                        setShowNewContentPopup(true);
                    }
                }

                const fetchedUserData = dashboardData.userData;
                if (!fetchedUserData.employeeId || fetchedUserData.employeeId.length !== 8 || !fetchedUserData.phone) {
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
        setNotifications([]);
        if (!pathname.startsWith('/auth')) {
            router.push('/auth/login');
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
    
  }, [router, toast, handleLogout, pathname]);

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

  const contextValue = { user, userData, categories, topics, videoClasses, studyMaterials, notifications, isLoading, setUserData, hasGivenFeedback };

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <SidebarProvider>
          <div className="relative z-20">
              <AppSidebar />
          </div>
           <MainContent key={user ? 'authenticated' : 'unauthenticated'}>
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
