
"use client";

import { useDashboard } from "@/context/dashboard-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, PenSquare, Video, BrainCircuit, Library, Shield, GraduationCap, ChevronRight, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ADMIN_EMAILS } from "@/lib/constants";
import { updateDoc, doc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { user, userData, isLoading, setUserData } = useDashboard();
  const { toast } = useToast();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You must be logged in to access this page.</p>
        </CardContent>
      </Card>
    );
  }
  
  const isAdmin = userData.email ? ADMIN_EMAILS.includes(userData.email) : false;

  const handleCourseSelect = async (category: string) => {
    if (!userData?.uid) return;
    
    // If it's already the active course, just enter
    if (userData.examCategory === category) {
      router.push(`/dashboard/courses/${category}`);
      return;
    }

    // Update local state first for immediate UI feedback
    setUserData(prev => prev ? ({ ...prev, examCategory: category as any }) : null);

    try {
      const db = getFirebaseDb();
      if (db) {
        await updateDoc(doc(db, 'users', userData.uid), {
          examCategory: category
        });
        toast({
          title: "Course Selected",
          description: `You are now viewing ${category} content.`,
        });
        // Redirect to course page
        router.push(`/dashboard/courses/${category}`);
      }
    } catch (error: any) {
      toast({
        title: "Selection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Define available courses based on registration/grouping
  const subCat = userData.examCategory || 'MTS';
  const isProfessionalGroup = subCat === 'IP' || subCat === 'GROUP B';
  const isGeneralGroup = subCat === 'MTS' || subCat === 'POSTMAN' || subCat === 'PA';
  
  const availableCourses = [
    { 
      id: 'MTS', 
      title: 'MTS', 
      subtitle: 'Multi Tasking Staff',
      description: 'Foundational study materials and practice tests for MTS aspirants.',
      icon: <BrainCircuit className="h-10 w-10" />,
      color: 'from-blue-500/20 to-cyan-500/20',
      textColor: 'text-blue-600',
      allowed: isGeneralGroup
    },
    { 
      id: 'POSTMAN', 
      title: 'Postman', 
      subtitle: 'Mail Guard',
      description: 'Comprehensive coverage for Postman and Mail Guard examinations.',
      icon: <PenSquare className="h-10 w-10" />,
      color: 'from-orange-500/20 to-red-500/20',
      textColor: 'text-orange-600',
      allowed: isGeneralGroup
    },
    { 
      id: 'PA', 
      title: 'PA / SA', 
      subtitle: 'Postal Assistant',
      description: 'Advanced materials for Postal and Sorting Assistant exams.',
      icon: <Library className="h-10 w-10" />,
      color: 'from-red-500/20 to-rose-500/20',
      textColor: 'text-red-600',
      allowed: isGeneralGroup
    },
    { 
      id: 'IP', 
      title: 'IP', 
      subtitle: 'Inspector Post',
      description: 'Elite preparation track for the Inspector Post examination.',
      icon: <Shield className="h-10 w-10" />,
      color: 'from-red-700/20 to-rose-700/20',
      textColor: 'text-red-800',
      allowed: isProfessionalGroup
    },
    { 
      id: 'GROUP B', 
      title: 'PS Group B', 
      subtitle: 'Postal Service Group B',
      description: 'Comprehensive preparation for the Gazetted Group B competitive examination.',
      icon: <GraduationCap className="h-10 w-10" />,
      color: 'from-purple-500/20 to-indigo-500/20',
      textColor: 'text-purple-700',
      allowed: isProfessionalGroup
    },
  ].filter(course => course.allowed || isAdmin);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-4 text-center py-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Welcome back, <span className="text-red-600">{userData.name}</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          Choose your course to continue your preparation and access your study materials.
        </p>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const q = formData.get('search')?.toString();
            if (q?.trim()) {
              router.push(`/dashboard/search?q=${encodeURIComponent(q.trim())}`);
            }
          }}
          className="relative max-w-2xl mx-auto mt-6 group"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-red-600 transition-colors" />
          <input
            type="text"
            name="search"
            placeholder="Search topics, MCQs, or study guides..."
            className="w-full pl-12 pr-24 h-14 bg-white border border-slate-200 rounded-2xl shadow-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all text-base font-medium text-slate-900"
          />
          <Button 
            type="submit" 
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-bold px-6 shadow-sm"
          >
            Search
          </Button>
        </form>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {availableCourses.map((course) => (
          <Card 
            key={course.id}
            onClick={() => handleCourseSelect(course.id)}
            className={`group relative flex flex-col overflow-hidden border-slate-200 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 max-w-[280px] w-full mx-auto ${
              userData.examCategory === course.id ? 'ring-2 ring-red-600 shadow-xl' : ''
            }`}
          >
            {userData.examCategory === course.id && (
              <div className="absolute top-0 right-0 bg-red-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg z-10">
                ACTIVE
              </div>
            )}


            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold">{course.title}</CardTitle>
                <CardDescription className="font-semibold text-slate-600">{course.subtitle}</CardDescription>
              </div>
            </CardHeader>

            <div className="p-6 pt-0 mt-auto">
              <Button 
                variant={userData.examCategory === course.id ? "default" : "outline"}
                className={`w-full font-bold h-11 ${
                  userData.examCategory === course.id 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'group-hover:bg-slate-50'
                }`}
              >
                {userData.examCategory === course.id ? 'Enter Course' : 'Select Course'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
