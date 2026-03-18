import express, { Request, Response } from 'express';
import { config } from '../config.js';
import {
  listDocuments,
  searchDocuments,
  getDocument,
  deleteDocument as deleteDocumentFromDb,
} from '../storage/db.js';
import {
  deleteDocument,
  ensureDataDirExists,
  readDocument,
} from '../storage/files.js';
import { processDocument } from '../ingestion/processor.js';
import { DocumentMetadata, SearchQuery } from '../types/index.js';
import fs from 'fs';
import path from 'path';

const app = express();

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Initialize data directory
ensureDataDirExists();

// Routes

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

/**
 * GET /api/documents
 * List all documents
 */
app.get('/api/documents', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const documents = listDocuments(limit, offset);
    return res.json({ documents, limit, offset });
  } catch (error) {
    console.error('Error listing documents:', error);
    return     res.status(500).json({ error: 'Failed to list documents' });
  }
});

/**
 * GET /api/documents/:id
 * Get a specific document
 */
app.get('/api/documents/:id', (req: Request, res: Response) => {
  try {
    const doc = getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    return res.json(doc);
  } catch (error) {
    console.error('Error getting document:', error);
    return     res.status(500).json({ error: 'Failed to get document' });
  }
});

/**
 * GET /api/documents/:id/file
 * Download document file
 */
app.get('/api/documents/:id/file', (req: Request, res: Response) => {
  try {
    const doc = getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const fileBuffer = readDocument(doc.filePath);
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${doc.originalFilename}"`);
    return res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading document:', error);
    return     res.status(500).json({ error: 'Failed to download document' });
  }
});

/**
 * POST /api/search
 * Search documents
 */
app.post('/api/search', (req: Request, res: Response) => {
  try {
    const query: SearchQuery = req.body;
    const { results, total } = searchDocuments(query);
    return res.json({ results, total, limit: query.limit || 50, offset: query.offset || 0 });
  } catch (error) {
    console.error('Error searching documents:', error);
    return     res.status(500).json({ error: 'Failed to search documents' });
  }
});

/**
 * POST /api/upload
 * Upload and process a new document
 */
app.post('/api/upload', express.raw({ type: 'application/octet-stream' }), async (req: Request, res: Response) => {
  try {
    const filename = req.headers['x-filename'] as string;
    if (!filename) {
      return res.status(400).json({ error: 'x-filename header is required' });
    }

    // Save uploaded file to temporary location
    const tempDir = path.join(config.dataDir, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempPath = path.join(tempDir, `${Date.now()}_${filename}`);
    fs.writeFileSync(tempPath, req.body as Buffer);

    // Process document
    const metadata = await processDocument(tempPath);

    // Clean up temp file
    fs.unlinkSync(tempPath);

    return res.json({
      message: 'Document uploaded and queued for processing',
      documentId: metadata.id,
      status: metadata.status,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return     res.status(500).json({
      error: 'Failed to upload document',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
app.delete('/api/documents/:id', (req: Request, res: Response) => {
  try {
    const doc = getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from storage
    deleteDocument(doc.filePath);

    // Delete from database
    deleteDocumentFromDb(req.params.id);

    return res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return     res.status(500).json({ error: 'Failed to delete document' });
  }
});

/**
 * PUT /api/documents/:id
 * Update document metadata
 */
app.put('/api/documents/:id', (req: Request, res: Response) => {
  try {
    const doc = getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update metadata
    const updates: Partial<DocumentMetadata> = req.body;
    const updated = { ...doc, ...updates };

    // Validate document type
    const validTypes = ['invoice', 'contract', 'letter', 'report', 'form', 'other'];
    if (updates.documentType && !validTypes.includes(updates.documentType)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    // Update in database
    require('../storage/db.js').updateDocument(updated);

    return res.json(updated);
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({ error: 'Failed to update document' });
  }
});

/**
 * GET /api/stats
 * Get system statistics
 */
app.get('/api/stats', (req: Request, res: Response) => {
  try {
    const documents = listDocuments(1000);
    const completed = documents.filter((d) => d.status === 'completed').length;
    const pending = documents.filter((d) => d.status === 'pending').length;
    const failed = documents.filter((d) => d.status === 'failed').length;

    // Statistics by document type
    const byType = documents.reduce(
      (acc, d) => {
        if (!acc[d.documentType]) {
          acc[d.documentType] = 0;
        }
        acc[d.documentType]++;
        return acc;
      },
      {} as Record<string, number>
    );

    return res.json({
      totalDocuments: documents.length,
      completed,
      pending,
      failed,
      totalSize: documents.reduce((sum, d) => sum + d.fileSize, 0),
      byType,
      recentDays: {
        today: documents.filter((d) => {
          const today = new Date();
          const docDate = new Date(d.uploadedAt);
          return docDate.toDateString() === today.toDateString();
        }).length,
        thisWeek: documents.filter((d) => {
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return new Date(d.uploadedAt) > weekAgo;
        }).length,
      },
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    return     res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * POST /api/documents/batch/delete
 * Delete multiple documents
 */
app.post('/api/documents/batch/delete', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    let deleted = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const doc = getDocument(id);
        if (doc) {
          deleteDocument(doc.filePath);
          deleteDocumentFromDb(id);
          deleted++;
        }
      } catch (error) {
        errors.push(`${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return res.json({
      deleted,
      total: ids.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error deleting documents:', error);
    return res.status(500).json({ error: 'Failed to delete documents' });
  }
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = config.apiPort;
app.listen(PORT, () => {
  console.log(`DocSort API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
