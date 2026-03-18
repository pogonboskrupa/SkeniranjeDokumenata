const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const http = require('http');
const url = require('url');
const open = require('open');

/**
 * Google Drive integration for document sharing
 */

class GoogleDriveModule {
  constructor() {
    // Get credentials from environment
    this.CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-client-id.apps.googleusercontent.com';
    this.CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret';
    this.REDIRECT_URI = 'http://localhost:3000/auth/google/callback';
    this.SCOPES = ['https://www.googleapis.com/auth/drive.file'];
  }

  /**
   * Authenticate with Google OAuth
   * @param {string} accountName Name for this account (for storing credentials)
   * @returns {Promise<object>} OAuth tokens
   */
  async authenticate(accountName) {
    return new Promise((resolve, reject) => {
      const oauth2Client = new OAuth2Client(
        this.CLIENT_ID,
        this.CLIENT_SECRET,
        this.REDIRECT_URI
      );

      // Generate auth URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: this.SCOPES,
        state: accountName,
      });

      // Start local server to handle callback
      const server = http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url, true);

        if (parsedUrl.pathname === '/auth/google/callback') {
          const code = parsedUrl.query.code;

          if (code) {
            try {
              const { tokens } = await oauth2Client.getToken(code);
              oauth2Client.setCredentials(tokens);

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(
                '<html><body><h1>Authorization successful!</h1><p>You can close this window.</p></body></html>'
              );

              server.close();
              resolve(tokens);
            } catch (error) {
              res.writeHead(400);
              res.end('Authorization failed');
              server.close();
              reject(error);
            }
          }
        }
      });

      server.listen(3000, () => {
        console.log('Opening browser for authentication...');
        open(authUrl);
      });

      server.on('error', reject);
    });
  }

  /**
   * Upload file to Google Drive
   * @param {object} oauth2Client Authenticated OAuth2Client
   * @param {string} filePath Path to file
   * @param {string} fileName Display name
   * @param {string} folderId Parent folder ID (optional)
   */
  async uploadFile(oauth2Client, filePath, fileName, folderId = null) {
    try {
      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      const fileMetadata = {
        name: fileName,
      };

      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const media = {
        mimeType: this.getMimeType(filePath),
        body: require('fs').createReadStream(filePath),
      };

      const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });

      return file.data.id;
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      throw error;
    }
  }

  /**
   * Share file with specific email
   * @param {object} oauth2Client Authenticated OAuth2Client
   * @param {string} fileId Google Drive file ID
   * @param {string} email Email address to share with
   * @param {string} role Role (viewer, commenter, editor)
   */
  async shareFile(oauth2Client, fileId, email, role = 'viewer') {
    try {
      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      await drive.permissions.create({
        fileId: fileId,
        resource: {
          kind: 'drive#permission',
          type: 'user',
          role: role,
          emailAddress: email,
        },
        fields: 'id',
      });

      return { shared: true, email, role };
    } catch (error) {
      console.error('Error sharing file:', error);
      throw error;
    }
  }

  /**
   * Create folder in Google Drive
   */
  async createFolder(oauth2Client, folderName, parentFolderId = null) {
    try {
      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const folder = await drive.files.create({
        resource: fileMetadata,
        fields: 'id',
      });

      return folder.data.id;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  /**
   * Get MIME type from file extension
   */
  getMimeType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    const mimeTypes = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      tiff: 'image/tiff',
      tif: 'image/tiff',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = new GoogleDriveModule();
