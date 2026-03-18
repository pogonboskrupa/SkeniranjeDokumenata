import { DocumentMetadata, SearchQuery, SearchResult } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function getDocuments(
  limit: number = 50,
  offset: number = 0
): Promise<{ documents: DocumentMetadata[]; limit: number; offset: number }> {
  const response = await fetch(
    `${API_URL}/documents?limit=${limit}&offset=${offset}`
  );
  if (!response.ok) throw new Error('Failed to fetch documents');
  return response.json();
}

export async function getDocument(id: string): Promise<DocumentMetadata> {
  const response = await fetch(`${API_URL}/documents/${id}`);
  if (!response.ok) throw new Error('Failed to fetch document');
  return response.json();
}

export async function searchDocuments(
  query: SearchQuery
): Promise<{ results: SearchResult[]; total: number; limit: number; offset: number }> {
  const response = await fetch(`${API_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!response.ok) throw new Error('Failed to search documents');
  return response.json();
}

export async function uploadDocument(
  file: File
): Promise<{ documentId: string; status: string; message: string }> {
  const formData = new FormData();
  const buffer = await file.arrayBuffer();

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: {
      'x-filename': file.name,
    },
    body: buffer,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || 'Failed to upload document');
  }

  return response.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/documents/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete document');
}

export async function updateDocument(
  id: string,
  updates: Partial<DocumentMetadata>
): Promise<DocumentMetadata> {
  const response = await fetch(`${API_URL}/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update document');
  return response.json();
}

export async function getStats(): Promise<{
  totalDocuments: number;
  completed: number;
  pending: number;
  failed: number;
  totalSize: number;
}> {
  const response = await fetch(`${API_URL}/stats`);
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
}

export function getDocumentDownloadUrl(id: string): string {
  return `${API_URL}/documents/${id}/file`;
}
