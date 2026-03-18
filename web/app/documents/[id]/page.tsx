'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getDocument,
  getDocumentDownloadUrl,
  deleteDocument,
  updateDocument,
} from '@/lib/api';
import { DocumentMetadata, DocumentType } from '@/lib/types';

const DOCUMENT_TYPES: DocumentType[] = [
  'invoice',
  'contract',
  'letter',
  'report',
  'form',
  'other',
];

export default function DocumentDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [docType, setDocType] = useState<DocumentType>('other');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    async function loadDocument() {
      try {
        setLoading(true);
        const document = await getDocument(params.id);
        setDoc(document);
        setDocType(document.documentType);
        setSummary(document.summary || '');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load document'
        );
      } finally {
        setLoading(false);
      }
    }

    loadDocument();
  }, [params.id]);

  async function handleSave() {
    if (!doc) return;

    try {
      const updated = await updateDocument(params.id, {
        documentType: docType,
        summary,
      });
      setDoc(updated);
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update document'
      );
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await deleteDocument(params.id);
      router.push('/documents');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete document'
      );
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error || 'Document not found'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          {doc.originalFilename}
        </h1>
        <div className="space-x-3">
          <a
            href={getDocumentDownloadUrl(doc.id)}
            className="button-primary"
            download
          >
            Download
          </a>
          <button
            onClick={() => setEditing(!editing)}
            className="button-secondary"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Metadata */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Metadata
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Status
                </label>
                <p className="mt-1">
                  {doc.status === 'completed' && (
                    <span className="badge-success">Completed</span>
                  )}
                  {doc.status === 'pending' && (
                    <span className="badge-warning">Pending</span>
                  )}
                  {doc.status === 'failed' && (
                    <span className="badge-error">Failed</span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Document Type
                </label>
                {editing ? (
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocumentType)}
                    className="input-base mt-1"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 text-gray-900">{doc.documentType}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Extracted Date
                </label>
                <p className="mt-1 text-gray-900">{doc.date || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Recipient
                </label>
                <p className="mt-1 text-gray-900">{doc.recipientName || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Recipient Email
                </label>
                <p className="mt-1 text-gray-900">
                  {doc.recipientEmail || '-'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Keywords
                </label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {doc.keywords.length === 0 ? (
                    <p className="text-gray-500">No keywords</p>
                  ) : (
                    doc.keywords.map((keyword, idx) => (
                      <span key={idx} className="badge-primary">
                        {keyword}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Summary
                  </label>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="input-base w-full h-24"
                    placeholder="Enter document summary..."
                  />
                </div>
              )}

              {!editing && doc.summary && (
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    Summary
                  </label>
                  <p className="mt-1 text-gray-900">{doc.summary}</p>
                </div>
              )}

              {editing && (
                <button onClick={handleSave} className="button-primary">
                  Save Changes
                </button>
              )}
            </div>
          </div>

          {/* OCR Text */}
          {doc.ocrText && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Extracted Text
              </h2>
              <div className="bg-gray-50 p-4 rounded text-sm text-gray-700 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                {doc.ocrText.substring(0, 1000)}
                {doc.ocrText.length > 1000 && '...'}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">File Info</h3>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">File Size</p>
                <p className="font-medium text-gray-900">
                  {(doc.fileSize / 1024).toFixed(2)} KB
                </p>
              </div>

              <div>
                <p className="text-gray-600">Uploaded</p>
                <p className="font-medium text-gray-900">
                  {new Date(doc.uploadedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {doc.processedAt && (
                <div>
                  <p className="text-gray-600">Processed</p>
                  <p className="font-medium text-gray-900">
                    {new Date(doc.processedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              <div>
                <p className="text-gray-600">Document ID</p>
                <p className="font-mono text-xs text-gray-500 break-all">
                  {doc.id}
                </p>
              </div>
            </div>

            {doc.errorMessage && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <p className="font-semibold mb-1">Error</p>
                <p>{doc.errorMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
