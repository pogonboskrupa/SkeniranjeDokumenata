import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';
import { DocumentMetadata, SearchQuery, SearchResult } from '../types/index.js';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  // Ensure data directory exists
  const dataDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initializeSchema();
  return db;
}

function initializeSchema(): void {
  if (!db) return;

  // Create documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      original_filename TEXT NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      file_size INTEGER NOT NULL,
      uploaded_at INTEGER NOT NULL,
      processed_at INTEGER,
      ocr_text TEXT,
      date TEXT,
      recipient_name TEXT,
      recipient_email TEXT,
      document_type TEXT NOT NULL,
      summary TEXT,
      keywords TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT
    )
  `);

  // Create FTS5 virtual table for full-text search
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      id UNINDEXED,
      original_filename,
      ocr_text,
      recipient_name,
      summary,
      keywords,
      content=documents,
      content_rowid=rowid
    )
  `);

  // Create triggers to keep FTS table in sync
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
      INSERT INTO documents_fts(rowid, id, original_filename, ocr_text, recipient_name, summary, keywords)
      VALUES (new.rowid, new.id, new.original_filename, new.ocr_text, new.recipient_name, new.summary, new.keywords);
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
      DELETE FROM documents_fts WHERE rowid = old.rowid;
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
      UPDATE documents_fts SET
        original_filename = new.original_filename,
        ocr_text = new.ocr_text,
        recipient_name = new.recipient_name,
        summary = new.summary,
        keywords = new.keywords
      WHERE rowid = old.rowid;
    END;
  `);
}

export function insertDocument(doc: DocumentMetadata): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO documents (
      id, original_filename, file_path, file_size, uploaded_at, processed_at,
      ocr_text, date, recipient_name, recipient_email, document_type,
      summary, keywords, status, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    doc.id,
    doc.originalFilename,
    doc.filePath,
    doc.fileSize,
    doc.uploadedAt,
    doc.processedAt || null,
    doc.ocrText || null,
    doc.date || null,
    doc.recipientName || null,
    doc.recipientEmail || null,
    doc.documentType,
    doc.summary || null,
    JSON.stringify(doc.keywords),
    doc.status,
    doc.errorMessage || null
  );
}

export function updateDocument(doc: DocumentMetadata): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE documents SET
      processed_at = ?,
      ocr_text = ?,
      date = ?,
      recipient_name = ?,
      recipient_email = ?,
      document_type = ?,
      summary = ?,
      keywords = ?,
      status = ?,
      error_message = ?
    WHERE id = ?
  `);

  stmt.run(
    doc.processedAt || null,
    doc.ocrText || null,
    doc.date || null,
    doc.recipientName || null,
    doc.recipientEmail || null,
    doc.documentType,
    doc.summary || null,
    JSON.stringify(doc.keywords),
    doc.status,
    doc.errorMessage || null,
    doc.id
  );
}

export function getDocument(id: string): DocumentMetadata | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM documents WHERE id = ?
  `);

  const row = stmt.get(id) as any;
  if (!row) return null;

  return rowToDocument(row);
}

export function listDocuments(limit: number = 50, offset: number = 0): DocumentMetadata[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM documents
    ORDER BY uploaded_at DESC
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(limit, offset) as any[];
  return rows.map(rowToDocument);
}

export function searchDocuments(query: SearchQuery): { results: SearchResult[]; total: number } {
  const db = getDatabase();

  let searchSql = `
    SELECT d.*, df.rank
    FROM documents d
    LEFT JOIN documents_fts df ON d.id = df.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (query.text) {
    searchSql += ` AND df.rowid IN (
      SELECT rowid FROM documents_fts WHERE documents_fts MATCH ?
    )`;
    params.push(query.text.replace(/[()]/g, ''));
  }

  if (query.dateFrom) {
    searchSql += ` AND d.date >= ?`;
    params.push(query.dateFrom);
  }

  if (query.dateTo) {
    searchSql += ` AND d.date <= ?`;
    params.push(query.dateTo);
  }

  if (query.recipient) {
    searchSql += ` AND (d.recipient_name LIKE ? OR d.recipient_email LIKE ?)`;
    const likePattern = `%${query.recipient}%`;
    params.push(likePattern, likePattern);
  }

  if (query.documentType) {
    searchSql += ` AND d.document_type = ?`;
    params.push(query.documentType);
  }

  // Get total count
  const countSql = searchSql.replace(
    /SELECT.*?FROM documents/,
    'SELECT COUNT(*) as count FROM documents'
  );
  const countStmt = db.prepare(countSql);
  const countResult = countStmt.get(...params) as any;
  const total = countResult.count || 0;

  // Get results
  searchSql += ` ORDER BY df.rank DESC, d.uploaded_at DESC`;
  searchSql += ` LIMIT ? OFFSET ?`;
  params.push(query.limit || 50, query.offset || 0);

  const stmt = db.prepare(searchSql);
  const rows = stmt.all(...params) as any[];

  const results: SearchResult[] = rows.map((row) => ({
    id: row.id,
    originalFilename: row.original_filename,
    filePath: row.file_path,
    date: row.date,
    recipientName: row.recipient_name,
    documentType: row.document_type,
    summary: row.summary,
    score: row.rank || 0,
  }));

  return { results, total };
}

export function deleteDocument(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    DELETE FROM documents WHERE id = ?
  `);
  stmt.run(id);
}

function rowToDocument(row: any): DocumentMetadata {
  return {
    id: row.id,
    originalFilename: row.original_filename,
    filePath: row.file_path,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
    processedAt: row.processed_at,
    ocrText: row.ocr_text,
    date: row.date,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    documentType: row.document_type,
    summary: row.summary,
    keywords: row.keywords ? JSON.parse(row.keywords) : [],
    status: row.status,
    errorMessage: row.error_message,
  };
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
