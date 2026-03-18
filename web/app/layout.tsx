import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DocSort - Document Management',
  description: 'OCR-powered document management with AI classification',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <div className="flex h-screen">
          {/* Sidebar */}
          <nav className="w-64 bg-gray-900 text-white shadow-lg">
            <div className="p-6">
              <h1 className="text-2xl font-bold">DocSort</h1>
              <p className="text-sm text-gray-400 mt-1">Document Management</p>
            </div>

            <div className="space-y-1 px-4">
              <a
                href="/"
                className="block px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
              >
                📊 Dashboard
              </a>
              <a
                href="/upload"
                className="block px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
              >
                📤 Upload
              </a>
              <a
                href="/search"
                className="block px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
              >
                🔍 Search
              </a>
              <a
                href="/documents"
                className="block px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
              >
                📁 All Documents
              </a>

              <div className="border-t border-gray-700 my-2"></div>

              <a
                href="/statistics"
                className="block px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
              >
                📈 Statistics
              </a>
              <a
                href="/batch"
                className="block px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
              >
                ⚙️ Batch Operations
              </a>

              <div className="border-t border-gray-700 my-2"></div>

              <a
                href="/settings"
                className="block px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
              >
                ⚙️ Settings
              </a>
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="p-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
