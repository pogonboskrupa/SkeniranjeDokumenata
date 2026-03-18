import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';
import { processDocument } from './processor.js';
import { getDatabase } from '../storage/db.js';

const supportedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif'];

// Initialize database on startup
getDatabase();

function isSupportedFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return supportedExtensions.includes(ext);
}

async function handleNewFile(filePath: string): Promise<void> {
  // Skip temporary or hidden files
  if (path.basename(filePath).startsWith('.')) {
    return;
  }

  if (!isSupportedFile(filePath)) {
    console.log(`Skipping unsupported file: ${filePath}`);
    return;
  }

  // Wait a moment to ensure file is fully written
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if file still exists and is readable
  try {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const stats = fs.statSync(filePath);
    if (stats.isFile() && stats.size > 0) {
      console.log(`New document detected: ${filePath}`);
      await processDocument(filePath);
    }
  } catch (error) {
    console.error(`Error handling file ${filePath}:`, error);
  }
}

export async function startWatcher(): Promise<void> {
  // Ensure watch directory exists
  if (!fs.existsSync(config.scanWatchDir)) {
    fs.mkdirSync(config.scanWatchDir, { recursive: true });
    console.log(`Created scan directory: ${config.scanWatchDir}`);
  }

  console.log(`Starting folder watcher on: ${config.scanWatchDir}`);

  const watcher = chokidar.watch(config.scanWatchDir, {
    ignored: /(^|[\/\\])\.|node_modules|\.db/,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
    persistent: true,
    ignoreInitial: false,
  });

  watcher
    .on('add', (filePath) => {
      console.log(`File added: ${filePath}`);
      handleNewFile(filePath).catch((error) => {
        console.error(`Error processing new file:`, error);
      });
    })
    .on('error', (error) => {
      console.error(`Watcher error:`, error);
    });

  console.log('Folder watcher started');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startWatcher().catch((error) => {
    console.error('Failed to start watcher:', error);
    process.exit(1);
  });
}
