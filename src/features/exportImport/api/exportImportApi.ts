const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7153';

const joinUrl = (path: string) => `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

const parseErrorMessage = async (response: Response, fallback: string) => {
  try {
    const text = await response.text();
    if (!text.trim()) return fallback;
    try {
      const parsed = JSON.parse(text) as { detail?: string; title?: string; message?: string };
      return parsed.detail || parsed.title || parsed.message || fallback;
    } catch {
      return text;
    }
  } catch {
    return fallback;
  }
};

const request = async (path: string, init?: RequestInit) => {
  let response: Response;
  try {
    response = await fetch(joinUrl(path), {
      credentials: 'include',
      ...init,
    });
  } catch {
    throw new Error('Unable to reach API server. Please check backend URL/CORS.');
  }

  if (!response.ok) {
    const fallback = `Request failed (${response.status})`;
    const message = await parseErrorMessage(response, fallback);
    throw new Error(message);
  }

  return response;
};

const parseFilenameFromDisposition = (contentDisposition: string | null) => {
  if (!contentDisposition) return null;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].trim());
  const basicMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
  if (basicMatch?.[1]) return basicMatch[1].trim();
  return null;
};

export const exportImportApi = {
  exportJson: async (): Promise<unknown> => {
    const response = await request('/export-import/export');
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      return response.json();
    }

    const text = await response.text();
    if (!text.trim()) return {};
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  },

  downloadExport: async (): Promise<{ blob: Blob; fileName: string }> => {
    const response = await request('/export-import/export/download');
    const blob = await response.blob();
    const fileName = parseFilenameFromDisposition(response.headers.get('content-disposition')) || 'autotasker-export.json';
    return { blob, fileName };
  },

  importJson: async (payload: unknown): Promise<void> => {
    await request('/export-import/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  importFile: async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    await request('/export-import/import/upload', {
      method: 'POST',
      body: formData,
    });
  },
};
