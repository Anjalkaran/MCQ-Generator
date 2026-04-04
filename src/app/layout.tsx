import type {Metadata} from 'next';
import {Outfit} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const outfit = Outfit({subsets: ['latin'], variable: '--font-sans'});

const siteUrl = "https://anjalkaran.in";
const siteTitle = "Anjalkaran: Postal Exam Courses for MTS, Postman, PA & IP";
const siteDescription = "Ace your postal exams! Get expert online courses for MTS, Postman, Postal Assistant (PA), and Inspector of Posts (IP) on the Anjalkaran app. Start learning today!";
const siteImage = `${siteUrl}/images/logo.png`;

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/bird-icon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/bird-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: siteImage,
        width: 512,
        height: 512,
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteTitle,
  },
};

declare global {
  interface Window {
    workbox: any;
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${outfit.variable} font-sans antialiased h-full`} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
