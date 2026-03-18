'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDocuments, batchDeleteDocuments } from '@/lib/api';
import { DocumentMetadata } from '@/lib/types';

export default function BatchPage() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const pageSize = 50;

  useEffect(() => {
    loadDocuments();
  }, [page]);

  async function loadDocuments() {
    try {
      setLoading(true);
      const response = await getDocuments(pageSize, page * pageSize);
      setDocuments(response.documents);
      setSelected(new Set()); // Clear selection on page change
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  }

  function toggleSelectAll() {
    if (selected.size === documents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(documents.map((d) => d.id)));
    }
  }

  async function handleBatchDelete() {
    if (selected.size === 0) {
      setError('Please select at least one document');
      return;
    }

    if (!confirm(`Delete ${selected.size} document(s)? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await batchDeleteDocuments(Array.from(selected));
      setSuccess(
        `Successfully deleted ${result.deleted} of ${result.total} document(s)`
      );
      setSelected(new Set());
      loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete documents');
    } finally {
      setDeleting(false);
    }
  }

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Batch Operations</h1>
        <p className="text-gray-600 mt-2">Select documents for bulk actions</p>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Success Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 mb-6">
          {success}
        </div>
      )}

      {/* Selection Info */}
      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex justify-between items-center">
          <span className="text-blue-900">
            <strong>{selected.size}</strong> document(s) selected
          </span>
          <button
            onClick={handleBatchDelete}
            disabled={deleting}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete Selected'}
          </button>
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      documents.length > 0 && selected.size === documents.length
                    }
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Filename
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Size
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-600">
                    No documents found.
                    <Link href="/documents" className="text-blue-600 hover:underline">
                      {' '}
                      View all documents
                    </Link>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className={`border-b border-gray-200 ${
                      selected.has(doc.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(doc.id)}
                        onChange={() => toggleSelect(doc.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {doc.originalFilename}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="badge-primary">{doc.documentType}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {doc.date || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {doc.status === 'completed' && (
                        <span className="badge-success">Completed</span>
                      )}
                      {doc.status === 'pending' && (
                        <span className="badge-warning">Pending</span>
                      )}
                      {doc.status === 'failed' && (
                        <span className="badge-error">Failed</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatFileSize(doc.fileSize)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {documents.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-gray-600">Page {page + 1}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={documents.length < pageSize}
              className="button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
