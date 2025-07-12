import { MainHeader } from "@/components/main-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import Link from "next/link";

export default function Home() {

  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 flex justify-center">
            <Card className="w-full max-w-lg shadow-lg text-center">
              <CardHeader>
                  <div className="flex justify-center mb-4">
                    <Logo className="h-20 w-20 text-primary" />
                  </div>
                <CardTitle className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                  Welcome to Anjalkaran MCQ Generator
                </CardTitle>
                <CardDescription className="mx-auto max-w-[700px] text-muted-foreground md:text-xl pt-2">
                  The best place to generate and take quizzes on any topic.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <Button asChild size="lg">
                    <Link href="/auth/register">
                      Get Started
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Anjalkaran MCQ Generator. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
