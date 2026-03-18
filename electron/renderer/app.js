/**
 * DocSort Electron Renderer
 * Main UI application
 */

const api = window.electronAPI;
let currentFolder = null;
let googleAccounts = [];
let monitoringActive = false;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  await initializeUI();
  await loadStoredFolder();
  await loadGoogleAccounts();

  // Listen for detected documents
  api.onDocumentDetected((document) => {
    addDocumentToList(document);
  });
});

async function initializeUI() {
  const root = document.getElementById('root');

  root.innerHTML = `
    <div class="container">
      <!-- Header -->
      <header>
        <h1>📄 DocSort Scanner</h1>
        <p>Automatic document sorting and Google Drive sharing</p>
      </header>

      <!-- Main Grid -->
      <div class="main-grid">
        <!-- Sidebar -->
        <div class="sidebar">
          <!-- Folder Selection -->
          <div class="section">
            <h2>Scanner Folder</h2>
            <button onclick="selectScannerFolder()">📁 Select Folder</button>
            <div id="folderDisplay" class="folder-display">No folder selected</div>
            <small style="color: #999;">Scanned documents will be monitored here</small>
          </div>

          <!-- Google Accounts -->
          <div class="section">
            <h2>Google Drive Accounts</h2>
            <button onclick="addGoogleAccount()">➕ Add Account</button>
            <ul id="googleAccountsList" class="google-accounts"></ul>
          </div>

          <!-- Settings -->
          <div class="section">
            <h2>Settings</h2>
            <button onclick="openSettings()" class="secondary">⚙️ Preferences</button>
            <button onclick="openLogs()" class="secondary">📋 View Logs</button>
          </div>
        </div>

        <!-- Content -->
        <div class="content">
          <!-- Status -->
          <div class="section">
            <h2>Status</h2>
            <div id="statusDisplay" style="padding: 12px; background: #e3f2fd; border-radius: 4px; margin-bottom: 10px;">
              Ready to scan
            </div>
            <button id="monitorBtn" onclick="toggleMonitoring()" disabled>
              ⏸️ Start Monitoring
            </button>
          </div>

          <!-- Document List -->
          <div class="section">
            <h2>Detected Documents</h2>
            <div id="documentList" class="document-list"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function selectScannerFolder() {
  const folder = await api.selectScannerFolder();
  if (folder) {
    currentFolder = folder;
    updateFolderDisplay();
    document.getElementById('monitorBtn').disabled = false;
  }
}

async function loadStoredFolder() {
  const folder = await api.getScannerFolder();
  if (folder) {
    currentFolder = folder;
    updateFolderDisplay();
    document.getElementById('monitorBtn').disabled = false;
  }
}

function updateFolderDisplay() {
  const display = document.getElementById('folderDisplay');
  if (currentFolder) {
    display.textContent = currentFolder;
    display.style.color = '#2196f3';
  }
}

async function toggleMonitoring() {
  const btn = document.getElementById('monitorBtn');

  if (!currentFolder) {
    alert('Please select a scanner folder first');
    return;
  }

  if (!monitoringActive) {
    // Start monitoring
    const result = await api.startMonitoring(currentFolder);
    monitoringActive = true;
    btn.textContent = '⏹️ Stop Monitoring';
    btn.style.background = '#f44336';
    updateStatus('Monitoring active... Waiting for documents');
  } else {
    // Stop monitoring
    monitoringActive = false;
    btn.textContent = '▶️ Start Monitoring';
    btn.style.background = '#2196f3';
    updateStatus('Monitoring stopped');
  }
}

function addDocumentToList(document) {
  const list = document.getElementById('documentList');
  const item = document.createElement('div');
  item.className = 'document-item';

  const accounts = googleAccounts.length > 0 ? googleAccounts : ['None'];
  const accountsOptions = accounts
    .map((acc) => `<label class="checkbox-label"><input type="checkbox" value="${acc}" onchange="updateShareOptions()"> ${acc}</label>`)
    .join('');

  item.innerHTML = `
    <div class="document-name">📄 ${document.filename}</div>
    <div class="document-meta">
      Size: ${formatFileSize(document.size)} |
      <span class="status-badge status-processing">Processing...</span>
    </div>
    <div style="margin-top: 10px;">
      <small style="color: #999;">Share with:</small>
      <div class="share-options" id="shareOpts_${document.filename}">
        ${accountsOptions}
      </div>
      <button onclick="shareDocument('${document.filename}', '${document.filepath}')" style="margin-top: 10px;">
        ☁️ Upload & Share
      </button>
    </div>
  `;

  list.insertBefore(item, list.firstChild);
  updateStatus(`Detected: ${document.filename}`);
}

async function shareDocument(filename, filepath) {
  const shareOpts = document.getElementById(`shareOpts_${filename}`);
  const checkboxes = shareOpts.querySelectorAll('input[type="checkbox"]:checked');
  const selectedAccounts = Array.from(checkboxes).map((cb) => cb.value);

  try {
    updateStatus(`Processing: ${filename}...`);

    const result = await api.processDocument(filepath, selectedAccounts);

    if (result.success) {
      updateStatus(`✓ Completed: ${filename}`);
      // Update item status
      const item = shareOpts.closest('.document-item');
      const badge = item.querySelector('.status-badge');
      badge.className = 'status-badge status-completed';
      badge.textContent = 'Completed';
    } else {
      updateStatus(`✗ Error: ${result.error}`);
      const item = shareOpts.closest('.document-item');
      const badge = item.querySelector('.status-badge');
      badge.className = 'status-badge status-error';
      badge.textContent = 'Error';
    }
  } catch (error) {
    updateStatus(`Error: ${error.message}`);
  }
}

async function addGoogleAccount() {
  const accountName = prompt('Enter account name (e.g., "Personal", "Work"):');
  if (!accountName) return;

  try {
    updateStatus(`Authenticating Google account: ${accountName}...`);
    const result = await api.authenticateGoogle(accountName);

    if (result.success) {
      await loadGoogleAccounts();
      updateStatus(`✓ Google account added: ${accountName}`);
    } else {
      updateStatus(`✗ Authentication failed: ${result.error}`);
    }
  } catch (error) {
    updateStatus(`Error: ${error.message}`);
  }
}

async function loadGoogleAccounts() {
  googleAccounts = await api.getGoogleAccounts();
  updateGoogleAccountsList();
}

function updateGoogleAccountsList() {
  const list = document.getElementById('googleAccountsList');
  list.innerHTML = '';

  if (googleAccounts.length === 0) {
    list.innerHTML = '<li style="padding: 8px; color: #999;">No accounts added</li>';
    return;
  }

  googleAccounts.forEach((account) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>✓ ${account}</span>
      <button onclick="removeGoogleAccount('${account}')">Remove</button>
    `;
    list.appendChild(li);
  });
}

async function removeGoogleAccount(accountName) {
  if (confirm(`Remove Google account: ${accountName}?`)) {
    await api.removeGoogleAccount(accountName);
    await loadGoogleAccounts();
    updateStatus(`Removed: ${accountName}`);
  }
}

function updateStatus(message) {
  const display = document.getElementById('statusDisplay');
  display.textContent = message;
}

function updateShareOptions() {
  // Update share options when checkboxes change
}

function openSettings() {
  alert('Settings dialog coming soon');
}

function openLogs() {
  alert('Logs viewer coming soon');
}

function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
