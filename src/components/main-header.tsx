"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function MainHeader() {
  return (
    <header className="px-4 lg:px-6 h-16 flex items-center bg-card shadow-sm">
      <Link href="/" className="flex items-center justify-center">
        <Logo className="h-8 w-8 text-primary" />
        <span className="ml-2 text-xl font-bold font-headline">Anjalkaran MCQ Generator</span>
      </Link>
      <nav className="ml-auto flex gap-2 sm:gap-4 items-center">
        <Button variant="ghost" asChild>
          <Link href="/auth/login">Login</Link>
        </Button>
        <Button asChild>
          <Link href="/auth/register">Register</Link>
        </Button>
      </nav>
    </header>
  );
}
