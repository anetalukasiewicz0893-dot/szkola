import JSZip from 'jszip';

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
      // Client-side PDF parsing is heavy (requires pdf.js worker). 
      // For this demo, we return a placeholder telling the AI to treat it as "Content unavailable for direct reading".
      // In a real app, you'd use pdf.js here.
      return "(Treść PDF niedostępna w podglądzie bezpośrednim - symulacja analizy metadanych)";
    }
    
    return "";
  } catch (e) {
    console.error("File parsing error", e);
    return "Error parsing file content.";
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
  // This captures text inside >...< 
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
  return xmlDoc.documentElement.textContent || "";
};
