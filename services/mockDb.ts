import { User, Subject, Document, Event, Book, CheatSheet, Quiz } from '../types';

// Mock Data Keys
const KEYS = {
  USER: 'll_user',
  SUBJECTS: 'll_subjects',
  DOCUMENTS: 'll_documents',
  EVENTS: 'll_events',
  BOOKS: 'll_books',
  CHEATSHEETS: 'll_cheatsheets',
  QUIZZES: 'll_quizzes'
};

// Utilities
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- USER ---
export const getUser = (): User | null => {
  const data = localStorage.getItem(KEYS.USER);
  return data ? JSON.parse(data) : null;
};

export const saveUser = async (user: User): Promise<User> => {
  await delay(300);
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
  return user;
};

// --- SUBJECTS ---
export const getSubjects = (): Subject[] => {
  const data = localStorage.getItem(KEYS.SUBJECTS);
  return data ? JSON.parse(data) : [];
};

export const createSubject = async (subject: Omit<Subject, 'id'>): Promise<Subject> => {
  const subjects = getSubjects();
  const newSubject = { ...subject, id: Math.random().toString(36).substr(2, 9) };
  subjects.push(newSubject);
  localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(subjects));
  return newSubject;
};

export const deleteSubject = async (id: string): Promise<void> => {
  const subjects = getSubjects();
  const filtered = subjects.filter(s => s.id !== id);
  localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(filtered));
  
  // Cascade delete (simulated)
  // In a real app, delete related docs, events, books etc.
};

// --- DOCUMENTS ---
export const getDocuments = (subjectId: string): Document[] => {
  const allDocs = JSON.parse(localStorage.getItem(KEYS.DOCUMENTS) || '[]') as Document[];
  return allDocs.filter((d) => d.subjectId === subjectId);
};

export const getAllDocuments = (): Document[] => {
    return JSON.parse(localStorage.getItem(KEYS.DOCUMENTS) || '[]') as Document[];
};

export const getUnanalyzedDocumentCount = (): number => {
  const allDocs = JSON.parse(localStorage.getItem(KEYS.DOCUMENTS) || '[]') as Document[];
  return allDocs.filter(d => !d.isAnalyzed).length;
};

export const saveDocument = async (doc: Omit<Document, 'id' | 'uploadedAt'>): Promise<Document> => {
  await delay(500); // Simulate upload time
  const allDocs = JSON.parse(localStorage.getItem(KEYS.DOCUMENTS) || '[]') as Document[];
  const newDoc: Document = {
    ...doc,
    id: Math.random().toString(36).substr(2, 9),
    uploadedAt: new Date().toISOString(),
  };
  allDocs.push(newDoc);
  localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(allDocs));
  return newDoc;
};

export const deleteDocument = async (id: string): Promise<void> => {
  const allDocs = JSON.parse(localStorage.getItem(KEYS.DOCUMENTS) || '[]') as Document[];
  const filtered = allDocs.filter(d => d.id !== id);
  localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(filtered));
};

export const updateDocument = async (id: string, updates: Partial<Document>): Promise<Document> => {
  await delay(300);
  const allDocs = JSON.parse(localStorage.getItem(KEYS.DOCUMENTS) || '[]') as Document[];
  const idx = allDocs.findIndex(d => d.id === id);
  if (idx === -1) throw new Error('Document not found');
  
  const updated = { ...allDocs[idx], ...updates };
  allDocs[idx] = updated;
  localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(allDocs));
  return updated;
};

// --- EVENTS ---
export const getEvents = (): Event[] => {
  const data = localStorage.getItem(KEYS.EVENTS);
  return data ? JSON.parse(data) : [];
};

export const getSubjectEvents = (subjectId: string): Event[] => {
  const events = getEvents();
  return events.filter(e => e.subjectId === subjectId);
};

export const createEvent = async (event: Omit<Event, 'id'>): Promise<Event> => {
  const events = getEvents();
  const newEvent = { ...event, id: Math.random().toString(36).substr(2, 9) };
  events.push(newEvent);
  localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
  return newEvent;
};

export const updateEvent = async (id: string, updates: Partial<Event>): Promise<Event> => {
  const events = getEvents();
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Event not found');
  const updated = { ...events[idx], ...updates };
  events[idx] = updated;
  localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
  return updated;
};

export const deleteEvent = async (id: string): Promise<void> => {
  const events = getEvents();
  const filtered = events.filter(e => e.id !== id);
  localStorage.setItem(KEYS.EVENTS, JSON.stringify(filtered));
};

