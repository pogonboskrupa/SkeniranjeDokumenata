'use client';

import { useRef, useState } from 'react';
import { uploadDocument } from '@/lib/api';

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    await handleFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await handleFiles(e.target.files);
    }
  };

  async function handleFiles(files: FileList) {
    setError(null);
    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        try {
          const result = await uploadDocument(file);
          return { filename: file.name, id: result.documentId };
        } catch (err) {
          throw new Error(
            `${file.name}: ${err instanceof Error ? err.message : 'Upload failed'}`
          );
        }
      });

      const results = await Promise.allSettled(uploadPromises);

      const newUploaded: string[] = [];
      const errors: string[] = [];

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          newUploaded.push(
            `✓ ${result.value.filename} (ID: ${result.value.id})`
          );
        } else {
          errors.push(result.reason.message);
        }
      });

      setUploaded((prev) => [...prev, ...newUploaded]);

      if (errors.length > 0) {
        setError(errors.join('\n'));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Upload Documents</h1>

      <div className="max-w-2xl">
        {/* Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
            className="hidden"
          />

          <div className="text-4xl mb-4">📄</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isDragging ? 'Drop files here' : 'Drag & drop documents here'}
          </h2>
          <p className="text-gray-600 mb-6">or</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="button-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Select Files'}
          </button>

          <p className="text-sm text-gray-500 mt-4">
            Supported formats: PDF, JPG, PNG, TIFF
          </p>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-semibold mb-2">Upload errors:</p>
            <pre className="text-sm whitespace-pre-wrap break-words">
              {error}
            </pre>
          </div>
        )}

        {/* Success Messages */}
        {uploaded.length > 0 && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="font-semibold text-green-800 mb-3">
              Successfully uploaded {uploaded.length} document(s):
            </p>
            <ul className="space-y-1">
              {uploaded.map((msg, idx) => (
                <li key={idx} className="text-sm text-green-700">
                  {msg}
                </li>
              ))}
            </ul>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              ℹ️ Documents are being processed. Check the dashboard for progress.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
