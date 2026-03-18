const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Scanner operations
  getScanners: () => ipcRenderer.invoke('get-scanners'),
  selectScannerFolder: () => ipcRenderer.invoke('select-scanner-folder'),
  getScannerFolder: () => ipcRenderer.invoke('get-scanner-folder'),
  startMonitoring: (folderPath) => ipcRenderer.invoke('start-monitoring', folderPath),

  // Document operations
  processDocument: (documentPath, googleAccounts) =>
    ipcRenderer.invoke('process-document', documentPath, googleAccounts),

  // Google Drive
  authenticateGoogle: (accountName) => ipcRenderer.invoke('authenticate-google', accountName),
  getGoogleAccounts: () => ipcRenderer.invoke('get-google-accounts'),
  removeGoogleAccount: (accountName) => ipcRenderer.invoke('remove-google-account', accountName),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Event listeners
  onDocumentDetected: (callback) => ipcRenderer.on('document-detected', (event, document) => callback(document)),
  onProcessingStatus: (callback) => ipcRenderer.on('processing-status', (event, status) => callback(status)),
});
