import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { extractDateRegex, extractRecipientRegex } from '../ocr/extract.js';
import { ClassificationResult, DocumentType } from '../types/index.js';

const client = new Anthropic({
  apiKey: config.apiKey,
});

export async function classifyDocument(ocrText: string): Promise<ClassificationResult> {
  // Prepare text for Claude (first 2000 chars to stay within reasonable token limits)
  const textForClaude = ocrText.substring(0, 2000);

  const prompt = `Extract from this document text:
${textForClaude}

Return ONLY valid JSON with no markdown formatting, no code blocks, just the raw JSON object:
{
  "date": "YYYY-MM-DD or null",
  "recipient_name": "string or null",
  "recipient_email": "string or null",
  "doc_type": "invoice|contract|letter|report|form|other",
  "summary": "max 20 words",
  "keywords": ["max 5 keywords"]
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-20250514',
      max_tokens: 500,
      system:
        'You are a document metadata extractor. Return ONLY valid JSON. Do not include markdown code blocks or any text outside the JSON object.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse the JSON response
    let result: ClassificationResult;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw parseError;
      }
    }

    // Validate and normalize the result
    return normalizeClassificationResult(result);
  } catch (error) {
    console.error('Error classifying document with Claude:', error);
    // Fall back to regex extraction
    return classifyDocumentWithRegex(ocrText);
  }
}

function normalizeClassificationResult(result: any): ClassificationResult {
  const validDocTypes: DocumentType[] = ['invoice', 'contract', 'letter', 'report', 'form', 'other'];

  return {
    date: result.date || null,
    recipient_name: result.recipient_name || null,
    recipient_email: result.recipient_email || null,
    doc_type: (validDocTypes.includes(result.doc_type) ? result.doc_type : 'other') as DocumentType,
    summary: (result.summary || '').substring(0, 200),
    keywords: Array.isArray(result.keywords) ? result.keywords.slice(0, 5) : [],
  };
}

export function classifyDocumentWithRegex(ocrText: string): ClassificationResult {
  const date = extractDateRegex(ocrText);
  const { name, email } = extractRecipientRegex(ocrText);

  // Simple document type detection
  let docType: DocumentType = 'other';
  const lowerText = ocrText.toLowerCase();
  if (lowerText.includes('invoice') || lowerText.includes('racun')) {
    docType = 'invoice';
  } else if (lowerText.includes('contract') || lowerText.includes('ugovor') || lowerText.includes('sporazum')) {
    docType = 'contract';
  } else if (lowerText.includes('letter') || lowerText.includes('pismo') || lowerText.includes('dear')) {
    docType = 'letter';
  } else if (lowerText.includes('report') || lowerText.includes('izvestaj') || lowerText.includes('izvještaj')) {
    docType = 'report';
  } else if (lowerText.includes('form') || lowerText.includes('forma') || lowerText.includes('obrazac')) {
    docType = 'form';
  }

  // Extract keywords from text
  const words = ocrText
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 5);

  return {
    date: date || null,
    recipient_name: name || null,
    recipient_email: email || null,
    doc_type: docType,
    summary: ocrText.substring(0, 200),
    keywords: words,
  };
}
