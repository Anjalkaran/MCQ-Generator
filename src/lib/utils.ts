
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeDate(date: any): Date | null {
  if (!date) {
    return null;
  }
  // If it's already a Date object, return it.
  if (date instanceof Date) {
    return date;
  }
  // If it's a Firestore Timestamp, convert it.
  if (typeof date.toDate === 'function') {
    return date.toDate();
  }
  // If it's a string, try parsing it.
  if (typeof date === 'string') {
    // Attempt to parse dd/MM/yyyy format
    const parts = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (parts) {
      // parts[1] is day, parts[2] is month, parts[3] is year
      const isoDate = `${parts[3]}-${parts[2]}-${parts[1]}T00:00:00.000Z`;
      const parsed = new Date(isoDate);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // Fallback for ISO strings or other standard formats
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  // If it's a number (milliseconds), convert it.
  if (typeof date === 'number') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }
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
