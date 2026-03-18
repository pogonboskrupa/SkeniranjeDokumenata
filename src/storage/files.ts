import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { DocumentMetadata } from '../types/index.js';

export function generateDocumentId(): string {
  return randomUUID();
}

export function getStoragePath(
  year: string,
  month: string,
  recipient: string,
  filename: string
): string {
  // Sanitize recipient name for use in path
  const sanitizedRecipient = sanitizePathComponent(recipient || 'unknown');

  const storagePath = path.join(
    config.sortedDir,
    year,
    month.padStart(2, '0'),
    sanitizedRecipient,
    filename
  );

  return storagePath;
}

export function saveDocument(
  sourceFile: string,
  metadata: DocumentMetadata,
  docDate?: string,
  recipient?: string
): string {
  // Ensure source file exists
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Source file not found: ${sourceFile}`);
  }

  // Determine year and month
  let year = new Date().getFullYear().toString();
  let month = String(new Date().getMonth() + 1);

  if (docDate) {
    try {
      const date = new Date(docDate);
      year = date.getFullYear().toString();
      month = String(date.getMonth() + 1);
    } catch (e) {
      console.warn(`Invalid date format: ${docDate}, using current date`);
    }
  }

  const recipientName = recipient || metadata.recipientName || 'unknown';
  const targetPath = getStoragePath(year, month, recipientName, metadata.originalFilename);

  // Ensure target directory exists
  const targetDir = path.dirname(targetPath);
  fs.mkdirSync(targetDir, { recursive: true });

  // Move/copy file to sorted location
  fs.copyFileSync(sourceFile, targetPath);

  // Return relative path from data directory for portability
  return path.relative(config.dataDir, targetPath);
}

export function readDocument(filePath: string): Buffer {
  const fullPath = path.join(config.dataDir, filePath);

  // Security check: ensure path is within dataDir
  const resolved = path.resolve(fullPath);
  const dataDir = path.resolve(config.dataDir);
  if (!resolved.startsWith(dataDir)) {
    throw new Error('Invalid file path');
  }

  return fs.readFileSync(fullPath);
}

export function deleteDocument(filePath: string): void {
  const fullPath = path.join(config.dataDir, filePath);

  // Security check
  const resolved = path.resolve(fullPath);
  const dataDir = path.resolve(config.dataDir);
  if (!resolved.startsWith(dataDir)) {
    throw new Error('Invalid file path');
  }

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);

    // Clean up empty directories
    let dirPath = path.dirname(fullPath);
    while (dirPath !== config.dataDir && fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      if (files.length === 0) {
        fs.rmdirSync(dirPath);
        dirPath = path.dirname(dirPath);
      } else {
        break;
      }
    }
  }
}

export function getFullPath(filePath: string): string {
  const fullPath = path.join(config.dataDir, filePath);

  // Security check
  const resolved = path.resolve(fullPath);
  const dataDir = path.resolve(config.dataDir);
  if (!resolved.startsWith(dataDir)) {
    throw new Error('Invalid file path');
  }

  return fullPath;
}

function sanitizePathComponent(component: string): string {
  return component
    .toLowerCase()
    .replace(/[^a-z0-9 _-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)
    .trim() || 'unknown';
}

export function ensureDataDirExists(): void {
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true });
  }
  if (!fs.existsSync(config.sortedDir)) {
    fs.mkdirSync(config.sortedDir, { recursive: true });
  }
}
