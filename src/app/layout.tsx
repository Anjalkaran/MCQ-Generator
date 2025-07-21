import type {Metadata} from 'next';
import {Inter} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({subsets: ['latin'], variable: '--font-sans'});

export const metadata: Metadata = {
  title: 'Anjalkaran Quiz Generator - AI-Powered Quizzes',
  description: 'Generate and take quizzes on any topic with the Anjalkaran Quiz Generator.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
       <head />
      <body className={`${inter.variable} font-sans antialiased h-full`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
