
import type { LucideIcon } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

export interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
  solution?: string;
  topic?: string;
  sourceLanguage?: string;
  translations?: Record<string, MCQ>;
}

export interface StudyMaterial {
  id: string;
  title: string;
  examCategories: ('MTS' | 'POSTMAN' | 'PA')[];
  fileName: string;
  content: string;
  uploadedAt: Date;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string; 
  categoryId: string;
  categoryName?: string; 
  part: 'Part A' | 'Part B';
  examCategories: ('MTS' | 'POSTMAN' | 'PA')[];
  source?: 'reasoningBank'; // Flag to identify virtual topics
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
    phone?: string;
    city?: string;
    examCategory: 'MTS' | 'POSTMAN' | 'PA';
    totalExamsTaken: number;
    liveTestsTaken?: string[]; // Array of liveTest IDs
    isPro?: boolean;
    proValidUntil?: any; 
    createdAt?: any;
    lastSeen?: any;
    hasSeenReasoningUpdate?: boolean; // New field for the popup
    mockTestUpdateSeenCount?: number;
}

export interface MCQData {
  topic: Topic;
  mcqs: MCQ[];
  timeLimit?: number;
  isMockTest?: boolean;
  liveTestId?: string; // Add liveTestId to quiz data
  examCategory?: UserData['examCategory'];
  language?: string;
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
    liveTestId?: string;
    language?: string;
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
    startTime: Timestamp | Date;
    endTime: Timestamp | Date;
    questionPaperId: string; // Document ID from the 'liveTestBank' collection
    price: number; // Price for the test for non-pro users
}

export interface ReasoningQuestion {
  id: string;
  questionText: string;
  questionImage: string; // Base64 Data URI
  options: string[];
  correctAnswer: string;
  solutionImage?: string; // Base64 Data URI
  solutionText?: string;
  isForLiveTest: boolean;
  topic: string; // The specific topic (e.g., 'Non-verbal Reasoning')
  uploadedAt: Date;
}

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
  reply?: string;
  repliedAt?: Date;
}
