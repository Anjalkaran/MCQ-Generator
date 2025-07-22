
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BookCopy, FileText, TrendingUp, Trophy, BrainCircuit, HelpCircle } from 'lucide-react';
import { getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

const features = [
  {
    icon: <BrainCircuit className="h-8 w-8 text-primary" />,
    title: "Smartly Generated MCQs",
    description: "Generate unique, high-quality questions for any topic with our advanced system, tailored to different difficulty levels.",
    href: "/dashboard"
  },
  {
    icon: <FileText className="h-8 w-8 text-primary" />,
    title: "Realistic Mock Tests",
    description: "Simulate the real exam experience with full-length mock tests based on official blueprints or questions from previous years.",
    href: "/dashboard/mock-test"
  },
  {
    icon: <BookCopy className="h-8 w-8 text-primary" />,
    title: "Topic-wise Practice",
    description: "Create a custom exam by selecting a specific topic, difficulty, and number of questions. Ideal for focused practice.",
    href: "/dashboard/topic-wise-mcq"
  },
  {
    icon: <TrendingUp className="h-8 w-8 text-primary" />,
    title: "Performance Analysis",
    description: "Track your progress with detailed, topic-wise performance analysis to identify your strengths and areas for improvement.",
    href: "/dashboard/performance"
  },
  {
    icon: <Trophy className="h-8 w-8 text-primary" />,
    title: "Competitive Leaderboard",
    description: "See how you measure up against other users with separate leaderboards for topic quizzes and mock tests.",
    href: "/dashboard/leaderboard"
  },
  {
    icon: <HelpCircle className="h-8 w-8 text-primary" />,
    title: "Ask Your Doubt",
    description: "Get instant, material-based answers from our AI tutor to clarify your doubts on any topic, ensuring you're always prepared.",
    href: "/dashboard/q-and-a"
  }
];

export function FeatureCards() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
        setLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getHref = (defaultHref: string) => {
    if (loading) return "#"; // Prevent navigation while checking auth state
    return user ? defaultHref : "/auth/login";
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => (
        <Link href={getHref(feature.href)} key={feature.title} className="flex" aria-disabled={loading}>
          <Card className="flex flex-col text-center items-center p-6 hover:shadow-lg transition-shadow w-full">
            <div className="mb-4 bg-primary/10 p-3 rounded-full">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground flex-grow">
              {feature.description}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
