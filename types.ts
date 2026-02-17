
export type Priority = 'high' | 'medium' | 'low';

export type Theme = 'debut' | 'fearless' | 'speak_now' | 'red' | '1989' | 'reputation' | 'lover' | 'folklore' | 'evermore' | 'midnights' | 'ttpd' | 'academic';

export interface User {
  id: string;
  firstName: string;
  major: string;
  university: string;
  themePref: Theme;
  quoteSource: 'pop' | 'stoic' | 'legal';
  agentEnabled: boolean;
}

export interface Assignment {
  id: string;
  title: string;
  due: string;
  done: boolean;
  priority: Priority;
}

export interface Literature {
  id: string;
  title: string;
  author: string;
  done: boolean;
  url?: string;
  chapter?: string;
}

export interface FinalsInfo {
  date: string;
  room: string;
}

export interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  role: 'editor' | 'viewer' | 'owner';
}

export interface Subject {
  id: string;
  title: string;
  code: string;
  color: string;
  ects: number;
  open: boolean;
  assignments: Assignment[];
  finals: FinalsInfo;
  literature: Literature[];
  notes: string;
  
  // Dashboard extended properties
  professor?: string;
  professorEmail?: string;
  collaborators?: Collaborator[];
  userId?: string;
}

export interface Semester {
  id: string;
  label: string;
  open: boolean;
  subjects: Subject[];
}

export interface AppState {
  semesters: Semester[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'model';
  content: string;
  error?: boolean;
  timestamp?: number;
  citations?: string[];
}

export interface CryptoEntity {
  type: 'WALLET' | 'EXCHANGE' | 'FRAUD_TYPOLOGY' | 'TOKEN';
  value: string;
  confidence: number;
  flagged: boolean;
}

export interface Document {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
  dataUrl?: string;
  textContent?: string;
  subjectId: string;
  isAnalyzed?: boolean;
  summary?: string;
  tags?: string[];
  cryptoEntities?: CryptoEntity[];
}

export interface Event {
  id: string;
  title: string;
  date: string;
  type: 'EXAM' | 'CLASS' | 'STUDY_BLOCK' | 'DEADLINE';
  isCompleted?: boolean;
  userId?: string;
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
  subjectId: string;
  title: string;
  author: string;
}

export interface CheatSheet {
  id: string;
  subjectId: string;
  createdAt: string;
  title: string;
  content: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Quiz {
  id: string;
  subjectId: string;
  title: string;
  questions: QuizQuestion[];
}
