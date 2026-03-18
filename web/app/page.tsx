'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDocuments, getStats } from '@/lib/api';
import { DocumentMetadata } from '@/lib/types';

interface Stats {
  totalDocuments: number;
  completed: number;
  pending: number;
  failed: number;
  totalSize: number;
}

export default function Dashboard() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  async function loadData() {
    try {
      const isInitial = loading;
      if (!isInitial) setRefreshing(true);

      const [docsRes, statsRes] = await Promise.all([
        getDocuments(10, 0),
        getStats(),
      ]);
      setDocuments(docsRes.documents);
      setStats(statsRes);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p>Error loading dashboard: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          {lastUpdate && (
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="space-x-2">
          <button
            onClick={loadData}
            disabled={refreshing}
            className={`button-secondary ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {refreshing ? '🔄 Updating...' : '🔄 Refresh'}
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            {autoRefresh ? '✓ Auto-refresh' : 'Auto-refresh OFF'}
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
            <div className="text-gray-600 text-sm">Total Documents</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {stats.totalDocuments}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
            <div className="text-gray-600 text-sm">Completed</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {stats.completed}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
            <div className="text-gray-600 text-sm">Processing</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {stats.pending}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
            <div className="text-gray-600 text-sm">Failed</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {stats.failed}
            </div>
          </div>
        </div>
      )}

      {/* Recent Documents */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Documents</h2>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <p>No documents yet.</p>
            <Link href="/upload" className="text-blue-600 hover:underline">
              Upload your first document
            </Link>
          </div>
        ) : (
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Size
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
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="badge-primary">
                        {doc.documentType}
                      </span>
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
                      {formatDate(doc.uploadedAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatFileSize(doc.fileSize)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
