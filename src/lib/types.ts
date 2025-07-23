
import type { LucideIcon } from 'lucide-react';

export interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
  solution?: string;
  topic?: string;
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
  examCategories: ('MTS' | 'POSTMAN' | 'PA')[];
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
    city?: string;
    examCategory: 'MTS' | 'POSTMAN' | 'PA';
    topicExamsTaken: number;
    mockTestsTaken: number;
    isPro?: boolean;
    proValidUntil?: any; 
    createdAt?: any;
}

export interface MCQData {
  topic: Topic;
  mcqs: MCQ[];
  timeLimit?: number;
  isMockTest?: boolean;
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
    isMockTest?: boolean;
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

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    userName: string;
    examCategory: 'MTS' | 'POSTMAN' | 'PA';
    averageScore: number;
    totalExams: number;
}

export interface UserTopicProgress {
    topicId: string;
    lastCharacterIndexUsed: number;
    updatedAt: Date;
}

export interface QnAUsage {
    id: string;
    userId: string;
    topic: string;
    timestamp: Date;
}

export interface Notification {
    id: string;
    message: string;
    createdAt: Date;
    isRead: boolean;
    userId: string;
    userName: string;
}
