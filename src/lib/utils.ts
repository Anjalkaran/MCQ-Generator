
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ADMIN_EMAILS } from "./constants"
import type { UserData } from "./types"

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

export function checkIsPro(userData: UserData | null, targetCategory?: string): boolean {
  if (!userData) return false;
  
  const adminEmail = userData.email;
  const isAdmin = adminEmail ? ADMIN_EMAILS.includes(adminEmail) : false;
  if (isAdmin) return true;

  const isProfessionalGroup = userData.examCategory === 'IP' || userData.examCategory === 'GROUP B';
  if (isProfessionalGroup) return true;

  const proValidUntilDate = normalizeDate(userData.proValidUntil);
  if (!userData.isPro || !proValidUntilDate || proValidUntilDate <= new Date()) {
    return false;
  }

  const subscribedCategory = userData.subscribedCategory || 'MTS';
  const currentCategory = targetCategory || userData.examCategory;

  if (subscribedCategory === 'PA') {
    // PA subscription has access to PA, POSTMAN, and MTS
    return ['PA', 'POSTMAN', 'MTS'].includes(currentCategory);
  }

  if (subscribedCategory === 'POSTMAN' || subscribedCategory === 'MTS') {
    // 99 subscription (either MTS or POSTMAN) has access to both POSTMAN and MTS
    return ['POSTMAN', 'MTS'].includes(currentCategory);
  }

  // Fallback / other professional groups
  if (subscribedCategory === 'IP' || subscribedCategory === 'GROUP B') {
    return true;
  }

  return subscribedCategory === currentCategory;
}

export function getAllowedExams(userData: UserData | null): string[] {
  if (!userData) return [];
  
  const adminEmail = userData.email;
  const isAdmin = adminEmail ? ADMIN_EMAILS.includes(adminEmail) : false;
  if (isAdmin) return ["MTS", "POSTMAN", "PA", "IP", "GROUP B"];

  const isProfessionalGroup = userData.examCategory === 'IP' || userData.examCategory === 'GROUP B';
  if (isProfessionalGroup) return ["MTS", "POSTMAN", "PA", "IP", "GROUP B"];

  const proValidUntilDate = normalizeDate(userData.proValidUntil);
  const isPro = !!(userData.isPro && proValidUntilDate && proValidUntilDate > new Date());
  
  if (!isPro) {
    return [userData.examCategory];
  }

  const subscribedCategory = userData.subscribedCategory || 'MTS';
  if (subscribedCategory === 'PA') {
    return ['PA', 'POSTMAN', 'MTS'];
  }
  if (subscribedCategory === 'POSTMAN' || subscribedCategory === 'MTS') {
    return ['POSTMAN', 'MTS'];
  }

  return [subscribedCategory];
}
