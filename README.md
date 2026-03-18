# DocSort - Full-Stack Document Management System

A comprehensive document management system with OCR, AI-powered classification, and full-text search capabilities.

## Features

- **Document Ingestion**: Watch local folders for new PDF/image files or upload via web UI
- **OCR Pipeline**: Tesseract.js-based text extraction with PDF layer support
- **AI Classification**: Claude API integration for automatic document type detection and metadata extraction
- **Full-Text Search**: SQLite FTS5 for instant sub-500ms searches on 10k+ documents
- **File Organization**: Automatic folder structure: `/sorted/{year}/{month}/{recipient}/`
- **Web UI**: Next.js 14 dashboard with upload, search, and document management
- **REST API**: Express server with comprehensive document endpoints

## Supported Document Formats

- PDF (with text layer or scanned/image-based)
- JPG, JPEG
- PNG
- TIFF, TIF

## Tech Stack

### Backend
- **Runtime**: Node.js + TypeScript
- **API**: Express
- **Database**: SQLite with FTS5 virtual table
- **OCR**: Tesseract.js (no binary dependencies)
- **AI**: Anthropic SDK (Claude Haiku)
- **File Watching**: Chokidar
- **Task Queue**: p-queue

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **HTTP Client**: Fetch API

## Prerequisites

