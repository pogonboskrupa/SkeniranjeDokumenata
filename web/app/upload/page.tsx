'use client';

import { useRef, useState } from 'react';
import { uploadDocument } from '@/lib/api';

interface UploadItem {
  filename: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  id?: string;
}

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
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

    // Create upload items
    const items: UploadItem[] = Array.from(files).map((file) => ({
      filename: file.name,
      status: 'pending',
    }));
    setUploadItems((prev) => [...prev, ...items]);

    // Upload each file
    const fileArray = Array.from(files);
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const itemIndex = uploadItems.length + i;

      try {
        setUploadItems((prev) => {
          const updated = [...prev];
          updated[itemIndex] = { ...updated[itemIndex], status: 'uploading' };
          return updated;
        });

        const result = await uploadDocument(file);

        setUploadItems((prev) => {
          const updated = [...prev];
          updated[itemIndex] = {
            ...updated[itemIndex],
            status: 'success',
            id: result.documentId,
          };
          return updated;
        });
      } catch (err) {
        setUploadItems((prev) => {
          const updated = [...prev];
          updated[itemIndex] = {
            ...updated[itemIndex],
            status: 'error',
            error: err instanceof Error ? err.message : 'Upload failed',
          };
          return updated;
        });
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
            disabled={uploadItems.some(item => item.status === 'uploading' || item.status === 'pending')}
            className="button-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadItems.some(item => item.status === 'uploading') ? 'Uploading...' : 'Select Files'}
          </button>

          <p className="text-sm text-gray-500 mt-4">
            Supported formats: PDF, JPG, PNG, TIFF
          </p>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-semibold mb-2">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Upload Progress */}
        {uploadItems.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Upload Progress</h3>
            <div className="space-y-3">
              {uploadItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.filename}</p>
                    {item.error && (
                      <p className="text-xs text-red-600 mt-1">{item.error}</p>
                    )}
                  </div>
                  <div className="ml-4">
                    {item.status === 'pending' && (
                      <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                        Pending
                      </span>
                    )}
                    {item.status === 'uploading' && (
                      <span className="text-xs px-2 py-1 bg-yellow-200 text-yellow-700 rounded">
                        ⏳ Uploading...
                      </span>
                    )}
                    {item.status === 'success' && (
                      <span className="text-xs px-2 py-1 bg-green-200 text-green-700 rounded">
                        ✓ Complete
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-xs px-2 py-1 bg-red-200 text-red-700 rounded">
                        ✗ Failed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              ℹ️ Documents are being processed. Check the dashboard for progress.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
