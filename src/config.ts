import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Config {
  apiKey: string;
  scanWatchDir: string;
  dataDir: string;
  sortedDir: string;
  dbPath: string;
  apiPort: number;
  ocrConcurrency: number;
  ocrTimeout: number;
}

function getConfig(): Config {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return {
    apiKey,
    scanWatchDir: process.env.SCAN_WATCH_DIR || path.join(process.env.HOME || '/tmp', 'scans'),
    dataDir: process.env.DATA_DIR || path.join(__dirname, '..', 'data'),
    sortedDir: process.env.SORTED_DIR || path.join(__dirname, '..', 'data', 'sorted'),
    dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'docsort.db'),
    apiPort: parseInt(process.env.API_PORT || '5000', 10),
    ocrConcurrency: parseInt(process.env.OCR_CONCURRENCY || '2', 10),
    ocrTimeout: parseInt(process.env.OCR_TIMEOUT || '120000', 10),
  };
}

export const config = getConfig();
