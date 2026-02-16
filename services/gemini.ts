import { StudyBlockSuggestion, QuizQuestion } from "../types";

// Removed GoogleGenAI import to resolve deployment issues and "remove LM" request.
// This service now operates in simulation mode.

const getApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('LL_GEMINI_KEY') || process.env.API_KEY || '';
  }
  return process.env.API_KEY || '';
};

// Helper to check if API key is present (Mocked to always allow 'simulation' or check strictly)
export const isAiAvailable = () => !!getApiKey();

// --- DOCUMENT ANALYSIS ---
export const analyzeDocument = async (
  fileName: string, 
  userMajor: string,
  fileContent?: string
): Promise<{ executiveSummary: string; tags: string[] }> => {
  // Mock simulation
  return new Promise(resolve => setTimeout(() => resolve({
    executiveSummary: `(Symulacja) Dokument "${fileName}" został przeanalizowany. Zawiera kluczowe definicje i orzecznictwo istotne dla kierunku ${userMajor}. Treść wskazuje na materiał egzaminacyjny.`,
    tags: ["Prawo", "Egzamin", "Symulacja", "Ważne"]
  }), 1500));
};

// --- STUDY PLAN ---
export const generateStudyPlan = async (
  major: string,
  daysUntilExam: number,
  unreadDocsCount: number,
  examTitle: string
): Promise<StudyBlockSuggestion[]> => {
  // Mock simulation
  return new Promise(resolve => setTimeout(() => resolve([
    { date: new Date().toISOString(), focus: "Fundamenty Teorii", durationMinutes: 60, rationale: "Rozpocznij od powtórzenia podstawowych pojęć." },
    { date: new Date(Date.now() + 86400000).toISOString(), focus: "Analiza Orzecznictwa", durationMinutes: 90, rationale: "Skup się na kluczowych wyrokach z ostatnich lat." },
    { date: new Date(Date.now() + 172800000).toISOString(), focus: "Symulacja Egzaminu", durationMinutes: 120, rationale: "Przerób przykładowe pytania testowe." },
  ]), 2000));
};

// --- NOTES & OTHERS ---
export const refineNotes = async (
  notes: string,
  goal: 'summarize' | 'polish' | 'structure'
): Promise<string> => {
  // Mock simulation
  return new Promise(resolve => setTimeout(() => {
    resolve(`(Ulepszone Notatki - Symulacja)\n\n### Kluczowe Wnioski\n\n${notes}\n\n* Treść została sformatowana.\n* Dodano nagłówki.\n* Poprawiono czytelność.`);
  }, 1000));
};

export const analyzeBook = async (title: string, author: string, major: string): Promise<string> => {
  return new Promise(resolve => setTimeout(() => {
    resolve(`Ta książka ("${title}") jest klasyczną pozycją. Omawia fundamentalne zagadnienia w sposób przystępny dla studentów ${major}. Warto zwrócić uwagę na rozdziały wprowadzające.`);
  }, 1000));
};

export const generateCheatSheet = async (subjectTitle: string, topic: string): Promise<string> => {
  return new Promise(resolve => setTimeout(() => {
    resolve(`# Ściąga: ${subjectTitle}\n## Temat: ${topic}\n\n* **Definicja A**: Krótkie wyjaśnienie.\n* **Zasada Prawna**: Ważny punkt do zapamiętania.\n* **Wyjątki**: Lista wyjątków od reguły.\n\n> "Pamiętaj o art. 123 KC."`);
  }, 1000));
};

export const generateQuiz = async (subjectTitle: string, difficulty: 'easy' | 'hard'): Promise<QuizQuestion[]> => {
    return new Promise(resolve => setTimeout(() => {
        resolve([
            {
                question: "Co jest podstawowym źródłem prawa w Polsce?",
                options: ["Konstytucja", "Ustawa", "Rozporządzenie", "Zwyczaj"],
                correctIndex: 0,
                explanation: "Zgodnie z hierarchią aktów prawnych, Konstytucja stoi na szczycie."
            },
            {
                question: "Kiedy wchodzi w życie ustawa (co do zasady)?",
                options: ["Po 7 dniach", "Po 14 dniach", "Natychmiast", "Po miesiącu"],
                correctIndex: 1,
                explanation: "Standardowe vacatio legis wynosi 14 dni, chyba że ustawa stanowi inaczej."
            }
        ]);
    }, 1500));
};