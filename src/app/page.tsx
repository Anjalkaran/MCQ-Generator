
"use client";

import { MainHeader } from "@/components/main-header";
import { Wrench } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <MainHeader />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <Wrench className="h-16 w-16 text-primary" />
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Under Maintenance
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                We are currently performing scheduled maintenance. We should be back online shortly. Thank you for your patience!
              </p>
            </div>
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
