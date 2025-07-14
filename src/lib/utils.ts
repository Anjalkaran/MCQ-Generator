
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeDate(date: any): Date | null {
  if (!date) {
    return null;
  }
  if (date instanceof Date) {
    return date;
  }
  if (typeof date.toDate === 'function') {
    return date.toDate();
  }
  try {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (e) {
    return null;
  }
  return null;
}
