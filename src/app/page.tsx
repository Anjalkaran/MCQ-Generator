
import { MainHeader } from "@/components/main-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { BookCopy, FileText, TrendingUp, Trophy, BrainCircuit } from 'lucide-react';

const features = [
  {
    icon: <BrainCircuit className="h-8 w-8 text-primary" />,
    title: "Smartly Generated Quizzes",
    description: "Generate unique, high-quality questions for any topic with our advanced system, tailored to different difficulty levels.",
  },
  {
    icon: <FileText className="h-8 w-8 text-primary" />,
    title: "Realistic Mock Tests",
    description: "Simulate the real exam experience with full-length mock tests based on official blueprints or questions from previous years.",
  },
  {
    icon: <TrendingUp className="h-8 w-8 text-primary" />,
    title: "Performance Analysis",
    description: "Track your progress with detailed, topic-wise performance analysis to identify your strengths and areas for improvement.",
  },
  {
    icon: <Trophy className="h-8 w-8 text-primary" />,
    title: "Competitive Leaderboard",
    description: "See how you measure up against other users with separate leaderboards for topic quizzes and mock tests.",
  },
];


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <MainHeader />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Your Ultimate Postal Exam Prep Tool
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Elevate your preparation with smartly generated quizzes, realistic mock tests, and detailed performance tracking.
              </p>
              <Button asChild size="lg">
                <Link href="/auth/login">
                  Start Practicing Now
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="w-full pb-12 md:pb-24 lg:pb-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card key={feature.title} className="flex flex-col text-center items-center p-6">
                  <div className="mb-4 bg-primary/10 p-3 rounded-full">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-background">
        <p className="text-xs text-muted-foreground">
          2025 Anjalkaran. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
