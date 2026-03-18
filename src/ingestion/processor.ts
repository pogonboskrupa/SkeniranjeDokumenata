import fs from 'fs';
import path from 'path';
import PQueue from 'p-queue';
import { extractText } from '../ocr/extract.js';
import { classifyDocument } from '../classifier/classify.js';
import { insertDocument, updateDocument } from '../storage/db.js';
import { saveDocument, generateDocumentId, ensureDataDirExists } from '../storage/files.js';
import { config } from '../config.js';
import { DocumentMetadata } from '../types/index.js';

const queue = new PQueue({
  concurrency: config.ocrConcurrency,
  interval: 1000,
  intervalCap: config.ocrConcurrency,
});

export async function processDocument(filePath: string): Promise<DocumentMetadata> {
  // Generate document ID
  const id = generateDocumentId();
  const filename = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;
  const now = Date.now();

  // Create initial metadata
  let metadata: DocumentMetadata = {
    id,
    originalFilename: filename,
    filePath: '',
    fileSize,
    uploadedAt: now,
    documentType: 'other',
    keywords: [],
    status: 'pending',
  };

  // Save to database
  insertDocument(metadata);

  // Add to processing queue
  queue.add(async () => {
    try {
      console.log(`Processing document: ${filename}`);

      // Extract text via OCR
      console.log(`Extracting text from ${filename}...`);
      const ocrResult = await extractText(filePath);

      metadata.ocrText = ocrResult.text;

      // Classify document
      console.log(`Classifying ${filename}...`);
      const classification = await classifyDocument(ocrResult.text);

      metadata.date = classification.date || undefined;
      metadata.recipientName = classification.recipient_name || undefined;
      metadata.recipientEmail = classification.recipient_email || undefined;
      metadata.documentType = classification.doc_type;
      metadata.summary = classification.summary;
      metadata.keywords = classification.keywords;

      // Save file to organized storage
      ensureDataDirExists();
      const storagePath = saveDocument(
        filePath,
        metadata,
        metadata.date,
        metadata.recipientName
      );

      metadata.filePath = storagePath;
      metadata.processedAt = Date.now();
      metadata.status = 'completed';

      // Update database
      updateDocument(metadata);

      console.log(`✓ Completed processing: ${filename}`);
      return metadata;
    } catch (error) {
      console.error(`✗ Error processing ${filename}:`, error);

      metadata.status = 'failed';
      metadata.errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      updateDocument(metadata);

      throw error;
    }
  });

  return metadata;
}

export function getQueueStats() {
  return {
    size: queue.size,
    pending: queue.pending,
  };
}

export async function waitForQueue(): Promise<void> {
  return queue.onEmpty();
}
