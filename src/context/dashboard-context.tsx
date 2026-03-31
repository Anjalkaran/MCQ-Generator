
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
import type { UserData, Category, Topic, VideoClass, StudyMaterial, WeeklyTest, DailyTest, Notification } from '@/lib/types';
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
  onlineUsers: any[];
  isLoading: boolean;
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
  hasGivenFeedback: boolean;
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
    
    return onAuthStateChanged(auth, async (currentUser) => {
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
  }, [router, pathname]);

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

  const filteredContent = useMemo(() => {
    if (!userData) return { categories: [], topics: [], videoClasses: [], studyMaterials: [], weeklyTests: [], dailyTests: [] };
    
    const userCat = userData.examCategory;
    
    const filterFn = (item: any) => {
      const itemCats = item.examCategories || [];
      const hasIP = itemCats.includes('IP');
      
      if (hasIP) {
        // IP content is only for IP users
        return userCat === 'IP';
      }
      // Non-IP content is for everyone ("enable all courses for all")
      return true;
    };

    const categories = rawCategories.filter(filterFn);
    const topics = rawTopics.filter(filterFn);
    const videoClasses = rawVideoClasses.filter(filterFn);
    const weeklyTests = rawWeeklyTests.filter(filterFn);
    const dailyTests = rawDailyTests.filter(filterFn);
    
    const activeTopicIds = new Set(topics.map(t => t.id));
    const studyMaterials = rawStudyMaterials.filter(m => activeTopicIds.has(m.topicId));

    return { categories, topics, videoClasses, studyMaterials, weeklyTests, dailyTests };
  }, [userData?.examCategory, rawCategories, rawTopics, rawVideoClasses, rawStudyMaterials, rawWeeklyTests, rawDailyTests]);

  const contextValue = useMemo(() => ({ 
    user, 
    userData, 
    ...filteredContent,
    notifications, 
    onlineUsers, 
    isLoading, 
    setUserData, 
    hasGivenFeedback 
  }), [user, userData, filteredContent, notifications, onlineUsers, isLoading, hasGivenFeedback]);

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}
