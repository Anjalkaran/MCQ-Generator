
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, 
  ShieldCheck, 
  BookOpen, 
  Video, 
  TrendingUp, 
  History, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ExternalLink,
  ArrowRight
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { cn } from "@/lib/utils";
import type { UserData, QnAUsage, Topic, VideoClass, StudyMaterial, BankedQuestion } from "@/lib/types";

interface AdminOverviewProps {
  users: UserData[];
  qnaUsage: QnAUsage[];
  topics: Topic[];
  videos: VideoClass[];
  materials: StudyMaterial[];
  bankedQuestions: BankedQuestion[];
  onNavigate: (section: string) => void;
}

export function AdminOverview({ 
  users, 
  qnaUsage, 
  topics, 
  videos, 
  materials, 
  bankedQuestions,
  onNavigate 
}: AdminOverviewProps) {
  
  // Calculations
  const stats = [
    { label: 'Total Students', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12%' },
    { label: 'Pro Members', value: users.filter(u => u.isPro).length, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+5%' },
    { label: 'Total Topics', value: topics.length, icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-50', trend: 'Content' },
    { label: 'Question Bank', value: bankedQuestions.length, icon: CheckCircle2, color: 'text-purple-600', bg: 'bg-purple-50', trend: 'Verified' },
  ];

  const mainCategories = [
    { 
      id: 'users',
      title: 'People Management', 
      desc: 'Verify subscriptions, track progress and view leaderboards.', 
      icon: Users,
      color: 'blue',
      items: [
        { label: 'User Directory', value: 'users' },
        { label: 'Live Leaderboards', value: 'leaderboard' },
        { label: 'Student Feedback', value: 'feedback' }
      ]
    },
    { 
       id: 'topics',
       title: 'Content Hub', 
       desc: 'Add and organize topics, videos, and study notes.', 
       icon: Video,
       color: 'orange',
        items: [
          { label: 'Syllabus wise test', value: 'syllabi' },
          { label: 'Syllabus Point Management', value: 'syllabus-points' },
          { label: 'Topic Repository', value: 'topics' },
          { label: 'Video Lecture Bank', value: 'video-classes' },
          { label: 'Study Portfolios', value: 'study-material' },
          { label: 'Review Reports', value: 'reports' }
        ]
    },
    { 
       id: 'weekly-tests',
       title: 'Assessments', 
       desc: 'Manage tests, question banks and exam schedules.', 
       icon: CheckCircle2,
       color: 'emerald',
       items: [
         { label: 'MCQ Bank', value: 'topic-mcq' },
         { label: 'Weekly Live Tests', value: 'weekly-tests' },
         { label: 'Daily Practice', value: 'daily-tests' },
         { label: 'Custom Question Bank', value: 'question-bank' },
         { label: 'Reasoning Modules', value: 'reasoning-bank' }
       ]
    },

  ];

  // Dummy data for charts (would be replaced by actual metrics)
  const chartData = [
    { name: 'Mon', count: 12 },
    { name: 'Tue', count: 18 },
    { name: 'Wed', count: 25 },
    { name: 'Thu', count: 32 },
    { name: 'Fri', count: 28 },
    { name: 'Sat', count: 45 },
    { name: 'Sun', count: 60 }
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Hero Section Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden relative">
            <div className={cn("absolute top-0 right-0 h-24 w-24 rounded-full opacity-5 -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-150", stat.bg)} />
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-2xl", stat.bg)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", 
                  stat.trend.includes('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                )}>
                  {stat.trend}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">{stat.value.toLocaleString()}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Platform Engagement</CardTitle>
              <CardDescription>Visualizing student activity over the last 7 days.</CardDescription>
            </div>
            <div className="bg-slate-100 p-1 rounded-md flex gap-1">
              <button className="px-3 py-1 bg-white text-xs font-semibold rounded-sm shadow-sm">Daily</button>
              <button className="px-3 py-1 text-slate-500 text-xs font-semibold rounded-sm">Weekly</button>
            </div>
          </CardHeader>
          <CardContent>
             <div className="h-[280px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>

        {/* Quick Insights / System Health */}
        <Card className="border-none shadow-sm bg-slate-900 text-white">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-red-500" />
              Pulse Report
            </CardTitle>
            <CardDescription className="text-slate-400">Real-time status markers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium">Database Latency</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">Normal (45ms)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium">Auth Provider</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">Stable</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 text-red-400 border border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-sm font-medium italic">Pending Reports</span>
                </div>
                <span className="text-xs font-bold font-mono">HIGH PRIORITY</span>
              </div>
            </div>

            <button 
              onClick={() => onNavigate('reports')}
              className="w-full mt-4 flex items-center justify-between p-4 rounded-2xl bg-red-600 hover:bg-red-700 transition-colors group cursor-pointer"
            >
              <div className="text-left font-bold tracking-tight">
                <p className="text-[10px] uppercase opacity-70">Review Task</p>
                <p className="text-sm">Triage Question Reports</p>
              </div>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Main Navigation Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mainCategories.map((cat) => (cat.id && (
          <div key={cat.title} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className={cn("p-1.5 rounded-lg", 
                cat.color === 'blue' ? 'bg-blue-100 text-blue-600' : 
                cat.color === 'orange' ? 'bg-orange-100 text-orange-600' : 
                'bg-emerald-100 text-emerald-600'
              )}>
                <cat.icon className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-slate-900 tracking-tight">{cat.title}</h3>
            </div>
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-2">
                <div className="grid gap-1">
                  {cat.items.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => onNavigate(item.value)}
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 text-left transition-colors group w-full"
                    >
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 group-hover:pl-1 transition-all">{item.label}</span>
                      <ExternalLink className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
            <p className="text-[11px] text-slate-400 px-2 leading-relaxed">{cat.desc}</p>
          </div>
        )))}
      </div>

      {/* Footer System Log */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-6">
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="h-4 w-4" />
          <span className="text-xs">Last platform refresh: Just now</span>
        </div>
        <div className="flex gap-4">
           {/* Online counter could go here */}
        </div>
      </div>
    </div>
  );
}
