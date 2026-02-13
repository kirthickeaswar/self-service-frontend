const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7153';

const joinUrl = (path: string) => `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

const toError = async (response: Response) => {
  try {
    const body = (await response.json()) as { detail?: string; title?: string; message?: string };
    const message = body.detail || body.title || body.message || `HTTP ${response.status}`;
    return new Error(message);
  } catch {
    return new Error(`HTTP ${response.status}`);
  }
};

export const httpClient = {
  async get<T>(path: string): Promise<T> {
    const response = await fetch(joinUrl(path));
    if (!response.ok) throw await toError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(joinUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw await toError(response);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(joinUrl(path), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw await toError(response);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(joinUrl(path), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw await toError(response);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  },

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(joinUrl(path), { method: 'DELETE' });
    if (!response.ok) throw await toError(response);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  },
};
