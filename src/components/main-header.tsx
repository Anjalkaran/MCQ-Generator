"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MainHeader() {
  return (
    <header className="px-6 lg:px-10 h-20 flex items-center bg-card/80 backdrop-blur-md border-b sticky top-0 z-50">
      <Link href="/" className="flex items-center justify-center transition-transform hover:scale-105">
        <Logo className="h-10 w-auto" height={48} />
      </Link>
      
      {/* Desktop Navigation */}
      <nav className="ml-auto hidden md:flex gap-4 items-center">
        <Button variant="ghost" className="text-sm font-medium hover:text-primary transition-colors" asChild>
          <Link href="/support">Contact Us</Link>
        </Button>
        <Button variant="ghost" className="text-sm font-medium hover:text-primary transition-colors" asChild>
          <Link href="/auth/login">Login</Link>
        </Button>
        <Button className="text-sm font-medium shadow-lg hover:shadow-xl transition-all" asChild>
          <Link href="/auth/register">Register Now</Link>
        </Button>
      </nav>

      {/* Mobile Navigation */}
      <div className="ml-auto md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-primary/10">
              <Menu className="h-6 w-6 text-primary" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 border-l">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Access different sections of the Anjalkaran platform.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col h-full bg-background">
              <div className="p-6 border-b">
                <Logo height={40} />
              </div>
              <div className="flex flex-col gap-4 p-6 mt-4">
                <Button variant="outline" className="justify-start text-base" asChild>
                  <Link href="/support">Contact Us</Link>
                </Button>
                <Button variant="outline" className="justify-start text-base" asChild>
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button className="justify-start text-base shadow-md" asChild>
                  <Link href="/auth/register">Register Now</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
