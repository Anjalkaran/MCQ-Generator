
import type { LucideIcon } from 'lucide-react';

export interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
  solution?: string;
}

export interface Material {
  name: string;
  content: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string; 
  categoryId: string;
  categoryName?: string; 
  material?: string;
  part: 'Part A' | 'Part B';
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
    topicExamsTaken: number;
    mockTestsTaken: number;
    isPro?: boolean;
    proValidUntil?: any; 
}

export interface MCQData {
  topic: Topic;
  mcqs: MCQ[];
}

export interface MCQHistory {
    id: string;
    userId: string;
    topicId: string;
    topicTitle?: string; 
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

export interface BankedQuestion {
    id: string;
    examCategory: 'MTS' | 'POSTMAN' | 'PA';
    fileName: string;
    content: string;
    uploadedAt: Date;
}
