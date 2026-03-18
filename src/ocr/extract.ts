import fs from 'fs';
import path from 'path';
import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import { config } from '../config.js';
import { OCRResult } from '../types/index.js';

export async function extractTextFromPDF(filePath: string): Promise<OCRResult> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdf = await pdfParse(dataBuffer);

    // Try to extract text layer first
    if (pdf.text && pdf.text.trim().length > 0) {
      return {
        text: pdf.text,
        confidence: 1.0,
      };
    }

    // If no text layer, fall back to OCR on first page
    if (pdf.numpages > 0) {
      return await extractWithTesseract(filePath);
    }

    return { text: '', confidence: 0 };
  } catch (error) {
    console.error(`Error extracting PDF ${filePath}:`, error);
    // Fall back to OCR
    return extractWithTesseract(filePath);
  }
}

export async function extractTextFromImage(filePath: string): Promise<OCRResult> {
  return extractWithTesseract(filePath);
}

async function extractWithTesseract(filePath: string): Promise<OCRResult> {
  try {
    const worker = await Tesseract.createWorker({
      logger: (m) => {
        if (m.status === 'recognizing') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    // Load English language initially
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    // Also load Bosnian if available
    try {
      await worker.loadLanguage('bos');
      await worker.initialize('bos');
    } catch (e) {
      console.warn('Bosnian language pack not available, using English only');
    }

    const result = await worker.recognize(filePath);
    await worker.terminate();

    return {
      text: result.data.text,
      confidence: result.data.confidence / 100,
    };
  } catch (error) {
    console.error(`Error with Tesseract OCR on ${filePath}:`, error);
    return { text: '', confidence: 0 };
  }
}

export async function extractText(filePath: string): Promise<OCRResult> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    return extractTextFromPDF(filePath);
  } else if (['.jpg', '.jpeg', '.png', '.tiff', '.tif'].includes(ext)) {
    return extractTextFromImage(filePath);
  }

  return { text: '', confidence: 0 };
}

export function extractDateRegex(text: string): string | null {
  // Match various date formats
  const patterns = [
    /\b(\d{4}[-\/]\d{2}[-\/]\d{2})\b/, // YYYY-MM-DD or YYYY/MM/DD
    /\b(\d{2}[-\/]\d{2}[-\/]\d{4})\b/, // DD-MM-YYYY or DD/MM/YYYY
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(\d{4})\b/i,
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{4})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}

export function extractRecipientRegex(text: string): { name: string | null; email: string | null } {
  const emailPattern = /([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const emailMatch = text.match(emailPattern);
  const email = emailMatch ? emailMatch[1] : null;

  // Look for recipient patterns
  const recipientPatterns = [
    /(?:Za|Prima|Gospođa|Gospodin|Dear|To|Attn|Attn\.|Recipient|Bill To|Ship To)[\s:]+([^\n,]+)/i,
  ];

  let name: string | null = null;
  for (const pattern of recipientPatterns) {
    const match = text.match(pattern);
    if (match) {
      name = match[1].trim().substring(0, 100);
      break;
    }
  }

  return { name, email };
}
