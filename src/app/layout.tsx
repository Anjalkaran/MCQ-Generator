import type {Metadata} from 'next';
import {Inter} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({subsets: ['latin'], variable: '--font-sans'});

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
      <body className={`${inter.variable} font-sans antialiased h-full select-none`} suppressHydrationWarning>
        {children}
        <Toaster />
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('contextmenu', e => e.preventDefault());
          document.addEventListener('keydown', e => {
            // Disable Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+S, Ctrl+Shift+I/J/C
            const key = e.key.toLowerCase();
            const cmdOrCtrl = e.ctrlKey || e.metaKey;
            
            if (cmdOrCtrl && (key === 'c' || key === 'v' || key === 'u' || key === 's' || key === 'p')) {
              e.preventDefault();
            }
            if (cmdOrCtrl && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) {
              e.preventDefault();
            }
            if (e.key === 'F12') {
              e.preventDefault();
            }
          });
        ` }} />
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { display: none !important; }
          }
          * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
          }
          input, textarea {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
          }
        ` }} />
      </body>
    </html>
  );
}
