# DocSort Scanner Setup Guide

Complete guide to set up DocSort with your Brother or Toshiba scanner.

## Prerequisites

- **Linux System** (Ubuntu 20.04+, Debian, Fedora, etc.)
- **SANE Scanner Support** (Brother, Toshiba, Canon, HP, etc.)
- **Node.js 16+**
- **ImageMagick** (for image conversion)

## 1. Install SANE Scanner Support

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install sane sane-utils scanimage imagemagick

# Add current user to scanner group
sudo usermod -a -G scanner $USER
# Log out and back in for group changes to take effect
```

### Fedora/RHEL
```bash
sudo dnf install sane sane-backends sane-backends-drivers-scanners imagemagick

# Add user to scanner group
sudo usermod -a -G scanner $USER
```

### Arch Linux
```bash
sudo pacman -S sane imagemagick

# Add user to scanner group
sudo usermod -a -G scanner $USER
```

## 2. Detect Your Scanner

```bash
# List all available scanners
scanimage -A

# Example output:
# Device: brother3:net:192.168.1.100
#   Vendor: Brother
#   Model: Brother HL-L8360CDW
#   Type: Multi-function scanner/printer
```

## 3. Test Your Scanner

```bash
# Test scanning from detected device
scanimage --device-name 'brother3:net:192.168.1.100' --resolution 300 > test.pnm

# Convert to PDF
convert test.pnm test.pdf

# View the PDF
evince test.pdf
```

## 4. Configure Scanner in DocSort

### Step 1: Set Up Google Drive OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Google Drive API"
4. Create OAuth 2.0 credentials (Desktop application)
5. Download credentials JSON
6. Copy credentials to `.env`:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Step 2: Start DocSort

```bash
# Terminal 1: Start backend API
npm run api

# Terminal 2: Start Electron app
npm run electron-dev
```

### Step 3: Configure Scanner Folder

1. Configure your scanner to save to a specific folder:
   - **Option A**: Scanner built-in folder sharing (SMB/NFS)
   - **Option B**: Use `sane-genesys-usb` with local USB
   - **Option C**: Configure scanner network output to `/home/username/scans`

2. In DocSort app:
   - Click "📁 Select Folder"
   - Choose the folder where scanner outputs files
   - Default: `~/scans` (if using network setup)

### Step 4: Add Google Drive Accounts (Optional)

1. Click "➕ Add Account"
2. Enter account name (e.g., "Personal")
3. Browser opens Google login
4. Authorize DocSort to access Google Drive
5. Account will be saved locally

### Step 5: Start Scanning

1. Click "▶️ Start Monitoring"
2. Scan documents on your scanner
3. Documents appear in app automatically
4. Select Google accounts to share with
5. Click "☁️ Upload & Share"

## Scanner Configuration Examples

### Brother Scanner (Network)

**Via Web Interface:**
1. Open browser: `http://192.168.1.100` (scanner IP)
2. Go to Settings → Scan → Network TWAIN
3. Set SMB path to `\\computer\scans`
4. Configure auto-scan intervals

**Via SNMP:**
```bash
# Find Brother scanner on network
nmap -sn 192.168.1.0/24 | grep -i brother

# Configure via brother-setup
brsaneconfig -a name=BROTHER model=HL-L8360CDW ip=192.168.1.100
```

### Toshiba Scanner (Network)

**Via Web Interface:**
1. Open browser: `http://toshiba-scanner-ip`
2. Settings → Scan → File Server
3. Set destination folder path
4. Configure scan profiles

**Via SANE:**
```bash
# Detect Toshiba scanner
scanimage -A | grep -i toshiba

# Test scanning
scanimage --device-name 'pixma:MF8580Cdw' --resolution 300 > toshiba_scan.pnm
```

## Automatic Folder Organization

DocSort automatically organizes scanned documents:

