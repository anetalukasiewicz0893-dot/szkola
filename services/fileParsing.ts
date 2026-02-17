
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker. Using unpkg ensures we get the worker matching our exact npm version.
// We explicitly set the version to match the import map in index.html (5.4.624) to avoid version mismatch errors.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs`;

export const extractTextFromFile = async (file: File): Promise<string> => {
  const type = file.type;
  const name = file.name.toLowerCase();

  try {
    if (type === 'text/plain' || name.endsWith('.txt')) {
      return await file.text();
    } 
    else if (name.endsWith('.docx')) {
      return await parseDocx(file);
    } 
    else if (name.endsWith('.pptx')) {
      return await parsePptx(file);
    } 
    else if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return await parsePdf(file);
    }
    
    return "";
  } catch (e) {
    console.error("File parsing error", e);
    return "Error parsing file content. Please ensure the file is not corrupted.";
  }
};

const parsePdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    // Limit pages to avoid browser crash on massive docs in this demo environment
    const maxPages = Math.min(pdf.numPages, 50); 
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        // @ts-ignore - 'str' exists on TextItem
        .map((item) => item.str)
        .join(' ');
      
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    
    if (pdf.numPages > maxPages) {
        fullText += `\n... (Truncated after ${maxPages} pages for performance) ...`;
    }

    return fullText;
  } catch (error) {
    console.error("PDF Parse Error:", error);
    throw new Error("Failed to parse PDF.");
  }
};

const parseDocx = async (file: File): Promise<string> => {
  const zip = await JSZip.loadAsync(file);
  const xmlContent = await zip.file("word/document.xml")?.async("string");
  if (!xmlContent) return "";
  return parseXml(xmlContent);
};

const parsePptx = async (file: File): Promise<string> => {
  const zip = await JSZip.loadAsync(file);
  const files = Object.keys(zip.files).filter(fileName => 
    fileName.startsWith("ppt/slides/slide") && fileName.endsWith(".xml")
  );

  let fullText = "";
  
  // Sort slides to maintain order roughly (slide1, slide10, etc issue handled simply here)
  files.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''));
      const numB = parseInt(b.replace(/\D/g, ''));
      return numA - numB;
  });

  for (const fileName of files) {
    const xmlContent = await zip.file(fileName)?.async("string");
    if (xmlContent) {
      fullText += `--- SLIDE ${fileName} ---\n` + parseXml(xmlContent) + "\n\n";
    }
  }
  return fullText;
};

const parseXml = (xmlStr: string): string => {
  // Simple regex to strip XML tags and get text content
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
  return xmlDoc.documentElement.textContent || "";
};
