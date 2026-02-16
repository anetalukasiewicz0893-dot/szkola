import { GoogleGenAI, Type, Modality } from "@google/genai";
import { StudyBlockSuggestion, QuizQuestion } from "../types";

const getApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('LL_GEMINI_KEY') || process.env.API_KEY || '';
  }
  return process.env.API_KEY || '';
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

// Helper to check if API key is present
export const isAiAvailable = () => !!getApiKey();

// --- DOCUMENT ANALYSIS ---
export const analyzeDocument = async (
  fileName: string, 
  userMajor: string,
  fileContent?: string
): Promise<{ executiveSummary: string; tags: string[] }> => {
  if (!getApiKey()) {
    // Mock response for demo without key
    return new Promise(resolve => setTimeout(() => resolve({
      executiveSummary: `(Symulacja) Dokument "${fileName}" zawiera kluczowe aspekty związane z kierunkiem ${userMajor}. ${fileContent ? 'Treść pliku została wykryta.' : 'Brak treści.'}`,
      tags: ["Prawo", "Ważne", "Egzamin"]
    }), 2000));
  }

  try {
    const model = 'gemini-3-flash-preview';
    
    let context = "";
    if (fileContent && fileContent.length > 0) {
        context = `DOCUMENT CONTENT START:\n${fileContent.substring(0, 30000)}\nDOCUMENT CONTENT END`; // Truncate to safe limit
    } else {
        context = "(Binary file or PDF - content not fully extracted, infer from title)";
    }

    const prompt = `
      Analyze this document titled "${fileName}" for a student majoring in "${userMajor}".
      ${context}
      
      Provide an executive summary and a list of 3-5 relevant tags.
      Respond in POLISH language.
      Return JSON only.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw new Error("Failed to analyze document");
  }
};

// --- STUDY PLAN ---
export const generateStudyPlan = async (
  major: string,
  daysUntilExam: number,
  unreadDocsCount: number,
  examTitle: string
): Promise<StudyBlockSuggestion[]> => {
  if (!getApiKey()) {
    // Mock response
    return new Promise(resolve => setTimeout(() => resolve([
      { date: new Date().toISOString(), focus: "Powtórka Podstaw", durationMinutes: 60, rationale: "Rozpocznij od kluczowych definicji." },
      { date: new Date(Date.now() + 86400000).toISOString(), focus: "Analiza Przypadków", durationMinutes: 90, rationale: "Głębsze zrozumienie orzecznictwa." },
    ]), 2000));
  }

  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `
      Act as an Executive Study Planner.
      User Major: ${major}
      Exam: ${examTitle}
      Days until exam: ${daysUntilExam}
      Unread Documents: ${unreadDocsCount}
      
      The student is at risk of falling behind. Create a high-priority study schedule (StudyBlocks) for the next few days to catch up.
      Respond in POLISH language.
      Return a JSON array of study blocks.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "ISO Date String" },
              focus: { type: Type.STRING },
              durationMinutes: { type: Type.INTEGER },
              rationale: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Planning Failed:", error);
    throw new Error("Failed to generate study plan");
  }
};

// --- NOTES & OTHERS ---
export const refineNotes = async (
  notes: string,
  goal: 'summarize' | 'polish' | 'structure'
): Promise<string> => {
  if (!getApiKey() || !notes) return notes;

  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `
      You are an academic assistant. 
      Action: ${goal === 'summarize' ? 'Create a concise summary' : goal === 'structure' ? 'Reformat into bullet points and headers' : 'Fix grammar and improve flow'} 
      for the following notes. Respond in POLISH language.
      
      "${notes}"
      
      Return only the updated text.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || notes;
  } catch (error) {
    console.error("Gemini Note Refinement Failed:", error);
    return notes; // Fallback to original
  }
};

export const analyzeBook = async (title: string, author: string, major: string): Promise<string> => {
  if (!getApiKey()) return "AI offline. (Brak klucza API). Symulacja: Książka ta jest kluczową pozycją w literaturze przedmiotu.";

  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `
      Analyze the book "${title}" by ${author}.
      Context: Student majoring in ${major}.
      Provide a concise summary of why this book is relevant to the field and key concepts covered.
      Respond in POLISH language.
      Maximum 150 words.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Nie udało się wygenerować analizy.";
  } catch (e) {
    console.error(e);
    return "Błąd analizy AI.";
  }
};

export const generateCheatSheet = async (subjectTitle: string, topic: string): Promise<string> => {
  if (!getApiKey()) return "# Symulacja Cheat Sheet\n\n- Punkt 1\n- Punkt 2\n(Dodaj API Key dla pełnej wersji)";

  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `
      Create a comprehensive exam cheat sheet (ściąga) for the subject "${subjectTitle}".
      Specific Topic: "${topic}".
      Format: Markdown. Use bullet points, bold text for definitions, and clear sections.
      Respond in POLISH language.
    `;
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Błąd generowania.";
  } catch (e) {
    return "Błąd generowania.";
  }
};

export const generateQuiz = async (subjectTitle: string, difficulty: 'easy' | 'hard'): Promise<QuizQuestion[]> => {
    if (!getApiKey()) return []; // Return empty if no key
    
    try {
        const model = 'gemini-3-flash-preview';
        const prompt = `
          Create a 5-question multiple choice quiz for "${subjectTitle}".
          Difficulty: ${difficulty}.
          Respond in POLISH language.
          Return JSON format compatible with the schema.
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correctIndex: { type: Type.INTEGER },
                            explanation: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        const text = response.text || "[]";
        return JSON.parse(text);
    } catch (e) {
        console.error(e);
        return [];
    }
};