
import type { LucideIcon } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

export interface StudyMaterial {
  id: string;
  topicId: string;
  fileName: string;
  fileType: string;
  content: string; // The extracted text content or PDF URL
  uploadedAt: Date;
}

export interface MCQ {
  questionId?: string;
  topicId?: string;
  question: string;
  options: string[];
  correctAnswer: string;
  solution?: string;
  topic?: string;
  sourceLanguage?: string;
  translations?: Record<string, MCQ>;
}

export interface VideoClass {
  id: string;
  title: string;
  description: string;
  youtubeVideoId: string;
  examCategories: ('MTS' | 'POSTMAN' | 'PA' | 'IP')[];
  uploadedAt: Date;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string; 
  categoryId: string;
  categoryName?: string; 
  part: 'Part A' | 'Part B' | 'Paper I' | 'Paper II' | 'Paper III' | 'Paper-I' | 'Paper-III';
  examCategories: ('MTS' | 'POSTMAN' | 'PA' | 'IP')[];
  source?: 'reasoningBank'; 
  material?: string;
}

export interface Category {
    id: string;
    name: string;
    examCategories: ('MTS' | 'POSTMAN' | 'PA' | 'IP')[];
}

export interface UserData {
    uid: string;
    name: string;
    email: string;
    phone?: string;
    employeeId?: string;
    city?: string;
    division?: string;
    examCategory: 'MTS' | 'POSTMAN' | 'PA' | 'IP';
    subscribedCategory?: 'MTS' | 'POSTMAN' | 'PA' | 'IP';
    totalExamsTaken: number;
    liveTestsTaken?: string[]; 
    completedMockBankTests?: string[]; 
    isPro?: boolean;
    proValidUntil?: any; 
    createdAt?: any;
    lastSeen?: any;
    hasSeenReasoningUpdate?: boolean; 
    mockTestUpdateSeenCount?: number;
}

export interface MCQData {
  topic: Pick<Topic, 'id' | 'title' | 'description' | 'icon' | 'categoryId'>;
  mcqs: MCQ[];
  timeLimit?: number;
  isMockTest?: boolean;
  liveTestId?: string; 
  weeklyTestId?: string;
  dailyTestId?: string;
  questionPaperId?: string; 
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
    userAnswers: { [key: number]: string }; 
    takenAt: Date;
    durationInSeconds?: number;
    isMockTest?: boolean;
    liveTestId?: string;
    weeklyTestId?: string;
    dailyTestId?: string;
    questionPaperId?: string; 
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
    examCategory: 'MTS' | 'POSTMAN' | 'PA' | 'IP';
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
    examCategory: 'MTS' | 'POSTMAN' | 'PA' | 'IP' | 'All';
    averageScore: number;
    totalExams?: number;
    score?: number;
    totalQuestions?: number;
    durationInSeconds?: number;
    liveTestId?: string;
    weeklyTestId?: string;
    dailyTestId?: string;
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
    examCategory: 'MTS' | 'POSTMAN' | 'PA' | 'IP' | 'All';
    startTime: Timestamp | Date;
    endTime: Timestamp | Date;
    questionPaperId: string; 
    price: number; 
}

export interface WeeklyTest {
    id: string;
    title: string;
    examCategories: string[];
    questionPaperId: string;
    createdAt: Date;
}

export interface DailyTest {
    id: string;
    title: string;
    examCategories: string[];
    questionPaperId: string;
    createdAt: Date;
}

export interface ReasoningQuestion {
  id: string;
  questionText: string;
  questionImage: string; 
  options: string[]; 
  correctAnswer: string;
  solutionImage?: string; 
  solutionText?: string;
  isForLiveTest: boolean;
  topic: string; 
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

export interface AptiSolveLaunch {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    launchedAt: Date;
}

export interface MaterialDownload {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  materialId: string;
  materialTitle: string;
  downloadedAt: Date;
}

export interface Bookmark {
  id: string; // questionId or hash
  userId: string;
  question: MCQ;
  topicId?: string;
  comment?: string;
  createdAt: any; // Timestamp or Date
}

export interface MCQReport {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  question: MCQ;
  comment: string;
  issueType?: 'incorrect_answer' | 'wrong_question' | 'typo' | 'missing_info' | 'other';
  severity?: 'low' | 'medium' | 'high';
  topicId?: string;
  createdAt: any;
  status: 'pending' | 'in_review' | 'resolved';
}