- Node.js 18+ and npm
- ANTHROPIC_API_KEY (from https://console.anthropic.com)
- 2GB+ disk space for database and documents

## Installation & Setup

### 1. Clone and Install Dependencies

```bash
cd /path/to/docsort

# Backend dependencies
npm install

# Frontend dependencies
cd web && npm install && cd ..
```

### 2. Configure Environment Variables

```bash
# Copy example to .env
cp .env.example .env

# Edit .env and set your ANTHROPIC_API_KEY
# IMPORTANT: Set ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Create Scan Directory

```bash
mkdir -p ~/scans
# Or set SCAN_WATCH_DIR in .env to a different location
```

### 4. Download Tesseract Language Packs

The first time OCR runs, Tesseract.js will download language packs. For offline use or faster processing, pre-download:

```bash
# Language packs are auto-downloaded on first use
# This may take a few minutes on first OCR processing
```

**Supported Languages**:
- English (eng) - default
- Bosnian (bos) - available if installed

## Running the System

### Option A: Development Mode (Recommended)

**Terminal 1 - Backend API Server**:
```bash
API_PORT=5000 npm run api
```

**Terminal 2 - Folder Watcher**:
```bash
ANTHROPIC_API_KEY=sk-ant-... npm run watch
```

**Terminal 3 - Frontend Development Server**:
```bash
cd web
npm run dev
```

Access the web UI at: **http://localhost:3000**

### Option B: Build and Run

```bash
# Build backend
npm run build

# Run API server
API_PORT=5000 node dist/api/server.js

# Run watcher in another terminal
node dist/ingestion/watcher.js
```

## Usage

### 1. Upload Documents

1. Go to **http://localhost:3000/upload**
2. Drag and drop documents or click to select files
3. Supported formats: PDF, JPG, PNG, TIFF

### 2. Automatic Processing

- Documents are queued with concurrency=2 (configurable)
- Each document: OCR → Classification → Storage
- Processing time: 5-15 seconds per document (varies by size)

### 3. Search Documents

1. Go to **http://localhost:3000/search**
2. Search by:
   - Keywords (OCR text + metadata)
   - Document type (invoice, contract, letter, etc.)
   - Date range
   - Recipient name
3. Results ranked by relevance

### 4. Folder Watching

Copy documents to `~/scans` (or `SCAN_WATCH_DIR`):
```bash
cp ~/Downloads/invoice.pdf ~/scans/
# Document automatically detected and processed
```

## Project Structure

```
docsort/
├── src/
│   ├── config.ts              # Configuration & env variables
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   ├── ocr/
│   │   └── extract.ts         # Tesseract + PDF text extraction
│   ├── classifier/
│   │   └── classify.ts        # Claude API classification
│   ├── storage/
│   │   ├── db.ts              # SQLite FTS5 operations
│   │   └── files.ts           # File organization & I/O
│   ├── ingestion/
│   │   ├── processor.ts       # Async queue processing
│   │   └── watcher.ts         # Chokidar folder monitoring
│   ├── search/                # (Reserved for future)
│   └── api/
│       └── server.ts          # Express REST API
├── web/                        # Next.js 14 frontend
│   ├── app/
│   │   ├── layout.tsx         # Root layout with sidebar
│   │   ├── page.tsx           # Dashboard
│   │   ├── upload/page.tsx    # Upload page
│   │   ├── search/page.tsx    # Search page
│   │   └── documents/
│   │       ├── page.tsx       # Documents list
│   │       └── [id]/page.tsx  # Document detail
│   ├── lib/
│   │   ├── api.ts             # API client
│   │   └── types.ts           # Frontend types
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── next.config.js
│   └── postcss.config.js
├── data/
│   ├── docsort.db             # SQLite database
│   ├── sorted/                # Organized documents
│   │   ├── 2025/
│   │   │   ├── 01/
│   │   │   │   └── john_doe/
│   │   │   │       └── invoice_12345.pdf
│   │   └── 2024/
│   └── temp/                  # Temporary uploads
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## API Endpoints

### Health & Stats
- `GET /api/health` - Health check
- `GET /api/stats` - System statistics

### Documents
- `GET /api/documents?limit=50&offset=0` - List documents
- `GET /api/documents/:id` - Get document details
- `GET /api/documents/:id/file` - Download document file
- `POST /api/upload` - Upload new document
- `PUT /api/documents/:id` - Update document metadata
- `DELETE /api/documents/:id` - Delete document

### Search
- `POST /api/search` - Search documents with filters

### Search Query Format
```json
{
  "text": "invoice",
  "documentType": "invoice",
  "dateFrom": "2025-01-01",
  "dateTo": "2025-12-31",
  "recipient": "john",
  "limit": 50,
  "offset": 0
}
```

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | - | **Required**: Your Anthropic API key |
| `SCAN_WATCH_DIR` | `~/scans` | Directory to watch for new files |
| `DATA_DIR` | `./data` | Base data directory |
| `SORTED_DIR` | `./data/sorted` | Directory for organized documents |
| `DB_PATH` | `./data/docsort.db` | SQLite database location |
| `API_PORT` | `5000` | Express server port |
| `OCR_CONCURRENCY` | `2` | Parallel OCR processing limit |
| `OCR_TIMEOUT` | `120000` | OCR timeout in milliseconds |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` | Frontend API URL |

## Performance Characteristics

- **Search**: <500ms for 10,000 documents (FTS5 BM25 ranking)
- **OCR**: 5-15s per document (depending on size/complexity)
- **Classification**: 1-2s per document (Claude Haiku)
- **Database**: WAL mode for concurrent reads
- **Concurrency**: 2 documents processing in parallel (configurable)

## Troubleshooting

### API Connection Error
```
Error: Failed to search documents
```
- Ensure backend API is running: `npm run api`
- Check API_PORT in .env (default: 5000)
- Verify NEXT_PUBLIC_API_URL in .env matches API port

### OCR Not Working
```
Error with Tesseract OCR
```
- First OCR run downloads ~40MB language packs (internet required)
- Check disk space in data directory
- Verify SCAN_WATCH_DIR exists and is readable

### Database Locked
```
database is locked
```
- SQLite WAL mode should handle this
- If persists, check for stale processes: `lsof | grep docsort.db`
- Delete `.db-wal` and `.db-shm` files if necessary

### No API Key Error
```
ANTHROPIC_API_KEY environment variable is required
```
- Get key from: https://console.anthropic.com
- Set in .env: `ANTHROPIC_API_KEY=sk-ant-...`
- Restart backend after changing .env

## Document Type Detection

Classification uses Claude API with fallback regex:

- **Invoice**: Keywords: "invoice", "racun"
- **Contract**: Keywords: "contract", "ugovor", "sporazum"
- **Letter**: Keywords: "letter", "pismo", "dear"
- **Report**: Keywords: "report", "izvestaj", "izvještaj"
- **Form**: Keywords: "form", "forma", "obrazac"
- **Other**: Default type for unclassified

## Database Schema

### documents table
```sql
CREATE TABLE documents (
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
  status TEXT NOT NULL,
  error_message TEXT
)
```

### documents_fts (virtual table)
Full-text search index on: filename, OCR text, recipient, summary, keywords

## Development

### Adding a New Page
1. Create file: `web/app/path/page.tsx`
2. Import components and API functions
3. Use `'use client'` for interactive features

### Adding API Endpoints
1. Add route handler in `src/api/server.ts`
2. Update types in `src/types/index.ts`
3. Test with curl or Postman

### Extending OCR
1. Add language packs in `src/ocr/extract.ts`
2. Load in `extractWithTesseract()` function
3. Requires language pack files (~5-10MB each)

## Limitations & Future Work

- No multi-user authentication
- No Google Drive sync (optional module not implemented)
- No advanced analytics dashboard
- Document text search limited to first 1000 chars
- No export/reporting features

## License

MIT

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review logs in backend terminal
3. Ensure ANTHROPIC_API_KEY is correctly set
4. Verify all dependencies installed: `npm install`

## Performance Tips

1. **Increase OCR_CONCURRENCY** for faster bulk processing:
   ```bash
   OCR_CONCURRENCY=4 npm run watch
   ```

2. **Optimize database**:
   ```bash
   # Rebuild FTS index
   npm run build && API_PORT=5000 npm run api
   ```

3. **Archive old documents**: Move completed documents to external storage

4. **Monitor queue**:
   - Check `/api/stats` endpoint periodically
   - Watch terminal logs for processing status
