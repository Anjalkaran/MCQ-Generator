'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/context/dashboard-context';
import { getUserPlanner, saveUserPlanner, updatePlannerDay, deleteUserPlanner, getUserData } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import { ADMIN_EMAILS } from '@/lib/constants';
import { generatePlanner, calculatePlannerProgress, DEFAULT_DURATIONS } from '@/lib/planner-generator';
import { UserPlanner, PlannerDay, UserData } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Settings, 
  Plus, 
  Trash2,
  BookOpen,
  Layout,
  Target,
  Sparkles,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

export default function StudyPlannerPage() {
  const router = useRouter();
  const { user, syllabi } = useDashboard();
  const [planner, setPlanner] = useState<UserPlanner | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  const dynamicBlueprints = React.useMemo(() => {
    const map: Record<string, any> = {};
    syllabi.forEach(s => { if (s.id) map[s.id] = s; });
    return map;
  }, [syllabi]);
  
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [existingPlanner, uData] = await Promise.all([
        getUserPlanner(user.uid),
        getUserData(user.uid)
      ]);
      
      // Removed isAdmin restriction to make Study Planner available to all users

      console.log("Loaded planner:", existingPlanner);
      setPlanner(existingPlanner);
      setUserData(uData);
      if (existingPlanner) {
        setSelectedDay(existingPlanner.currentDay);
      }
    } catch (error) {
      console.error("Failed to load planner data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (planType: 'Fast Track' | 'Standard Preparation' | 'Comprehensive Mastery') => {
    if (!user || !userData) return;
    setLoading(true);
    try {
      const currentCategory = userData?.examCategory || 'MTS';
      const newPlanner = generatePlanner(user.uid, currentCategory, planType, dynamicBlueprints);
      await saveUserPlanner(user.uid, newPlanner);
      setPlanner(newPlanner);
      setSelectedDay(1);
      setPendingPlan(null);
    } catch (error) {
      console.error("Failed to create plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (dayNumber: number, taskId: string, type: 'topic' | 'custom') => {
    if (!user || !planner) return;

    const updatedDays = planner.days.map(day => {
      if (day.dayNumber === dayNumber) {
        if (type === 'topic') {
          return {
            ...day,
            topics: day.topics.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
          };
        } else {
          return {
            ...day,
            customTasks: day.customTasks?.map(ct => ct.id === taskId ? { ...ct, completed: !ct.completed } : ct)
          };
        }
      }
      return day;
    });

    const updatedPlanner = { ...planner, days: updatedDays };
    setPlanner(updatedPlanner);
    
    // Optimistic update, but save to firestore
    const targetDay = updatedDays.find(d => d.dayNumber === dayNumber);
    if (targetDay) {
      await updatePlannerDay(user.uid, dayNumber, targetDay);
    }
  };

  // Removed handleDeletePlanner since we switch plans instead

  const addCustomTask = async (dayNumber: number, title: string) => {
    if (!user || !planner || !title.trim()) return;
    
    const newTask = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      completed: false
    };

    const updatedDays = planner.days.map(day => {
      if (day.dayNumber === dayNumber) {
        return {
          ...day,
          customTasks: [...(day.customTasks || []), newTask]
        };
      }
      return day;
    });

    setPlanner({ ...planner, days: updatedDays });
    const targetDay = updatedDays.find(d => d.dayNumber === dayNumber);
    if (targetDay) {
        await updatePlannerDay(user.uid, dayNumber, targetDay);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-red-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-red-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  const currentCategory = userData?.examCategory || 'MTS';
  const options = [
    { id: 'Fast Track', icon: Clock, desc: `Complete everything in ${DEFAULT_DURATIONS[currentCategory].fast} days. Intense but fast.`, color: 'rose' },
    { id: 'Standard Preparation', icon: Target, desc: `Perfect ${DEFAULT_DURATIONS[currentCategory].standard} day balance of speed and depth.`, color: 'red' },
    { id: 'Comprehensive Mastery', icon: Sparkles, desc: `In-depth ${DEFAULT_DURATIONS[currentCategory].comprehensive} day coverage with extra revision.`, color: 'emerald' },
  ];

  const handlePlanClick = (planId: string) => {
    if (planner?.planType === planId) return;
    if (planner) {
      setPendingPlan(planId);
    } else {
      handleCreatePlan(planId as any);
    }
  };

  if (!planner) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 relative">
        <button 
          onClick={() => router.push('/dashboard')}
          className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors font-semibold"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full space-y-10 text-center"
        >
          <div className="space-y-4">
            <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-2xl shadow-red-200 dark:shadow-none">
              <Sparkles size={40} />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">Welcome, {userData?.name || 'Aspirant'}!</h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Your exam for <span className="text-red-600 dark:text-red-400 font-bold">{userData?.examCategory || 'MTS'}</span> awaits. 
              Let's build a scientific study plan tailored to your timeline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handlePlanClick(opt.id)}
                className="group p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-red-500 hover:shadow-2xl hover:shadow-red-100 dark:hover:shadow-none transition-all duration-500 text-left space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-14 h-14 rounded-2xl bg-${opt.color}-100 dark:bg-${opt.color}-900/30 flex items-center justify-center text-${opt.color}-600 dark:text-${opt.color}-400 group-hover:scale-110 transition-transform`}>
                    <opt.icon size={28} />
                  </div>
                  <div className={`px-4 py-1.5 rounded-full bg-${opt.color}-500/10 text-${opt.color}-600 dark:text-${opt.color}-400 text-sm font-black border border-${opt.color}-500/20 shadow-sm`}>
                    {opt.id === 'Fast Track' ? DEFAULT_DURATIONS[currentCategory].fast : 
                     opt.id === 'Standard Preparation' ? DEFAULT_DURATIONS[currentCategory].standard : 
                     DEFAULT_DURATIONS[currentCategory].comprehensive} DAYS
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">{opt.id}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{opt.desc}</p>
                </div>
                <div className="pt-4 flex items-center text-red-600 dark:text-red-400 font-bold text-sm">
                  Choose Plan <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 font-medium italic">
            * Plans are generated using the latest syllabus blueprints. You can add custom tasks later.
          </p>
        </motion.div>
      </div>
    );
  }

  const progress = planner ? calculatePlannerProgress(planner) : 0;
  const currentDayData = planner?.days.find(d => d.dayNumber === selectedDay);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-700">
      <button 
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors font-semibold"
      >
        <ArrowLeft size={20} />
        Back to Dashboard
      </button>

      {/* Header & Overall Progress */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 border border-slate-100 dark:border-slate-800">
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <Layout size={200} />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold uppercase tracking-wider text-xs">
              <Sparkles size={14} />
              Personalized Plan
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {planner?.examCategory} Study Journey
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {planner?.planType} • Day {planner?.currentDay} of {planner?.durationDays}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{progress}%</div>
                <div className="text-xs text-slate-500 uppercase font-medium">Overall Progress</div>
              </div>
              <div className="w-48 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-red-500 via-purple-500 to-pink-500 shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Plan Switch Modal */}
        {pendingPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-6"
            >
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600 mx-auto">
                <AlertCircle size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Switch Study Plan?</h3>
                <p className="text-slate-500 dark:text-slate-400">
                  You are about to switch to the <strong>{pendingPlan}</strong> plan. This will permanently overwrite your current progress and custom tasks.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setPendingPlan(null)}
                  className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleCreatePlan(pendingPlan as any)}
                  className="flex-1 px-6 py-4 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition-all"
                >
                  Yes, Switch Plan
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </div>

      {/* Plan Selection Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((opt) => {
          const isActive = planner?.planType === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handlePlanClick(opt.id)}
              className={`group p-6 rounded-3xl border-2 transition-all duration-300 text-left flex items-start gap-4 relative overflow-hidden
                ${isActive 
                  ? 'bg-red-50/50 dark:bg-red-900/20 border-red-500 shadow-md' 
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-red-300'}
              `}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform
                ${isActive ? `bg-red-500 text-white` : `bg-${opt.color}-100 dark:bg-${opt.color}-900/30 text-${opt.color}-600 dark:text-${opt.color}-400 group-hover:scale-110`}
              `}>
                <opt.icon size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-bold ${isActive ? 'text-red-900 dark:text-red-100' : 'text-slate-900 dark:text-white'}`}>
                    {opt.id}
                  </h3>
                  {isActive && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300 px-2 py-1 rounded-md">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {opt.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Day Selector Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-lg border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar size={18} className="text-red-500" />
                Schedule
              </h3>
              <div className="text-xs font-semibold px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                Week {Math.ceil(selectedDay / 7)}
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-6">
              {planner?.days.slice(Math.max(0, selectedDay - 4), Math.min(planner.days.length, selectedDay + 3)).map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => setSelectedDay(day.dayNumber)}
                  className={`
                    aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-300
                    ${selectedDay === day.dayNumber 
                      ? 'bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-none scale-110 z-10' 
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}
                  `}
                >
                    <span className="text-[10px] font-bold uppercase opacity-60">Day</span>
                    <span className="text-lg font-black">{day.dayNumber}</span>
                </button>
              ))}
            </div>

            <div className="hidden lg:block h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {planner?.days.map((day) => {
                const dayProgress = calculateDayProgress(day);
                return (
                  <button
                    key={day.dayNumber}
                    onClick={() => setSelectedDay(day.dayNumber)}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-2xl transition-all border-2 text-left
                      ${selectedDay === day.dayNumber 
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-500 shadow-sm' 
                        : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center font-bold
                      ${day.isRestDay ? 'bg-amber-100 text-amber-600' : 
                        dayProgress === 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}
                    `}>
                        {day.isRestDay ? 'R' : day.dayNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {day.isRestDay ? 'Rest & Revision' : `Daily Tasks (${day.topics.length})`}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full ${dayProgress === 100 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${dayProgress}%` }}></div>
                        </div>
                        <span className="font-bold">{dayProgress}%</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Focused Day Tasks */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDay}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 space-y-6"
            >
              {currentDayData?.isRestDay ? (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-3xl p-10 flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600">
                      <Clock size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-100">Sunday Rest & Revision</h2>
                    <p className="text-amber-700 dark:text-amber-400 max-w-md">
                      Great work reaching the end of the week! Today is for consolidating what you learned and taking a full-length mock test.
                    </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-red-100 dark:shadow-none">
                        {selectedDay}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Day {selectedDay} Priorities</h2>
                        <p className="text-slate-500 text-sm">{currentDayData?.topics.length} Primary Topics to study</p>
                      </div>
                    </div>
                    <div className="text-red-600 bg-red-50 dark:bg-red-900/30 px-4 py-2 rounded-xl text-sm font-bold">
                        {calculateDayProgress(currentDayData!)}% Done
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                    {/* Syllabus Topics */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <BookOpen size={14} />
                        Syllabus Topics
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentDayData?.topics.map((topic) => (
                          <button
                            key={topic.id}
                            onClick={() => handleToggleTask(selectedDay, topic.id, 'topic')}
                            className={`
                              flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group
                              ${topic.completed 
                                ? 'bg-slate-50 dark:bg-slate-800/50 border-emerald-500/20' 
                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-red-500'}
                            `}
                          >
                            <div className={`
                              flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center
                              ${topic.completed ? 'bg-emerald-500 text-white' : 'border-2 border-slate-200 dark:border-slate-700 text-transparent'}
                            `}>
                                <CheckCircle2 size={16} />
                            </div>
                            <span className={`text-sm font-semibold flex-1 ${topic.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                              {topic.name}
                            </span>
                            <ChevronRight size={16} className={`text-slate-300 group-hover:text-red-500 transition-colors ${topic.completed ? 'opacity-0' : ''}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Tasks */}
                    <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          <Plus size={14} />
                          Personal Tasks & Notes
                        </div>
                      </div>

                      <div className="space-y-3">
                        {currentDayData?.customTasks?.map((task) => (
                           <div
                            key={task.id}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-red-50/30 dark:bg-red-900/10 border-2 border-red-500/20"
                           >
                            <button 
                              onClick={() => handleToggleTask(selectedDay, task.id, 'custom')}
                              className={`
                                flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center
                                ${task.completed ? 'bg-red-500 text-white' : 'border-2 border-red-200 dark:border-red-700'}
                              `}
                            >
                                <CheckCircle2 size={16} />
                            </button>
                            <span className={`text-sm font-semibold flex-1 ${task.completed ? 'text-slate-400 line-through' : 'text-red-900 dark:text-red-100'}`}>
                              {task.title}
                            </span>
                           </div>
                        ))}
                        
                        <div className="relative">
                           <input 
                            type="text" 
                            placeholder="Add a person note or task for today..."
                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 rounded-2xl px-6 py-4 text-sm transition-all outline-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    addCustomTask(selectedDay, e.currentTarget.value);
                                    e.currentTarget.value = '';
                                }
                            }}
                           />
                           <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold uppercase">Enter to add</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Motivator Card */}
              <div className="bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
                <div className="absolute -bottom-10 -right-10 opacity-20 pointer-events-none">
                    <Target size={180} />
                </div>
                <div className="relative z-10 space-y-4">
                  <h4 className="text-xl font-bold flex items-center gap-2">
                    <AlertCircle className="text-red-400" size={20} />
                    Exam Countdown
                  </h4>
                  <p className="text-slate-400 text-sm max-w-lg">
                    Consistency is the key to cracking any recruitment exam. Stay dedicated to your {planner?.planType} schedule. Every topic completed is a step closer to your appointment letter.
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function calculateDayProgress(day: PlannerDay) {
  const total = day.topics.length + (day.customTasks?.length || 0);
  if (total === 0) return 0;
  const completed = day.topics.filter(t => t.completed).length + (day.customTasks?.filter(ct => ct.completed).length || 0);
  return Math.round((completed / total) * 100);
}

// Removed PlannerSetup function since it's merged into the main component
