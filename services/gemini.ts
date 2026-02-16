
import { StudyBlockSuggestion, QuizQuestion, CryptoEntity, ChatMessage } from "../types";

// Removed GoogleGenAI import to resolve deployment issues and "remove LM" request.
// This service now operates in simulation mode with specific logic for the "Advanced Research Hub".

const getApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('LL_GEMINI_KEY') || process.env.API_KEY || '';
  }
  return process.env.API_KEY || '';
};

// Helper to check if API key is present (Mocked to always allow 'simulation' or check strictly)
export const isAiAvailable = () => !!getApiKey();

// --- TIER 1 AI: CRYPTO FORENSICS & DOCUMENT ANALYSIS ---

const KNOWN_CRIMINAL_ENTITIES = [
  "0x1234...abcd", // Mock stolen funds wallet
  "FTX",
  "Alameda",
  "Tornado Cash",
  "Lazarus Group",
  "Pig Butchering",
  "Rug Pull"
];

const scanForCryptoEntities = (text: string): CryptoEntity[] => {
  const entities: CryptoEntity[] = [];
  
  // 1. Regex for ETH addresses (Simplified)
  const ethRegex = /0x[a-fA-F0-9]{40}/g;
  const ethMatches = text.match(ethRegex) || [];
  
  ethMatches.forEach(match => {
    entities.push({
      type: 'WALLET',
      value: match,
      confidence: 0.99,
      flagged: KNOWN_CRIMINAL_ENTITIES.includes(match)
    });
  });

  // 2. Keyword scan for Exchanges/Fraud
  KNOWN_CRIMINAL_ENTITIES.forEach(term => {
    if (text.includes(term) && !term.startsWith('0x')) {
       entities.push({
         type: term === 'Rug Pull' || term === 'Pig Butchering' ? 'FRAUD_TYPOLOGY' : 'EXCHANGE',
         value: term,
         confidence: 0.95,
         flagged: true
       });
    }
  });

  // 3. Generic detections (Mock)
  if (text.toLowerCase().includes('bitcoin')) {
    entities.push({ type: 'TOKEN', value: 'Bitcoin (BTC)', confidence: 1, flagged: false });
  }

  return entities;
};

export const analyzeDocument = async (
  fileName: string, 
  userMajor: string,
  fileContent?: string
): Promise<{ executiveSummary: string; tags: string[]; cryptoEntities: CryptoEntity[] }> => {
  
  const entities = fileContent ? scanForCryptoEntities(fileContent) : [];
  const hasFlagged = entities.some(e => e.flagged);

  // Mock simulation logic
  return new Promise(resolve => setTimeout(() => resolve({
    executiveSummary: `(Tier 1 AI) Dokument "${fileName}" został przeskanowany. ${hasFlagged ? '**WYKRYTO ZAGROŻENIA KRYPTOGRAFICZNE**.' : 'Brak znanych powiązań przestępczych.'} Treść dotyczy ${userMajor} i zawiera kluczowe dane finansowe/prawne.`,
    tags: ["Analiza Finansowa", hasFlagged ? "FLAGA: PRZESTĘPSTWO" : "Czysty", "Prawo Karne", "Dowody"],
    cryptoEntities: entities
  }), 1500));
};

// --- TIER 2 AI: NOTEBOOK RESEARCH ENGINE ---

export const notebookChat = async (
  query: string,
  contextDocs: { name: string; content: string }[],
  history: ChatMessage[]
): Promise<ChatMessage> => {
  // Simulate Deep Research
  return new Promise(resolve => setTimeout(() => {
    
    // Simulate finding citations
    const citations = contextDocs
      .filter(doc => Math.random() > 0.5) // Randomly pick docs as "sources"
      .map(doc => `${doc.name} (Str. ${Math.floor(Math.random() * 10) + 1})`);

    const responseText = citations.length > 0 
      ? `Na podstawie analizy źródeł, ${query} odnosi się do złożonych mechanizmów prania pieniędzy. W szczególności dokumenty wskazują na powiązania z miksowaniem transakcji (zob. ${citations[0]}).`
      : `Przeanalizowałem dostępne dokumenty, ale nie znalazłem bezpośredniej odpowiedzi na "${query}" w dostarczonym kontekście.`;

    resolve({
      id: Math.random().toString(36).substr(2, 9),
      role: 'ai',
      content: responseText,
      citations: citations,
      timestamp: Date.now()
    });
  }, 2000)); // Longer delay for "Deep Research" feel
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
