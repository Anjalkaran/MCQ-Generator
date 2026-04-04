"use client";

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  targetDate: Date;
  label?: string;
  className?: string;
  onComplete?: () => void;
}

export function CountdownTimer({ targetDate, label, className, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setTimeLeft(null);
        if (onComplete) onComplete();
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (!timeLeft) return null;

  return (
    <div className={cn("flex flex-col items-center gap-2 p-6 rounded-3xl bg-white border border-slate-100 shadow-xl", className)}>
      {label && <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>}
      <div className="flex gap-4 items-center">
        <TimeUnit value={timeLeft.days} label="Days" />
        <TimeSeparator />
        <TimeUnit value={timeLeft.hours} label="Hours" />
        <TimeSeparator />
        <TimeUnit value={timeLeft.minutes} label="Mins" />
        <TimeSeparator />
        <TimeUnit value={timeLeft.seconds} label="Secs" />
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-2xl font-black text-red-600 bg-red-50 w-12 h-12 flex items-center justify-center rounded-xl border border-red-100">
        {value.toString().padStart(2, '0')}
      </div>
      <span className="text-[9px] font-bold uppercase text-slate-400 mt-1">{label}</span>
    </div>
  );
}

function TimeSeparator() {
  return <div className="text-xl font-black text-slate-200 mt-[-18px]">:</div>;
}
