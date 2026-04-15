"use client";

import React, { useState, useEffect } from 'react';
import { 
  SidebarProvider, 
  SidebarTrigger 
} from '@/components/ui/sidebar';
import { Loader2 } from 'lucide-react';
import { ADMIN_EMAILS } from '@/lib/constants';
import { normalizeDate } from '@/lib/utils';
import { AdminNotifications } from '@/components/dashboard/admin-notifications';
import { DashboardProvider, useDashboard } from '@/context/dashboard-context';

import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { ProfileUpdateDialog, NewContentPopup } from '@/components/dashboard/layout-modals';
import { GovernmentDisclaimer } from '@/components/government-disclaimer';
import type { VideoClass, StudyMaterial } from '@/lib/types';
import { doc, updateDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { SocialLinksSidebar } from '@/components/social-links-sidebar';

// Re-export useDashboard for backward compatibility
export { useDashboard } from '@/context/dashboard-context';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { userData, user, isLoading, videoClasses, studyMaterials, syllabusMCQs, topics, refreshDashboardData, notifications, setUserData } = useDashboard();
  const [showProfileUpdateModal, setShowProfileUpdateModal] = useState(false);
  const [profileUpdateDefaults, setProfileUpdateDefaults] = useState({ employeeId: '', mobileNumber: '' });
  const [showNewContentPopup, setShowNewContentPopup] = useState(false);
  const [newContent, setNewContent] = useState<{ videos: VideoClass[], materials: StudyMaterial[], mcqs: any[] }>({ videos: [], materials: [], mcqs: [] });

  useEffect(() => {
    if (isLoading || !userData) return;
    
    const adminEmail = userData?.email || user?.email;
    const isAdmin = adminEmail ? ADMIN_EMAILS.includes(adminEmail) : false;
    
    // Protection only for non-admins
    if (!isAdmin) {
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        // Disable F12
        if (e.key === 'F12') {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+Shift+I, J, C (DevTools)
        if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+U (View Source)
        if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+S (Save) and Ctrl+P (Print)
        if (e.ctrlKey && ['s', 'S', 'p', 'P'].includes(e.key)) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+C (Copy)
        if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
          e.preventDefault();
          return false;
        }
      };

      // Disable text selection via CSS
      document.body.style.userSelect = 'none';
      (document.body.style as any).webkitUserSelect = 'none';
      (document.body.style as any).msUserSelect = 'none';
      (document.body.style as any).mozUserSelect = 'none';

      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);

      // Add print protection for students
      const style = document.createElement('style');
      style.id = 'student-print-protection';
      style.innerHTML = '@media print { body { display: none !important; } }';
      document.head.appendChild(style);

      return () => {
        document.body.style.userSelect = 'auto';
        (document.body.style as any).webkitUserSelect = 'auto';
        (document.body.style as any).msUserSelect = 'auto';
        (document.body.style as any).mozUserSelect = 'auto';
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
        const printStyle = document.getElementById('student-print-protection');
        if (printStyle) printStyle.remove();
      };
    } else {
      // Explicitly restore defaults for admins if they were previously blocked in the same session
      document.body.style.userSelect = 'auto';
      (document.body.style as any).webkitUserSelect = 'auto';
      (document.body.style as any).msUserSelect = 'auto';
      (document.body.style as any).mozUserSelect = 'auto';
    }
  }, [isLoading, userData]);

  useEffect(() => {
    if (!isLoading && userData && user) {
      // Logic for new content popup
      const lastSeen = localStorage.getItem('lastSeenUpdateTimestamp');
      const lastSeenDate = lastSeen ? new Date(parseInt(lastSeen, 10)) : new Date(0);
      
      const videos = videoClasses || [];
      const materials = studyMaterials || [];
      const mcqs = syllabusMCQs || [];
      
      const mostRecent = [...videos, ...materials, ...mcqs].reduce((latest, item) => { 
        if (!item || !item.uploadedAt) return latest;
        const d = normalizeDate(item.uploadedAt); 
        return d && d > latest ? d : latest; 
      }, new Date(0));
      
      if (mostRecent > lastSeenDate) {
        const nv = videos.filter(v => {
          const d = normalizeDate(v.uploadedAt);
          return d && d > lastSeenDate;
        });
        const nm = materials.filter(m => {
          const d = normalizeDate(m.uploadedAt);
          return d && d > lastSeenDate;
        });
        const nmcq = mcqs.filter(m => {
          const d = normalizeDate(m.uploadedAt);
          return d && d > lastSeenDate;
        });
        if (nv.length > 0 || nm.length > 0 || nmcq.length > 0) { 
          setNewContent({ videos: nv, materials: nm, mcqs: nmcq }); 
          setShowNewContentPopup(true); 
        }
      }
      
      // Logic for mandatory profile update
      const isAdmin = userData.email ? ADMIN_EMAILS.includes(userData.email) : false;
      if (!isAdmin && (!userData.employeeId || userData.employeeId.length !== 8 || !userData.phone)) {
        setProfileUpdateDefaults({ employeeId: userData.employeeId || '', mobileNumber: userData.phone || '' });
        setShowProfileUpdateModal(true);
      }
    }
  }, [isLoading, userData, user, videoClasses, studyMaterials, syllabusMCQs]);

  const handleProfileUpdate = async (values: { employeeId: string, mobileNumber: string }) => {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) return;
    
    await updateDoc(doc(db, 'users', user.uid), { 
        employeeId: values.employeeId, 
        phone: values.mobileNumber 
    }); 
    
    setUserData(p => p ? { ...p, ...values, phone: values.mobileNumber } : null); 
    setShowProfileUpdateModal(false); 
  };

  if (isLoading) {
    return (
      <div className="flex h-svh w-full items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;

  return (
    <div className="flex min-h-svh flex-col md:flex-row overflow-hidden">
      <SidebarProvider>
        <div className="relative z-20">
          <AppSidebar />
        </div>
        <main className="flex-1 bg-muted/40 flex flex-col min-h-0 relative">
          <SocialLinksSidebar />
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger className="sm:hidden" />
            <div className="relative flex-1 flex items-center gap-2">
              <SidebarTrigger className="hidden sm:inline-flex" />
            </div>
            {isAdmin && <AdminNotifications initialNotifications={notifications} />}
          </header>

          <div className="p-4 md:p-6 flex-1 overflow-auto min-h-0">
            {showProfileUpdateModal && (
              <ProfileUpdateDialog 
                open={showProfileUpdateModal} 
                onUpdateSubmit={handleProfileUpdate} 
                defaultValues={profileUpdateDefaults} 
              />
            )}
            {showNewContentPopup && (
              <NewContentPopup 
                newContent={newContent} 
                onClose={() => { 
                  setShowNewContentPopup(false); 
                  localStorage.setItem('lastSeenUpdateTimestamp', String(Date.now())); 
                }} 
                topics={topics} 
              />
            )}
            {children}
            <div className="mt-auto">
              <GovernmentDisclaimer />
            </div>
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardContent>
        {children}
      </DashboardContent>
    </DashboardProvider>
  );
}
