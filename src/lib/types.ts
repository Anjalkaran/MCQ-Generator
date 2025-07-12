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
  icon: LucideIcon;
  material: string;
  mcqs: MCQ[];
}
