
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
  material?: string; // Optional field to store text content from uploaded material
}

export interface Category {
    id: string;
    name: string;
    examCategory: 'MTS' | 'POSTMAN' | 'PA' | 'ALL';
}

export interface UserData {
    id: string;
    uid: string;
    name: string;
    email: string;
    examCategory: 'MTS' | 'POSTMAN' | 'PA' | 'ALL';
}

export interface QuizData {
  topic: Topic;
  mcqs: MCQ[];
}
