
"use client";

import { MainHeader } from "@/components/main-header";
import { FeatureCards } from "@/components/home/feature-cards";
import { PricingCards } from "@/components/home/pricing-cards";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Wrench } from "lucide-react";


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <MainHeader />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Master Your Postal Exams
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Your one-stop solution for MTS, Postman, and PA exam preparation.
                Practice with AI-generated MCQs, take realistic mock tests, and
                track your performance.
              </p>
              <Button asChild>
                  <Link href="/auth/login">Get Started</Link>
              </Button>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
             <div className="flex flex-col items-center space-y-4 text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Features</h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                    Everything you need to ace the exam.
                </p>
            </div>
            <FeatureCards language="en" />
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-background">
        <p className="text-xs text-muted-foreground">
          © 2024 Anjalkaran. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
