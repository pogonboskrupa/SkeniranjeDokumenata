const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

/**
 * Scanner module for SANE (Scanner Access Now Easy)
 * Supports Brother, Toshiba, and other SANE-compatible scanners
 */

class ScannerModule {
  /**
   * List all available scanners
   * @returns {Promise<Array>} Array of scanner objects {name, device, model}
   */
  static async listScanners() {
    try {
      const { stdout } = await execAsync('scanimage -A');

      const scanners = [];
      const lines = stdout.split('\n');

      let currentDevice = null;
      let currentModel = null;

      for (const line of lines) {
        // Parse device: Brother Scanner
        if (line.includes('Device:')) {
          const match = line.match(/Device:\s*(\S+)\s*(.*)/);
          if (match) {
            currentDevice = match[1];
            currentModel = match[2] || 'Unknown';
          }
        }

        // Extract model info
        if (currentDevice && (line.includes('Model') || line.includes('Vendor'))) {
          const match = line.match(/:\s*(.*)/);
          if (match) {
            currentModel = match[1].trim();
          }
        }

        // Add to scanners when we find a complete entry
        if (currentDevice && line.trim() === '') {
          scanners.push({
            name: `${currentModel} (${currentDevice})`,
            device: currentDevice,
            model: currentModel,
          });
          currentDevice = null;
          currentModel = null;
        }
      }

      return scanners;
    } catch (error) {
      console.error('Error listing scanners:', error);
      return [];
    }
  }

  /**
   * Scan document from specified device
   * @param {string} device Scanner device (e.g., 'brother3:net:192.168.1.100')
   * @param {object} options Scan options {resolution, format, colorMode}
   * @param {string} outputPath Output file path
   * @returns {Promise<string>} Path to scanned file
   */
  static async scanDocument(device, options = {}, outputPath) {
    const {
      resolution = 300, // DPI
      format = 'pdf', // pdf, jpg, png
      colorMode = 'Color', // Color, Gray, Lineart
    } = options;

    try {
      // Build scanimage command
      let cmd = `scanimage --device-name='${device}' --resolution=${resolution}`;

      // Add color mode
      if (colorMode === 'Gray') {
        cmd += ' --mode Gray';
      } else if (colorMode === 'Lineart') {
        cmd += ' --mode Lineart';
      } else {
        cmd += ' --mode Color';
      }

      // Output format
      if (format === 'pdf') {
        cmd += ` > "${outputPath}.pnm"`;
      } else if (format === 'jpg') {
        cmd += ` > "${outputPath}.pnm"`;
      } else {
        cmd += ` > "${outputPath}"`;
      }

      console.log(`Executing: ${cmd}`);
      await execAsync(cmd);

      // Convert PNM to target format if needed
      if (format !== 'pnm') {
        await this.convertImage(`${outputPath}.pnm`, outputPath, format);
        fs.unlinkSync(`${outputPath}.pnm`);
      }

      return outputPath;
    } catch (error) {
      console.error('Error scanning document:', error);
      throw error;
    }
  }

  /**
   * Convert image format (PNM to PDF/JPG/PNG)
   * @private
   */
  static async convertImage(inputPath, outputPath, format) {
    try {
      if (format === 'pdf') {
        // Convert PNM to PDF using convert (ImageMagick)
        await execAsync(`convert "${inputPath}" "${outputPath}"`);
      } else if (format === 'jpg') {
        await execAsync(`convert "${inputPath}" -quality 85 "${outputPath}"`);
      } else if (format === 'png') {
        await execAsync(`convert "${inputPath}" "${outputPath}"`);
      }
    } catch (error) {
      console.error('Error converting image:', error);
      throw error;
    }
  }

  /**
   * Check if SANE is installed
   */
  static async checkSaneInstalled() {
    try {
      await execAsync('which scanimage');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get scanner capabilities
   */
  static async getScannerCapabilities(device) {
    try {
      const { stdout } = await execAsync(`scanimage --device-name='${device}' --help`);
      return stdout;
    } catch (error) {
      console.error('Error getting scanner capabilities:', error);
      return null;
    }
  }
}

module.exports = ScannerModule;
