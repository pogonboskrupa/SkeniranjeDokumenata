'use client';

import { useEffect, useState } from 'react';

interface Settings {
  theme: 'light' | 'dark';
  itemsPerPage: number;
  autoRefresh: boolean;
  autoRefreshInterval: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    theme: 'light',
    itemsPerPage: 50,
    autoRefresh: false,
    autoRefreshInterval: 30,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const stored = localStorage.getItem('docsort-settings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  function handleSave() {
    localStorage.setItem('docsort-settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    localStorage.removeItem('docsort-settings');
    setSettings({
      theme: 'light',
      itemsPerPage: 50,
      autoRefresh: false,
      autoRefreshInterval: 30,
    });
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="max-w-2xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Theme
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={settings.theme === 'light'}
                  onChange={(e) =>
                    setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' })
                  }
                  className="mr-2"
                />
                <span className="text-gray-700">Light</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={settings.theme === 'dark'}
                  onChange={(e) =>
                    setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' })
                  }
                  className="mr-2"
                />
                <span className="text-gray-700">Dark</span>
              </label>
            </div>
          </div>

          {/* Items Per Page */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Items Per Page
            </label>
            <input
              type="number"
              min="10"
              max="200"
              value={settings.itemsPerPage}
              onChange={(e) =>
                setSettings({ ...settings, itemsPerPage: parseInt(e.target.value) })
              }
              className="input-base"
            />
          </div>

          {/* Auto Refresh */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.autoRefresh}
                onChange={(e) =>
                  setSettings({ ...settings, autoRefresh: e.target.checked })
                }
                className="mr-2"
              />
              <span className="text-gray-900 font-medium">Auto Refresh Dashboard</span>
            </label>
            {settings.autoRefresh && (
              <div className="mt-2">
                <label className="block text-sm text-gray-600 mb-2">
                  Refresh Interval (seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={settings.autoRefreshInterval}
                  onChange={(e) =>
                    setSettings({ ...settings, autoRefreshInterval: parseInt(e.target.value) })
                  }
                  className="input-base"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button onClick={handleSave} className="button-primary">
              {saved ? '✓ Saved' : 'Save Settings'}
            </button>
            <button onClick={handleReset} className="button-secondary">
              Reset to Defaults
            </button>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Info:</strong> Settings are stored locally in your browser. They don't
              sync across devices.
            </p>
          </div>

          {/* Danger Zone */}
          <div className="mt-8 border-t pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Danger Zone</h3>
            <p className="text-sm text-gray-600 mb-4">
              Clear all local cache and settings
            </p>
            <button
              onClick={() => {
                if (confirm('Clear all local data?')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Clear All Local Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
