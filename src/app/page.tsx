
"use client";

import { MainHeader } from "@/components/main-header";
import { FeatureCards } from "@/components/home/feature-cards";
import { PricingCards } from "@/components/home/pricing-cards";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { SlideUp, FadeIn } from "@/components/animations/motion-wrapper";
import { GovernmentDisclaimer } from "@/components/government-disclaimer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40 overflow-x-hidden">
      <MainHeader />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 relative overflow-hidden">
          {/* Background Decorative Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500/5 rounded-full blur-3xl animate-pulse delay-700" />
          </div>

          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <SlideUp duration={0.8}>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-2">
                  Master Your Postal Exams
                </h1>
              </SlideUp>
              
              <FadeIn delay={0.3} duration={0.8}>
                <p className="mx-auto max-w-[800px] text-slate-500 md:text-xl lg:text-2xl leading-relaxed">
                  The ultimate preparation platform for <span className="text-red-600 font-bold">MTS, Postman, PA & IP</span> exams.
                  Practice with high-quality MCQs, realistic mock tests, and smart performance tracking.
                </p>
              </FadeIn>

              <FadeIn delay={0.6} duration={0.8}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="h-14 px-8 text-lg font-bold bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/20 transition-all active:scale-[0.98]">
                      <Link href="/auth/login">Get Started Free</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg font-bold border-2 hover:bg-slate-50 transition-all active:scale-[0.98]">
                      <Link href="#features">Explore Features</Link>
                  </Button>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
        <section id="features" className="w-full py-16 md:py-24 lg:py-32 bg-white relative">
          <div className="container px-4 md:px-6">
             <div className="flex flex-col items-center space-y-4 text-center mb-16">
                <SlideUp>
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-slate-900">
                    Why Choose <span className="text-red-600">Anjalkaran</span>?
                  </h2>
                </SlideUp>
                <FadeIn delay={0.2}>
                  <p className="mx-auto max-w-[700px] text-slate-500 md:text-lg lg:text-xl">
                      We've built the most comprehensive toolset to ensure your success in the Indian Postal Department examinations.
                  </p>
                </FadeIn>
            </div>
            <FeatureCards language="en" />
          </div>
        </section>
      </main>
      <footer className="py-12 w-full border-t bg-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2 sm:flex-row items-center justify-between">
              <p className="text-xs text-muted-foreground">
                © 2024 Anjalkaran. All rights reserved.
              </p>
              <div className="flex gap-4">
                <Link href="#" className="text-xs text-muted-foreground hover:underline">Terms of Service</Link>
                <Link href="#" className="text-xs text-muted-foreground hover:underline">Privacy Policy</Link>
              </div>
            </div>
            <GovernmentDisclaimer />
          </div>
        </div>
      </footer>
    </div>
  );
}


