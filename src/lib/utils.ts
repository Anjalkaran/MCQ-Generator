
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeDate(date: any): Date | null {
  if (!date) return null;

  // 1. If it's already a valid Date object
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date;
  }

  // 2. If it's a Firestore Timestamp (via .toDate() check)
  if (typeof date.toDate === 'function') {
    return date.toDate();
  }

  // 3. If it's a Firestore Timestamp object structure
  if (typeof date === 'object' && 'seconds' in date) {
    const seconds = Number(date.seconds);
    if (!isNaN(seconds)) {
      return new Date(seconds * 1000);
    }
  }

  // 4. If it's a string
  if (typeof date === 'string') {
    // try dd/MM/yyyy format first
    const parts = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (parts) {
      const isoDate = `${parts[3]}-${parts[2]}-${parts[1]}T00:00:00.000Z`;
      const d = new Date(isoDate);
      if (!isNaN(d.getTime())) return d;
    }
    
    // standard date string
    const d = new Date(date);
    if (!isNaN(d.getTime())) return d;
  }

  // 5. If it's a number (milliseconds)
  if (typeof date === 'number') {
    const d = new Date(date);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
