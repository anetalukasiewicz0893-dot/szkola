import * as mockDb from './mockDb';
import * as notion from './notion';
import { User, Subject, Document, Event, Book, CheatSheet, Quiz } from '../types';

const getDataSource = () => localStorage.getItem('LL_DATA_SOURCE') || 'LOCAL';

const getNotionConfig = () => ({
    token: localStorage.getItem('LL_NOTION_TOKEN') || '',
    subjectsDbId: localStorage.getItem('LL_NOTION_DB_SUBJECTS') || '',
    eventsDbId: localStorage.getItem('LL_NOTION_DB_EVENTS') || '',
    docsDbId: localStorage.getItem('LL_NOTION_DB_DOCS') || '',
});

export const getUser = () => mockDb.getUser(); // User profile always local for now
export const saveUser = (user: User) => mockDb.saveUser(user);
export const seedDataForUser = (id: string) => mockDb.seedDataForUser(id);

// --- SUBJECTS ---
export const getSubjects = async (): Promise<Subject[]> => {
    if (getDataSource() === 'NOTION') return notion.getSubjects(getNotionConfig());
    return mockDb.getSubjects();
};

export const createSubject = async (s: Omit<Subject, 'id'>): Promise<Subject> => {
    if (getDataSource() === 'NOTION') return notion.createSubject(s, getNotionConfig());
    return mockDb.createSubject(s);
};

export const updateSubject = async (id: string, s: Partial<Subject>): Promise<Subject> => {
    if (getDataSource() === 'NOTION') return notion.updateSubject(id, s, getNotionConfig());
    return mockDb.updateSubject(id, s);
};

export const deleteSubject = async (id: string): Promise<void> => {
    if (getDataSource() === 'NOTION') return notion.deleteSubject(id, getNotionConfig());
    return mockDb.deleteSubject(id);
};

// --- EVENTS ---
export const getEvents = async (): Promise<Event[]> => {
    if (getDataSource() === 'NOTION') return notion.getEvents(getNotionConfig());
    return mockDb.getEvents();
};

export const getSubjectEvents = async (subjectId: string): Promise<Event[]> => {
    // Notion API doesn't support complex filtering in one go easily without building filter objects
    // For simplicity, we fetch all and filter in app, or you'd pass a filter to getEvents
    const events = await getEvents();
    return events.filter(e => e.subjectId === subjectId);
};

export const createEvent = async (e: Omit<Event, 'id'>): Promise<Event> => {
    if (getDataSource() === 'NOTION') return notion.createEvent(e, getNotionConfig());
    return mockDb.createEvent(e);
};

export const deleteEvent = async (id: string): Promise<void> => {
    if (getDataSource() === 'NOTION') return notion.deleteEvent(id, getNotionConfig());
    return mockDb.deleteEvent(id);
};

export const updateEvent = async (id: string, u: Partial<Event>): Promise<Event> => {
    if (getDataSource() === 'NOTION') return notion.updateEvent(id, u, getNotionConfig());
    return mockDb.updateEvent(id, u);
};

// --- DOCS ---
export const getDocuments = async (subjectId?: string): Promise<Document[]> => {
    if (getDataSource() === 'NOTION') {
        const docs = await notion.getDocuments(getNotionConfig());
        return subjectId ? docs.filter(d => d.subjectId === subjectId) : docs;
    }
    return mockDb.getDocuments(subjectId);
};

export const getAllDocuments = async (): Promise<Document[]> => {
    return getDocuments();
};

export const saveDocument = async (d: Omit<Document, 'id' | 'uploadedAt'>): Promise<Document> => {
    if (getDataSource() === 'NOTION') return notion.createDocument(d, getNotionConfig());
    return mockDb.saveDocument(d);
};

export const updateDocument = async (id: string, u: Partial<Document>): Promise<Document> => {
    if (getDataSource() === 'NOTION') return notion.updateDocument(id, u, getNotionConfig());
    return mockDb.updateDocument(id, u);
};

export const deleteDocument = async (id: string): Promise<void> => {
    if (getDataSource() === 'NOTION') return notion.deleteDocument(id, getNotionConfig());
    return mockDb.deleteDocument(id);
};

// --- MOCK ONLY FEATURES (For now, until Notion DBs defined) ---
// Books, CheatSheets, Quizzes are kept local for simplicity in this demo iteration,
// but could be easily mapped to Notion databases following the pattern above.

export const getBooks = (sid: string) => mockDb.getBooks(sid);
export const saveBook = (b: any) => mockDb.saveBook(b);
export const updateBook = (id: string, u: any) => mockDb.updateBook(id, u);
export const deleteBook = (id: string) => mockDb.deleteBook(id);

export const getCheatSheets = (sid: string) => mockDb.getCheatSheets(sid);
export const saveCheatSheet = (c: any) => mockDb.saveCheatSheet(c);

export const getQuizzes = (sid: string) => mockDb.getQuizzes(sid);
export const saveQuiz = (q: any) => mockDb.saveQuiz(q);
