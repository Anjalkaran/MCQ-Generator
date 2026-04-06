"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { 
  getDashboardData, 
  hasUserSubmittedFeedback, 
  getOnlineUsers as fetchOnlineUsers 
} from '@/lib/firestore';
import type { UserData, Category, Topic, VideoClass, StudyMaterial, WeeklyTest, DailyTest, Notification, SyllabusBlueprint } from '@/lib/types';
import { ADMIN_EMAILS } from '@/lib/constants';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface DashboardContextType {
  user: User | null;
  userData: UserData | null;
  categories: Category[];
  topics: Topic[];
  videoClasses: VideoClass[];
  studyMaterials: StudyMaterial[];
  weeklyTests: WeeklyTest[];
  dailyTests: DailyTest[];
  notifications: Notification[];
  syllabi: SyllabusBlueprint[];
  syllabusMCQs: any[];
  onlineUsers: any[];
  isLoading: boolean;
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
  hasGivenFeedback: boolean;
  refreshDashboardData: () => Promise<void>;
}

export const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used within a DashboardProvider');
  return context;
};

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [rawCategories, setRawCategories] = useState<Category[]>([]);
  const [rawTopics, setRawTopics] = useState<Topic[]>([]);
  const [rawVideoClasses, setRawVideoClasses] = useState<VideoClass[]>([]);
  const [rawStudyMaterials, setRawStudyMaterials] = useState<StudyMaterial[]>([]);
  const [rawWeeklyTests, setRawWeeklyTests] = useState<WeeklyTest[]>([]);
  const [rawDailyTests, setRawDailyTests] = useState<DailyTest[]>([]);
  const [rawSyllabi, setRawSyllabi] = useState<SyllabusBlueprint[]>([]);
  const [rawSyllabusMCQs, setRawSyllabusMCQs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGivenFeedback, setHasGivenFeedback] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { 
      router.push('/auth/login'); 
      setIsLoading(false); 
      return; 
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // If we already have data and the user hasn't changed, don't re-fetch everything
      if (currentUser && user?.uid === currentUser.uid && userData) {
        setIsLoading(false);
        return;
      }

      if (currentUser) {
        setUser(currentUser);
        try {
          const [data, feedbackStatus] = await Promise.all([
            getDashboardData(currentUser.uid), 
            hasUserSubmittedFeedback(currentUser.uid)
          ]);
          
          if (!data.userData) { 
            await signOut(auth); 
            router.push('/auth/login'); 
            setIsLoading(false);
            return; 
          }
          
          setUserData(data.userData);
          setRawCategories(data.categories || []);
          setRawTopics(data.topics || []);
          setRawVideoClasses(data.videoClasses || []);
          setRawStudyMaterials(data.studyMaterials || []);
          setRawWeeklyTests(data.weeklyTests || []);
          setRawDailyTests(data.dailyTests || []);
          setRawSyllabi(data.syllabi || []);
          setRawSyllabusMCQs(data.syllabusMCQs || []);
          setNotifications(data.notifications || []);
          setHasGivenFeedback(feedbackStatus);
        } catch (error) { 
          console.error("Dashboard context init error:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setUserData(null);
        if (!pathname.startsWith('/auth') && pathname !== '/') {
          router.push('/auth/login');
        }
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user?.uid) {
      const heartbeat = async () => { 
        try { 
          const db = getFirebaseDb(); 
          if (db) await updateDoc(doc(db, 'users', user.uid), { lastSeen: serverTimestamp() }); 
        } catch (e) {} 
      };
      heartbeat();
      const id = setInterval(heartbeat, 600000); 
      return () => clearInterval(id);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (userData?.email && ADMIN_EMAILS.includes(userData.email)) {
      const fetch = async () => { 
        try { 
          const users = await fetchOnlineUsers(); 
          setOnlineUsers(users); 
        } catch (e) {} 
      };
      fetch();
      const id = setInterval(fetch, 300000); 
      return () => clearInterval(id);
    }
  }, [userData?.email]);

  const refreshDashboardData = async () => {
    if (!user) return;
    try {
      const [data, feedbackStatus] = await Promise.all([
        getDashboardData(user.uid), 
        hasUserSubmittedFeedback(user.uid)
      ]);
      
      if (data.userData) {
        setUserData(data.userData);
        setRawCategories(data.categories || []);
        setRawTopics(data.topics || []);
        setRawVideoClasses(data.videoClasses || []);
        setRawStudyMaterials(data.studyMaterials || []);
        setRawWeeklyTests(data.weeklyTests || []);
        setRawDailyTests(data.dailyTests || []);
        setRawSyllabi(data.syllabi || []);
        setRawSyllabusMCQs(data.syllabusMCQs || []);
        setNotifications(data.notifications || []);
        setHasGivenFeedback(feedbackStatus);
      }
    } catch (e) {
      console.error("Manual refresh error:", e);
    }
  };

  const filteredContent = useMemo(() => {
    if (!userData) return { categories: [], topics: [], videoClasses: [], studyMaterials: [], syllabusMCQs: [], weeklyTests: [], dailyTests: [], syllabi: [] };
    
    const userCat = userData.examCategory;
    
    const filterFn = (item: any) => {
      // Admins see everything
      if (userData?.email && ADMIN_EMAILS.includes(userData.email)) return true;

      const itemCats = item.examCategories || [];
      
      // If user is IP or Group B, they see both categories
      if (userCat === 'IP' || userCat === 'GROUP B') {
        return itemCats.includes('IP') || itemCats.includes('GROUP B');
      }
      
      // Otherwise strict filtering
      return itemCats.includes(userCat);
    };

    const categories = rawCategories.filter(filterFn);
    const topics = rawTopics.filter(filterFn);
    const videoClasses = rawVideoClasses.filter(filterFn);
    const weeklyTests = rawWeeklyTests; // Allow all weekly tests, tabs will filter them
    const dailyTests = rawDailyTests;   // Allow all daily tests, tabs will filter them
    
    const syllabusMCQs = rawSyllabusMCQs;
    const studyMaterials = rawStudyMaterials;

    const filteredContent = { categories, topics, videoClasses, studyMaterials, syllabusMCQs, weeklyTests, dailyTests, syllabi: rawSyllabi };
    return filteredContent;
  }, [userData?.examCategory, rawCategories, rawTopics, rawVideoClasses, rawStudyMaterials, rawWeeklyTests, rawDailyTests, rawSyllabi, rawSyllabusMCQs]);

  const contextValue = useMemo(() => ({ 
    user, 
    userData, 
    ...filteredContent,
    notifications, 
    onlineUsers, 
    isLoading, 
    setUserData, 
    hasGivenFeedback,
    refreshDashboardData
  }), [user, userData, filteredContent, notifications, onlineUsers, isLoading, hasGivenFeedback, refreshDashboardData]);

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}
