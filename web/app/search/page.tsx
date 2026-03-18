'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { searchDocuments, getDocumentDownloadUrl } from '@/lib/api';
import { SearchResult, DocumentType } from '@/lib/types';

const DOCUMENT_TYPES: DocumentType[] = [
  'invoice',
  'contract',
  'letter',
  'report',
  'form',
  'other',
];

export default function SearchPage() {
  const [searchText, setSearchText] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [recipient, setRecipient] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const query = {
        text: searchText || undefined,
        documentType: (documentType as DocumentType) || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        recipient: recipient || undefined,
        limit: 50,
        offset: 0,
      };

      const response = await searchDocuments(query);
      setResults(response.results);
      setTotal(response.total);
      setSearched(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to search documents'
      );
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Search Documents</h1>

      {/* Search Form */}
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-lg shadow p-6 mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Search Text */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Enter keywords..."
              className="input-base w-full"
            />
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) =>
                setDocumentType((e.target.value as DocumentType) || '')
              }
              className="input-base w-full"
            >
              <option value="">All Types</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Recipient
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Recipient name or email"
              className="input-base w-full"
            />
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-base w-full"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-base w-full"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="button-primary">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-8">
          <p>Error: {error}</p>
        </div>
      )}

      {/* Results */}
      {searched && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Results ({total} found)
            </h2>
          </div>

          {results.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p>No documents found matching your search criteria.</p>
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
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr
                      key={result.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/documents/${result.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {result.originalFilename}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="badge-primary">
                          {result.documentType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(result.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {result.recipientName || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {result.score.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <a
                          href={getDocumentDownloadUrl(result.id)}
                          className="text-blue-600 hover:underline"
                          download
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
