import { User, Subject, Event, Document } from '../types';

// CORS Proxy is required for browser-based Notion API calls
// In production, this should be your own backend endpoint.
const PROXY_URL = 'https://corsproxy.io/?'; 
const BASE_URL = 'https://api.notion.com/v1';

const getHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
});

// Helper for Fetching through Proxy
const notionFetch = async (endpoint: string, method: string, body: any = null, token: string) => {
  const url = `${PROXY_URL}${encodeURIComponent(BASE_URL + endpoint)}`;
  const options: RequestInit = {
    method,
    headers: getHeaders(token),
    body: body ? JSON.stringify(body) : null,
  };

  const res = await fetch(url, options);
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Notion API Error:', errorText);
    throw new Error(`Notion API Error: ${res.statusText}`);
  }
  return res.json();
};

// --- SCHEMA INITIALIZATION ---
// Automatically creates the required databases in the user's Notion page

export const initializeWorkspace = async (token: string, parentPageId: string) => {
  // 1. Create Subjects Database
  const subjectsDb = await notionFetch('/databases', 'POST', {
    parent: { page_id: parentPageId },
    title: [{ type: 'text', text: { content: 'LoverLaw_Subjects' } }],
    properties: {
      Name: { title: {} },
      ECTS: { number: { format: 'number' } },
      Professor: { rich_text: {} },
      Email: { email: {} },
      Notes: { rich_text: {} }, // Storing notes as a property for simplicity
    }
  }, token);

  // 2. Create Events Database
  const eventsDb = await notionFetch('/databases', 'POST', {
    parent: { page_id: parentPageId },
    title: [{ type: 'text', text: { content: 'LoverLaw_Events' } }],
    properties: {
      Name: { title: {} },
      Date: { date: {} },
      Type: { select: { options: [
        { name: 'EXAM', color: 'red' },
        { name: 'CLASS', color: 'blue' },
        { name: 'STUDY_BLOCK', color: 'yellow' },
        { name: 'DEADLINE', color: 'orange' }
      ]}},
      SubjectId: { rich_text: {} }, // Manual relation via ID string for simplicity in this demo
      Completed: { checkbox: {} }
    }
  }, token);

  // 3. Create Documents Database (Metadata only)
  const docsDb = await notionFetch('/databases', 'POST', {
    parent: { page_id: parentPageId },
    title: [{ type: 'text', text: { content: 'LoverLaw_Documents' } }],
    properties: {
      Name: { title: {} },
      Size: { rich_text: {} },
      Type: { rich_text: {} },
      SubjectId: { rich_text: {} },
      Analyzed: { checkbox: {} },
      Summary: { rich_text: {} },
      Tags: { multi_select: {} }
    }
  }, token);

  return {
    subjectsDbId: subjectsDb.id,
    eventsDbId: eventsDb.id,
    docsDbId: docsDb.id
  };
};

// --- MAPPERS ---

const mapPageToSubject = (page: any): Subject => ({
  id: page.id,
  title: page.properties.Name.title[0]?.plain_text || 'Untitled',
  ects: page.properties.ECTS?.number || 0,
  professor: page.properties.Professor.rich_text[0]?.plain_text || '',
  professorEmail: page.properties.Email.email || '',
  userId: 'notion_user',
  notes: page.properties.Notes.rich_text[0]?.plain_text || '',
});

const mapPageToEvent = (page: any): Event => ({
  id: page.id,
  title: page.properties.Name.title[0]?.plain_text || 'Untitled',
  date: page.properties.Date.date?.start || new Date().toISOString(),
  type: page.properties.Type.select?.name || 'CLASS',
  isCompleted: page.properties.Completed.checkbox,
  userId: 'notion_user',
  subjectId: page.properties.SubjectId.rich_text[0]?.plain_text || undefined
});

const mapPageToDocument = (page: any): Document => ({
  id: page.id,
  name: page.properties.Name.title[0]?.plain_text || 'Untitled',
  size: page.properties.Size.rich_text[0]?.plain_text || '0 KB',
  type: page.properties.Type.rich_text[0]?.plain_text || 'file',
  uploadedAt: page.created_time,
  isAnalyzed: page.properties.Analyzed.checkbox,
  summary: page.properties.Summary.rich_text[0]?.plain_text || '',
  tags: page.properties.Tags.multi_select.map((t: any) => t.name),
  subjectId: page.properties.SubjectId.rich_text[0]?.plain_text || ''
});

// --- API METHODS ---

export const getSubjects = async (config: any): Promise<Subject[]> => {
  const res = await notionFetch(`/databases/${config.subjectsDbId}/query`, 'POST', {}, config.token);
  return res.results.map(mapPageToSubject);
};

