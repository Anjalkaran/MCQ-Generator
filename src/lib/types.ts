
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
  categoryName?: string; // Optional: To hold the category name
  material?: string;
}

export interface Category {
    id: string;
    name: string;
    examCategories: ('MTS' | 'POSTMAN' | 'PA')[];
}

export interface UserData {
    uid: string;
    name: string;
    email: string;
    examCategory: 'MTS' | 'POSTMAN' | 'PA';
    paymentStatus: 'free' | 'paid';
    paidUntil: string | null; // ISO string date
    topicExamsTaken: number;
    mockTestsTaken: number;
    orderId?: string;
}

export interface MCQData {
  topic: Topic;
  mcqs: MCQ[];
  timeLimit?: number; // Total time in seconds
}

export interface MCQHistory {
    id: string;
    userId: string;
    topicId: string;
    topicTitle?: string; // To hold the resolved topic title
    score: number;
    totalQuestions: number;
    questions: string[];
    takenAt: Date;
}

export interface TopicPerformance {
    topicId: string;
    topicTitle: string;

    attempts: number;
    averageScore: number;
}
