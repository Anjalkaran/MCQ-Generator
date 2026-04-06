'use client';

import { useEffect } from 'react';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-sans' });

export default function GlobalErrorLayout({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root Layout Error caught:', error);
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className={`${outfit.variable} font-sans antialiased h-full`} suppressHydrationWarning>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-red-50 rounded-full text-red-600">
                <div className="h-12 w-12 flex items-center justify-center text-3xl font-bold">!</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">Application Error</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                A critical error occurred in the root of the application.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => reset()} 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 rounded-xl"
              >
                Try again
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400">
                Error Digest: {error.digest || 'N/A'}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