export const createSubject = async (subject: Omit<Subject, 'id'>, config: any): Promise<Subject> => {
  const res = await notionFetch('/pages', 'POST', {
    parent: { database_id: config.subjectsDbId },
    properties: {
      Name: { title: [{ text: { content: subject.title } }] },
      ECTS: { number: subject.ects },
      Professor: { rich_text: [{ text: { content: subject.professor } }] },
      Email: { email: subject.professorEmail || null },
      Notes: { rich_text: [{ text: { content: subject.notes || '' } }] }
    }
  }, config.token);
  return mapPageToSubject(res);
};

export const updateSubject = async (id: string, updates: Partial<Subject>, config: any): Promise<Subject> => {
  const properties: any = {};
  if (updates.title) properties.Name = { title: [{ text: { content: updates.title } }] };
  if (updates.notes !== undefined) properties.Notes = { rich_text: [{ text: { content: updates.notes } }] };
  if (updates.ects !== undefined) properties.ECTS = { number: updates.ects };
  
  const res = await notionFetch(`/pages/${id}`, 'PATCH', { properties }, config.token);
  return mapPageToSubject(res);
};

export const deleteSubject = async (id: string, config: any): Promise<void> => {
    // Notion API "deletes" by archiving
    await notionFetch(`/pages/${id}`, 'PATCH', { archived: true }, config.token);
};

export const getEvents = async (config: any): Promise<Event[]> => {
  const res = await notionFetch(`/databases/${config.eventsDbId}/query`, 'POST', {}, config.token);
  return res.results.map(mapPageToEvent);
};

export const createEvent = async (event: Omit<Event, 'id'>, config: any): Promise<Event> => {
  const res = await notionFetch('/pages', 'POST', {
    parent: { database_id: config.eventsDbId },
    properties: {
      Name: { title: [{ text: { content: event.title } }] },
      Date: { date: { start: event.date } },
      Type: { select: { name: event.type } },
      Completed: { checkbox: event.isCompleted },
      SubjectId: { rich_text: [{ text: { content: event.subjectId || '' } }] }
    }
  }, config.token);
  return mapPageToEvent(res);
};

export const deleteEvent = async (id: string, config: any): Promise<void> => {
    await notionFetch(`/pages/${id}`, 'PATCH', { archived: true }, config.token);
};

export const updateEvent = async (id: string, updates: Partial<Event>, config: any): Promise<Event> => {
    const properties: any = {};
    if (updates.title) properties.Name = { title: [{ text: { content: updates.title } }] };
    
    const res = await notionFetch(`/pages/${id}`, 'PATCH', { properties }, config.token);
    return mapPageToEvent(res);
};

// Document methods (Simplified for metadata only, as we can't upload files to Notion directly via API easily)
export const getDocuments = async (config: any): Promise<Document[]> => {
    const res = await notionFetch(`/databases/${config.docsDbId}/query`, 'POST', {}, config.token);
    return res.results.map(mapPageToDocument);
};

export const createDocument = async (doc: Omit<Document, 'id' | 'uploadedAt'>, config: any): Promise<Document> => {
    const res = await notionFetch('/pages', 'POST', {
        parent: { database_id: config.docsDbId },
        properties: {
          Name: { title: [{ text: { content: doc.name } }] },
          Size: { rich_text: [{ text: { content: doc.size } }] },
          Type: { rich_text: [{ text: { content: doc.type } }] },
          SubjectId: { rich_text: [{ text: { content: doc.subjectId } }] },
          Analyzed: { checkbox: doc.isAnalyzed },
          Summary: { rich_text: [{ text: { content: doc.summary || '' } }] },
          Tags: { multi_select: (doc.tags || []).map(t => ({ name: t })) }
        }
    }, config.token);
    return mapPageToDocument(res);
};

export const updateDocument = async (id: string, updates: Partial<Document>, config: any): Promise<Document> => {
    const properties: any = {};
    if (updates.isAnalyzed !== undefined) properties.Analyzed = { checkbox: updates.isAnalyzed };
    if (updates.summary) properties.Summary = { rich_text: [{ text: { content: updates.summary } }] };
    if (updates.tags) properties.Tags = { multi_select: updates.tags.map(t => ({ name: t })) };

    const res = await notionFetch(`/pages/${id}`, 'PATCH', { properties }, config.token);
    return mapPageToDocument(res);
};

export const deleteDocument = async (id: string, config: any): Promise<void> => {
    await notionFetch(`/pages/${id}`, 'PATCH', { archived: true }, config.token);
};