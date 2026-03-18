export type DocumentType = 'invoice' | 'contract' | 'letter' | 'report' | 'form' | 'other';

export interface DocumentMetadata {
  id: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  uploadedAt: number;
  processedAt?: number;
  ocrText?: string;
  date?: string;
  recipientName?: string;
  recipientEmail?: string;
  documentType: DocumentType;
  summary?: string;
  keywords: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

export interface SearchResult {
  id: string;
  originalFilename: string;
  filePath: string;
  date?: string;
  recipientName?: string;
  documentType: DocumentType;
  summary?: string;
  matchSnippet?: string;
  score: number;
}

export interface SearchQuery {
  text?: string;
  dateFrom?: string;
  dateTo?: string;
  recipient?: string;
  documentType?: DocumentType;
  limit?: number;
  offset?: number;
}
