
import type { LucideIcon } from 'lucide-react';

export interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string; // Storing icon name as string, mapping to component elsewhere
  categoryId: string;
}

export interface Category {
    id: string;
    name: string;
}

export interface UserData {
    id: string;
    uid: string;
    name: string;
    email: string;
    examCategory: 'MTS' | 'POSTMAN' | 'PA';
}
