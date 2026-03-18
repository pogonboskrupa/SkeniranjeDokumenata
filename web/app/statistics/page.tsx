'use client';

import { useEffect, useState } from 'react';
import { getStats } from '@/lib/api';

interface Stats {
  totalDocuments: number;
  completed: number;
  pending: number;
  failed: number;
  totalSize: number;
  byType?: Record<string, number>;
  recentDays?: {
    today: number;
    thisWeek: number;
  };
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    try {
      const data = await getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading statistics...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error: {error}
      </div>
    );
  }

  const completionRate =
    stats.totalDocuments > 0
      ? ((stats.completed / stats.totalDocuments) * 100).toFixed(1)
      : 0;

  const failureRate =
    stats.totalDocuments > 0
      ? ((stats.failed / stats.totalDocuments) * 100).toFixed(1)
      : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Statistics</h1>
        <button
          onClick={loadStats}
          className="button-secondary"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Overview Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Documents:</span>
              <span className="font-bold text-gray-900">{stats.totalDocuments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Size:</span>
              <span className="font-bold text-gray-900">{formatBytes(stats.totalSize)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completion Rate:</span>
              <span className="font-bold text-green-600">{completionRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Failure Rate:</span>
              <span className="font-bold text-red-600">{failureRate}%</span>
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium">{stats.completed}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${(stats.completed / stats.totalDocuments) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Processing</span>
                <span className="font-medium">{stats.pending}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{
                    width: `${(stats.pending / stats.totalDocuments) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Failed</span>
                <span className="font-medium">{stats.failed}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{
                    width: `${(stats.failed / stats.totalDocuments) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {stats.recentDays && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600">Uploaded Today</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {stats.recentDays.today}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600">Uploaded This Week</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {stats.recentDays.thisWeek}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Types */}
      {stats.byType && Object.keys(stats.byType).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents by Type</h2>
          <div className="space-y-3">
            {Object.entries(stats.byType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 capitalize">{type}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(count / stats.totalDocuments) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
