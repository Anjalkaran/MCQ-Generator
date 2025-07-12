"use client";

import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MainHeader() {
  return (
    <header className="px-4 lg:px-6 h-16 flex items-center bg-card shadow-sm">
      <Link href="/" className="flex items-center justify-center">
        <BrainCircuit className="h-6 w-6 text-primary" />
        <span className="ml-2 text-xl font-bold font-headline">Anjalkaran MCQ Generator</span>
      </Link>
      <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </nav>
    </header>
  );
}
