'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-red-50 rounded-full text-red-600">
            <AlertCircle size={48} />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            The application encountered an unexpected error. This has been logged and we'll look into it.
          </p>
        </div>

        {error.message && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left">
            <p className="text-xs font-mono text-slate-600 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => reset()} 
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 rounded-xl"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            className="w-full h-12 rounded-xl font-medium"
          >
            Go to Home
          </Button>
        </div>
        
        <p className="text-[10px] text-slate-400">
            Error Digest: {error.digest || 'N/A'}
        </p>
      </div>
    </div>
  );
}
