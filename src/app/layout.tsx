import type {Metadata} from 'next';
import {Inter} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({subsets: ['latin'], variable: '--font-sans'});

const siteUrl = "https://anjalkaran.in";
const siteTitle = "Anjalkaran";
const siteDescription = "Generate and take MCQ tests with the Anjalkaran MCQ Test app.";
const siteImage = `${siteUrl}/logo.png`;

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    type: "website",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: siteImage,
        width: 1200,
        height: 630,
        alt: "Anjalkaran Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [siteImage],
  },
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
