/**
 * API service for communicating with the Omni-Agent backend.
 * Supports SSE streaming for real-time pipeline progress.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SHOULD_SKIP_NGROK_WARNING = API_BASE.includes('ngrok');

const CF_ACCESS_CLIENT_ID = import.meta.env.VITE_CF_ACCESS_CLIENT_ID || '';
const CF_ACCESS_CLIENT_SECRET = import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET || '';

function withAuthHeaders(headers = {}) {
  const merged = { ...headers };

  if (SHOULD_SKIP_NGROK_WARNING) {
    merged['ngrok-skip-browser-warning'] = 'true';
  }

  if (CF_ACCESS_CLIENT_ID && CF_ACCESS_CLIENT_SECRET) {
    merged['CF-Access-Client-Id'] = CF_ACCESS_CLIENT_ID;
    merged['CF-Access-Client-Secret'] = CF_ACCESS_CLIENT_SECRET;
  }

  return merged;
}

/**
 * Check if the backend is reachable.
 * @returns {Promise<{ok: boolean, version: string}>}
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health/`, {
      headers: withAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    return { ok: true, version: data.version, cacheEnabled: data.cache_enabled };
  } catch {
    return { ok: false, version: '', cacheEnabled: false };
  }
}

/**
 * Send a query via SSE streaming and call back on each event.
 *
 * @param {string} query - User question
 * @param {string} threadId - Unique thread ID
 * @param {object} callbacks
 * @param {function} callbacks.onPipelineInfo - ({nodes, labels}) => void
 * @param {function} callbacks.onNodeComplete - ({node, label, elapsed_seconds}) => void
 * @param {function} callbacks.onResult - (analysisResponse) => void
 * @param {function} callbacks.onError - (errorMessage) => void
 * @param {function} callbacks.onDone - ({total_seconds}) => void
 * @returns {Promise<void>}
 */
export async function streamAnalysis(query, threadId, history, callbacks) {
  const { onPipelineInfo, onNodeComplete, onResult, onError, onDone } = callbacks;

  const res = await fetch(`${API_BASE}/api/v1/analyze/stream`, {
    method: 'POST',
    headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ query, thread_id: threadId, messages: history }),
  });

  if (!res.ok) {
    const text = await res.text();
    onError?.(text || `HTTP ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Split on double newlines (SSE delimiter)
    const parts = buffer.split('\n\n');
    // Keep the last potentially incomplete chunk
    buffer = parts.pop() || '';

    for (const part of parts) {
      if (!part.trim()) continue;

      let eventType = 'message';
      let eventData = '';

      for (const line of part.split('\n')) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          eventData = line.slice(6);
        }
      }

      if (!eventData) continue;

      try {
        const parsed = JSON.parse(eventData);

        switch (eventType) {
          case 'pipeline_info':
            onPipelineInfo?.(parsed);
            break;
          case 'node_complete':
            onNodeComplete?.(parsed);
            break;
          case 'result':
            onResult?.(parsed);
            break;
          case 'error':
            onError?.(parsed.message || 'Unknown error');
            break;
          case 'done':
            onDone?.(parsed);
            break;
        }
      } catch (e) {
        console.warn('SSE parse error:', e, eventData);
      }
    }
  }
}

/**
 * Non-streaming analysis (fallback).
 */
export async function analyzeQuery(query, threadId) {
  const res = await fetch(`${API_BASE}/api/v1/analyze`, {
    method: 'POST',
    headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ query, thread_id: threadId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Upload APIs ─────────────────────────────────────────────────────

/**
 * Ingest one or more files using the advanced multi-file ingest endpoint.
 * Returns a SchemaMap with rich column profiling, saved_paths, and file_refs.
 *
 * @param {File[]} files - Array of File objects to upload
 * @param {string} sessionId - Session / conversation ID (used as the ingest session_id)
 * @returns {Promise<object>} SchemaMap response
 */
export async function ingestFiles(files, sessionId) {
  const formData = new FormData();
  formData.append('session_id', sessionId);
  for (const file of files) {
    formData.append('files', file);
  }

  const res = await fetch(`${API_BASE}/api/v1/ingest`, {
    method: 'POST',
    headers: withAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Ingest failed: HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Upload a file to be used as a data source.
 * @param {File} file
 * @param {string} threadId
 * @returns {Promise<object>} Upload response with table_name, columns, preview, etc.
 */
export async function uploadFile(file, threadId) {
  const formData = new FormData();
  formData.append('thread_id', threadId);
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/v1/upload`, {
    method: 'POST',
    headers: withAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Upload failed: HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * List all uploaded datasets.
 * @param {string} threadId
 * @returns {Promise<{uploads: object[]}>}
 */
export async function listUploads(threadId) {
  const params = new URLSearchParams({ thread_id: threadId });
  const res = await fetch(`${API_BASE}/api/v1/uploads?${params.toString()}`, {
    headers: withAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to list uploads: HTTP ${res.status}`);
  return res.json();
}

/**
 * Delete an uploaded dataset.
 * @param {string} uploadId
 * @param {string} threadId
 * @returns {Promise<void>}
 */
export async function deleteUpload(uploadId, threadId) {
  const params = new URLSearchParams({ thread_id: threadId });
  const res = await fetch(`${API_BASE}/api/v1/uploads/${uploadId}?${params.toString()}`, {
    method: 'DELETE',
    headers: withAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Delete failed: HTTP ${res.status}`);
  return res.json();
}

