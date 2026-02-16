
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

export interface Collaborator {
  id: string;
  name: string;
  avatar: string; // Initials or URL
  role: 'owner' | 'editor' | 'viewer';
}

export interface Subject {
  id: string;
  title: string;
  ects: number; 
  professor: string;
  professorEmail?: string;
  userId: string;
  notes?: string;
  collaborators?: Collaborator[]; // Co-Op Mode
}

export interface CryptoEntity {
  type: 'WALLET' | 'EXCHANGE' | 'FRAUD_TYPOLOGY' | 'TOKEN';
  value: string;
  confidence: number;
  flagged: boolean; // If it matches the master criminal DB
}

export interface Document {
  id: string;
  name: string;
  size: string;
  type: string;
  dataUrl?: string; 
  textContent?: string; 
  isAnalyzed: boolean;
  summary?: string;
  tags?: string[];
  cryptoEntities?: CryptoEntity[]; // Tier 1 AI Result
  subjectId: string;
  uploadedAt: string; 
}

export interface Event {
  id: string;
  title: string;
  date: string; 
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  citations?: string[]; // References to pages/slides
  timestamp: number;
}

export interface NotebookSession {
  id: string;
  subjectId: string;
  title: string;
  sourceDocIds: string[]; // IDs of documents included in this research context
  messages: ChatMessage[];
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  subjectId: string;
  analysis: string; 
  isRecommended: boolean;
}

export interface CheatSheet {
  id: string;
  subjectId: string;
  topic: string;
  content: string; 
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
