import type {Metadata} from 'next';
import {Inter} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({subsets: ['latin'], variable: '--font-sans'});

const siteUrl = "https://anjalkaran.in";
const siteTitle = "Anjalkaran: Postal Exam Courses for MTS, Postman, PA & IP";
const siteDescription = "Ace your postal exams! Get expert online courses for MTS, Postman, Postal Assistant (PA), and Inspector of Posts (IP) on the Anjalkaran app. Start learning today!";
const siteImage = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300"><path d="M239.9,28.8l-87.3,77.3c-2.3,2-5.4,3.2-8.6,3.2s-6.3-1.2-8.6-3.2L48.1,28.8L28.8,48.1l77.3,87.3 c2,2.3,3.2,5.4,3.2,8.6s-1.2,6.3-3.2,8.6l-77.3,87.3l19.3,19.3l87.3-77.3c4.6-4.6,12.6-4.6,17.2,0l87.3,77.3l19.3-19.3 l-77.3-87.3c-2-2.3-3.2-5.4-3.2-8.6s1.2-6.3,3.2-8.6l77.3-87.3L239.9,28.8z" fill="%23D62927"/><path d="M109.9,190.1c-15.1-17.2-14-43.2,2.3-58.3c10.1-9.2,24-11.5,36.5-6.9c-3.2-12.6-2.3-26.4,6.9-36.5 c16.1-17.2,42.1-18.3,58.3-2.3c-2.3-1.5-5.4-2.3-8.6-2.3c-15.1,0-28.5,8.1-35.4,20.5c-11.5,20.5-2.3,46.8,18.3,58.3 c-2.3,1.2-4.6,2.3-6.9,3.4C161.7,212.7,133.7,212.7,109.9,190.1z" fill="%23FFC700"/><path d="M109.9,233.7c-15.1-17.2-14-43.2,2.3-58.3c10.1-9.2,24-11.5,36.5-6.9c-3.2-12.6-2.3-26.4,6.9-36.5 c16.1-17.2,42.1-18.3,58.3-2.3c-2.3-1.5-5.4-2.3-8.6-2.3c-15.1,0-28.5,8.1-35.4,20.5c-11.5,20.5-2.3,46.8,18.3,58.3 c-2.3,1.2-4.6,2.3-6.9,3.4C161.7,256.3,133.7,256.3,109.9,233.7z" fill="%23FFC700"/></svg>`
)}`;

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
