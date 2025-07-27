
import type { LucideIcon } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

export interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
  solution?: string;
  topic?: string;
}

export interface ReasoningQuestion {
    id: string;
    questionImageUrl: string;
    questionText: string | null;
    optionImageUrls: string[];
    correctAnswerIndex: number;
    solutionImageUrl: string | null;
    examCategories: ('MTS' | 'POSTMAN' | 'PA')[];
    uploadedAt: Timestamp;
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
    liveTestsTaken?: string[]; // Array of liveTest IDs
    isPro?: boolean;
    proValidUntil?: any; 
    createdAt?: any;
    lastSeen?: any;
}

export interface MCQData {
  topic: Topic;
  mcqs: MCQ[];
  timeLimit?: number;
  isMockTest?: boolean;
  liveTestId?: string; // Add liveTestId to quiz data
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
    durationInSeconds?: number;
    isMockTest?: boolean;
    liveTestId?: string; // Add liveTestId to history
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

export interface TopicMCQ {
    id: string;
    topicId: string;
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
    totalExams?: number;
    score?: number;
    totalQuestions?: number;
    durationInSeconds?: number;
    liveTestId?: string;
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

export interface LiveTest {
    id: string;
    title: string;
    examCategory: 'MTS' | 'POSTMAN' | 'PA';
    startTime: Timestamp;
    endTime: Timestamp;
    questionPaperId: string; // Document ID from the 'liveTestBank' collection
    price: number; // Price for the test for non-pro users
}