export const getUpcomingExams = (): Event[] => {
  const events = getEvents();
  const now = new Date();
  return events
    .filter(e => e.type === 'EXAM' && new Date(e.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// --- BOOKS ---
export const getBooks = (subjectId: string): Book[] => {
  const all = JSON.parse(localStorage.getItem(KEYS.BOOKS) || '[]') as Book[];
  return all.filter(b => b.subjectId === subjectId);
};

export const saveBook = async (book: Omit<Book, 'id'>): Promise<Book> => {
  await delay(200);
  const all = JSON.parse(localStorage.getItem(KEYS.BOOKS) || '[]') as Book[];
  const newBook = { ...book, id: Math.random().toString(36).substr(2, 9) };
  all.push(newBook);
  localStorage.setItem(KEYS.BOOKS, JSON.stringify(all));
  return newBook;
};

export const updateBook = async (id: string, updates: Partial<Book>): Promise<Book> => {
    const all = JSON.parse(localStorage.getItem(KEYS.BOOKS) || '[]') as Book[];
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) throw new Error('Book not found');
    const updated = { ...all[idx], ...updates };
    all[idx] = updated;
    localStorage.setItem(KEYS.BOOKS, JSON.stringify(all));
    return updated;
};

export const deleteBook = async (id: string): Promise<void> => {
    const all = JSON.parse(localStorage.getItem(KEYS.BOOKS) || '[]') as Book[];
    const filtered = all.filter(b => b.id !== id);
    localStorage.setItem(KEYS.BOOKS, JSON.stringify(filtered));
};

// --- CHEAT SHEETS ---
export const getCheatSheets = (subjectId: string): CheatSheet[] => {
  const all = JSON.parse(localStorage.getItem(KEYS.CHEATSHEETS) || '[]') as CheatSheet[];
  return all.filter(c => c.subjectId === subjectId);
};

export const saveCheatSheet = async (sheet: Omit<CheatSheet, 'id' | 'createdAt'>): Promise<CheatSheet> => {
  const all = JSON.parse(localStorage.getItem(KEYS.CHEATSHEETS) || '[]') as CheatSheet[];
  const newSheet = { 
    ...sheet, 
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString()
  };
  all.push(newSheet);
  localStorage.setItem(KEYS.CHEATSHEETS, JSON.stringify(all));
  return newSheet;
};

// --- QUIZZES ---
export const getQuizzes = (subjectId: string): Quiz[] => {
  const all = JSON.parse(localStorage.getItem(KEYS.QUIZZES) || '[]') as Quiz[];
  return all.filter(q => q.subjectId === subjectId);
};

export const saveQuiz = async (quiz: Omit<Quiz, 'id'>): Promise<Quiz> => {
  const all = JSON.parse(localStorage.getItem(KEYS.QUIZZES) || '[]') as Quiz[];
  const newQuiz = { ...quiz, id: Math.random().toString(36).substr(2, 9) };
  all.push(newQuiz);
  localStorage.setItem(KEYS.QUIZZES, JSON.stringify(all));
  return newQuiz;
};

// --- SEEDER ---
export const seedDataForUser = async (userId: string) => {
  const subjects = [
    { title: 'Wstęp do Prawa', code: 'WDP 101', professor: 'Dr. Anna Nowak', userId: userId },
    { title: 'Historia Doktryn', code: 'HDP 202', professor: 'Prof. Jan Kowalski', userId: userId },
    { title: 'Prawo Karne', code: 'PK 305', professor: 'Dr. Ewa Wiśniewska', userId: userId },
  ];

  const createdSubjects = [];
  for (const s of subjects) {
    createdSubjects.push(await createSubject(s));
  }

  // Seed an exam for the first subject
  const now = new Date();
  const examDate = new Date();
  examDate.setDate(now.getDate() + 14); // 2 weeks out

  await createEvent({
    title: 'Kolokwium Zaliczeniowe',
    date: examDate.toISOString(),
    type: 'EXAM',
    isCompleted: false,
    userId: userId,
    subjectId: createdSubjects[0].id
  });
};

// Legacy support if needed, but preferred flow is Onboarding -> seedDataForUser
export const seedDatabase = async () => {
  const user: User = {
    id: 'user_pl',
    firstName: 'Student',
    major: 'Prawo',
    university: 'Uniwersytet Jagielloński',
    themePref: 'evermore',
    quoteSource: 'pop',
    agentEnabled: true,
  };
  await saveUser(user);
  await seedDataForUser(user.id);
};