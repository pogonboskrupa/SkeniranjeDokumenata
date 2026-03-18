'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDocuments } from '@/lib/api';
import { DocumentMetadata } from '@/lib/types';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const pageSize = 50;

  useEffect(() => {
    async function loadDocuments() {
      try {
        setLoading(true);
        const response = await getDocuments(pageSize, page * pageSize);
        setDocuments(response.documents);
        // Estimate total from first page
        if (page === 0) {
          setTotal(response.documents.length);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load documents'
        );
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, [page]);

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">All Documents</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
          <p>No documents found.</p>
          <Link href="/upload" className="text-blue-600 hover:underline">
            Upload your first document
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Uploaded
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {doc.originalFilename}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="badge-primary">
                        {doc.documentType}
                      </span>
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
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(doc.uploadedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-gray-600">
              Page {page + 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={documents.length < pageSize}
              className="button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