```
/home/username/documents/sorted/
├── 2025/
│   ├── 01/                          # January
│   │   ├── john_doe/
│   │   │   ├── invoice_2025-01-15_john_doe.pdf
│   │   │   ├── contract_2025-01-20_john_doe.pdf
│   │   └── jane_smith/
│   │       └── letter_2025-01-25_jane_smith.pdf
│   ├── 02/                          # February
│   │   └── ...
│   └── 03/
└── 2024/
    └── ...
```

**Organization Logic:**
- **Year/Month**: Extracted from document date or scan date
- **Recipient**: Extracted from OCR text via Claude AI
- **Filename**: `{doctype}_{date}_{recipient}.pdf`
- **Document Type**: invoice, contract, letter, report, form, other

## OCR & Document Classification

Each scanned document:
1. **Extracts text** via Tesseract.js OCR
2. **Classifies type** using Claude API (invoice, contract, etc.)
3. **Extracts metadata**:
   - Document date
   - Recipient name & email
   - Summary
   - Keywords for search
4. **Indexes** in SQLite FTS5 for full-text search

## Sharing with Google Drive

After uploading, documents can be shared with:
- Multiple Google Drive accounts
- Specific email addresses
- Different permission levels (viewer, editor)

**Example:**
- Scan invoice → DocSort recognizes as invoice
- Automatically sorts to `/2025/03/john_doe/invoice_2025-03-18_john_doe.pdf`
- Share with: "Accounting@domain.com" account
- File appears in their Google Drive

## Troubleshooting

### Scanner Not Detected

```bash
# Check SANE backend
scanimage -A

# Check if user is in scanner group
groups $USER

# Should include 'scanner' in output

# Restart scanner service
sudo systemctl restart saned
```

### Permission Denied on Scanner

```bash
# Add user to scanner group
sudo usermod -a -G scanner $USER

# Give permissions
sudo chmod g+rw /dev/bus/usb/*/* 2>/dev/null

# Log out and back in
```

### Network Scanner Timeout

```bash
# Check network connectivity
ping 192.168.1.100

# Check scanner service
scanimage -A -d brother3:net:192.168.1.100

# Increase SANE timeout
export SANE_NET_TIMEOUT=180
```

### OCR Not Working

- Check Tesseract language packs are downloaded
- Verify ANTHROPIC_API_KEY is set
- Check backend API is running (port 5000)

### Google Drive Sharing Issues

- Verify OAuth credentials are correct
- Check token hasn't expired
- Ensure Google Drive API is enabled
- Verify account has write permissions

## Advanced Configuration

### Custom Document Types

Edit `src/classifier/classify.ts` to add custom document types:

```typescript
if (lowerText.includes('PO') || lowerText.includes('purchase order')) {
  docType = 'purchase_order';
}
```

### Change Document Organization

Edit `src/storage/files.ts` to modify folder structure:

```typescript
// Custom organization by document type instead of recipient
const storagePath = path.join(
  config.sortedDir,
  year,
  month,
  doc.documentType,  // Instead of recipient
  filename
);
```

### Add More Languages for OCR

Edit `src/ocr/extract.ts`:

```typescript
await worker.loadLanguage('fra');  // French
await worker.loadLanguage('deu');  // German
await worker.loadLanguage('spa');  // Spanish
```

## Performance Tips

1. **Set optimal DPI**: 300 DPI for document archival, 150 DPI for web
2. **Batch scanning**: Scan multiple documents, app processes in parallel (concurrency=2)
3. **Color settings**: Use B&W for text documents, Color for mixed media
4. **Network optimization**: Ensure 5GHz WiFi for network scanners

## Support

For issues:
1. Check logs in DocSort: 📋 View Logs
2. Check browser console: F12
3. Check backend logs: `npm run api`
4. Verify SANE: `scanimage -A`
5. Test Google: Manually authenticate in app

## License

DocSort Scanner - Part of DocSort Document Management System
MIT License
