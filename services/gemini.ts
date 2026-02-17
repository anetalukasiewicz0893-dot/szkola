
import { GoogleGenAI, Type } from "@google/genai";
import { StudyBlockSuggestion, QuizQuestion, CryptoEntity, ChatMessage } from "../types";

const getApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('LL_GEMINI_KEY') || process.env.API_KEY || '';
  }
  return process.env.API_KEY || '';
};

export const isAiAvailable = () => !!getApiKey();

const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");
  return new GoogleGenAI({ apiKey });
};

// --- CHAT AI (General) ---
export const sendChatMessage = async (
  message: string,
  history: ChatMessage[],
  context?: string
): Promise<string> => {
  try {
    const ai = getClient();
    const modelId = "gemini-3-flash-preview";

    const systemInstruction = `
      You are "Lover & Law AI", a helpful study assistant. 
      The user is a student. Be academic, encouraging, and precise.
      ${context ? `Use the following context to answer:\n${context}` : ''}
    `;

    const contents = [
      ...history.filter(h => h.id !== 'init').map(h => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: modelId,
      config: { systemInstruction },
      contents: contents
    });

    return response.text || "I couldn't generate a response.";
  } catch (error: any) {
    console.error("Chat Error:", error);
    throw new Error(error.message || "AI Service Unavailable");
  }
};

// --- TIER 1 AI: CRYPTO FORENSICS & DOCUMENT ANALYSIS ---

export const analyzeDocument = async (
  fileName: string, 
  userMajor: string,
  fileContent?: string
): Promise<{ executiveSummary: string; tags: string[]; cryptoEntities: CryptoEntity[] }> => {
  if (!fileContent) return { executiveSummary: '', tags: [], cryptoEntities: [] };

  try {
    const ai = getClient();
    const modelId = "gemini-3-flash-preview";

    const prompt = `
      Analyze the following document titled "${fileName}". The user is a student of "${userMajor}".
      
      Task 1: Generate a concise executive summary relevant to the student's major.
      Task 2: Generate up to 4 relevant tags.
      Task 3: Perform a FORENSIC SCAN for Cryptocurrency Entities. Look for:
         - Wallet Addresses (ETH, BTC, etc.)
         - Exchange Names (Binance, FTX, etc.)
         - Fraud Typologies (Rug Pull, Pig Butchering, Mixer, Laundering)
         - Specific Token names.
      
      Return the result in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        { text: prompt },
        { text: `Document Content:\n${fileContent.substring(0, 30000)}` } // Truncate to avoid token limits in basic tier
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            cryptoEntities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['WALLET', 'EXCHANGE', 'FRAUD_TYPOLOGY', 'TOKEN'] },
                  value: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  flagged: { type: Type.BOOLEAN, description: "True if this entity represents a risk or criminal activity" }
                }
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      executiveSummary: result.executiveSummary || "Analysis failed.",
      tags: result.tags || [],
      cryptoEntities: result.cryptoEntities || []
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback Mock
    return {
      executiveSummary: "AI Analysis currently unavailable. Please check your API key settings.",
      tags: ["Error"],
      cryptoEntities: []
    };
  }
};

// --- TIER 2 AI: NOTEBOOK RESEARCH ENGINE ---

export const notebookChat = async (
  query: string,
  contextDocs: { name: string; content: string }[],
  history: ChatMessage[]
): Promise<ChatMessage> => {
  try {
    const ai = getClient();
    const modelId = "gemini-3-flash-preview";

    // Construct Context
    const contextString = contextDocs.map(d => `SOURCE: ${d.name}\nCONTENT: ${d.content.substring(0, 15000)}\n---`).join('\n');

    const systemInstruction = `
      You are "Lover & Law Research Agent", a Tier 2 grounded research AI.
      Your goal is to answer the user's query utilizing ONLY the provided source documents.
      
      Rules:
      1. If the answer is not in the sources, state clearly that you cannot find it in the provided context.
      2. Cite your sources. When you use information, append (Source Name) to the statement.
      3. Be academic, precise, and helpful.
      4. Detect any crypto-criminal patterns if asked.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Lower temperature for more grounded answers
      },
      contents: [
        { text: `CONTEXT DOCUMENTS:\n${contextString}` },
        ...history.filter(h => h.id !== 'intro').map(h => ({
           role: h.role === 'user' ? 'user' : 'model',
           parts: [{ text: h.content }]
        })),
        { role: 'user', parts: [{ text: query }] }
      ]
    });

    return {
      id: Math.random().toString(36).substr(2, 9),
      role: 'ai',
      content: response.text || "I couldn't generate a response based on these documents.",
    };

  } catch (error) {
    console.error("Notebook Chat Error:", error);
    return {
      id: 'error',
      role: 'ai',
      content: "Error: Could not connect to Gemini AI. Please verify your API Key in settings.",
    };
  }
};

// --- STUDY PLAN ---
export const generateStudyPlan = async (
  major: string,
  daysUntilExam: number,
  unreadDocsCount: number,
  examTitle: string
): Promise<StudyBlockSuggestion[]> => {
  try {
    const ai = getClient();
    const modelId = "gemini-3-flash-preview";
    const daysLeft = daysUntilExam; 

    const prompt = `
      Act as an Executive Study Planner for a ${major} student.
      Exam: "${examTitle}" is in ${daysLeft} days.
      Status: ${unreadDocsCount} unread documents.
      
      Create a high-priority, realistic study plan (array of 3-5 blocks) to save the semester.
      Return JSON only.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "ISO Date String" },
              focus: { type: Type.STRING },
              durationMinutes: { type: Type.NUMBER },
              rationale: { type: Type.STRING }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error(e);
    // Fallback
    return [
      { date: new Date().toISOString(), focus: "Emergency Review", durationMinutes: 60, rationale: "AI Offline fallback plan." }
    ];
  }
};

// --- NOTES & OTHERS ---
export const refineNotes = async (
  notes: string,
  goal: 'summarize' | 'polish' | 'structure'
): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ text: `Refine these student notes. Goal: ${goal}.\n\nNotes:\n${notes}` }]
    });
    return response.text || notes;
  } catch (e) {
    return notes;
  }
};
