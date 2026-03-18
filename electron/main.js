const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const ScannerModule = require('./scanner');
const GoogleDriveModule = require('./google-drive');
const Store = require('electron-store');

const store = new Store();
let mainWindow;

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../web/out/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers

// Select scanner folder
ipcMain.handle('select-scanner-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: path.join(process.env.HOME || process.env.USERPROFILE, 'scans'),
  });

  if (!result.canceled) {
    const folderPath = result.filePaths[0];
    store.set('scannerFolder', folderPath);
    return folderPath;
  }
  return null;
});

// Get stored scanner folder
ipcMain.handle('get-scanner-folder', () => {
  return store.get('scannerFolder', null);
});

// Get list of available scanners
ipcMain.handle('get-scanners', async () => {
  try {
    const scanners = await ScannerModule.listScanners();
    return scanners;
  } catch (error) {
    console.error('Error getting scanners:', error);
    return [];
  }
});

// Monitor folder for new documents
ipcMain.handle('start-monitoring', (event, folderPath) => {
  const chokidar = require('chokidar');
  const supportedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif'];

  const watcher = chokidar.watch(folderPath, {
    ignored: /(^|[\/\\])\.|node_modules|\.db/,
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 },
    persistent: true,
  });

  watcher.on('add', (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (supportedExtensions.includes(ext)) {
      event.sender.send('document-detected', {
        filename: path.basename(filePath),
        filepath: filePath,
        size: require('fs').statSync(filePath).size,
      });
    }
  });

  return { status: 'monitoring', folder: folderPath };
});

// Process document
ipcMain.handle('process-document', async (event, documentPath, googleDriveAccounts) => {
  try {
    // Call backend API to process document
    const response = await fetch('http://localhost:5000/api/upload', {
      method: 'POST',
      headers: {
        'x-filename': path.basename(documentPath),
      },
      body: require('fs').readFileSync(documentPath),
    });

    const result = await response.json();

    // Share with Google Drive if selected
    if (googleDriveAccounts && googleDriveAccounts.length > 0) {
      for (const account of googleDriveAccounts) {
        try {
          const token = store.get(`google-token-${account}`);
          // TODO: Share logic
          console.log(`Sharing with ${account}`);
        } catch (err) {
          console.error(`Error sharing with ${account}:`, err);
        }
      }
    }

    return { success: true, documentId: result.documentId };
  } catch (error) {
    console.error('Error processing document:', error);
    return { success: false, error: error.message };
  }
});

// Google Drive authentication
ipcMain.handle('authenticate-google', async (event, accountName) => {
  try {
    const tokens = await GoogleDriveModule.authenticate(accountName);
    store.set(`google-token-${accountName}`, tokens);
    return { success: true, account: accountName };
  } catch (error) {
    console.error('Google auth error:', error);
    return { success: false, error: error.message };
  }
});

// Get authenticated Google accounts
ipcMain.handle('get-google-accounts', () => {
  const keys = store.store;
  const accounts = Object.keys(keys)
    .filter((key) => key.startsWith('google-token-'))
    .map((key) => key.replace('google-token-', ''));
  return accounts;
});

// Remove Google account
ipcMain.handle('remove-google-account', (event, accountName) => {
  store.delete(`google-token-${accountName}`);
  return { success: true };
});

// Get app version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
