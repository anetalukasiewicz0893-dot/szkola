export type Theme = 
  | 'debut' 
  | 'fearless' 
  | 'speak_now' 
  | 'red' 
  | '1989' 
  | 'reputation' 
  | 'lover' 
  | 'folklore' 
  | 'evermore' 
  | 'midnights' 
  | 'ttpd'
  | 'academic';

export interface User {
  id: string;
  firstName: string;
  major: string;
  university: string;
  themePref: Theme;
  quoteSource: 'pop' | 'stoic' | 'legal';
  agentEnabled: boolean;
}

export interface Subject {
  id: string;
  title: string;
  code: string;
  professor: string;
  professorEmail?: string;
  userId: string;
  notes?: string;
}

export interface Document {
  id: string;
  name: string;
  size: string;
  type: string;
  storageUrl?: string; // Simulated blob URL
  isAnalyzed: boolean;
  summary?: string;
  tags?: string[];
  subjectId: string;
  uploadedAt: string; // ISO date
}

export interface Event {
  id: string;
  title: string;
  date: string; // ISO date
  type: 'EXAM' | 'DEADLINE' | 'STUDY_BLOCK' | 'CLASS';
  isCompleted: boolean;
  userId: string;
  subjectId?: string;
}

export interface StudyBlockSuggestion {
  date: string;
  focus: string;
  durationMinutes: number;
  rationale: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  subjectId: string;
  analysis: string; // AI generated relevance/summary
  isRecommended: boolean;
}

export interface CheatSheet {
  id: string;
  subjectId: string;
  topic: string;
  content: string; // Markdown
  createdAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  subjectId: string;
  title: string;
  questions: QuizQuestion[];
  score?: number;
}