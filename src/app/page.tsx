
import { MainHeader } from "@/components/main-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FeatureCards } from "@/components/home/feature-cards";

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
            <FeatureCards />
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-background">
        <p className="text-xs text-muted-foreground">
          &copy; 2025 Anjalkaran. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
