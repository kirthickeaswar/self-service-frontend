const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7153';

const joinUrl = (path: string) => `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

type ProblemDetails = {
  requiresPasswordSetup?: boolean;
  email?: string;
  userId?: number;
  userLevel?: number;
  detail?: string;
  title?: string;
  message?: string;
  errors?: Record<string, string[]>;
};

type RequestContext = {
  method: string;
  path: string;
};

export class ApiError extends Error {
  status: number;
  path: string;
  method: string;
  data?: ProblemDetails;

  constructor(params: { message: string; status: number; path: string; method: string; data?: ProblemDetails }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.path = params.path;
    this.method = params.method;
    this.data = params.data;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

const cleanPath = (path: string) => path.split('?')[0];
const isCreatePasswordPath = (path: string) => /\/auth\/(create-password|set-password-initial)$/i.test(path);
const isChangePasswordPath = (path: string) => /\/auth\/change-password$/i.test(path);

const conflictFallbackMessage = (context: RequestContext) => {
  const path = cleanPath(context.path);

  if (context.method === 'DELETE' && /^\/users\/\d+$/.test(path)) {
    return 'This admin user cannot be removed.';
  }
  if (context.method === 'PATCH' && /^\/tasktypes\/\d+\/title$/.test(path)) {
    return 'Task type name cannot be changed while tasks are using this type.';
  }
  if (context.method === 'DELETE' && /^\/tasktypes\/\d+$/.test(path)) {
    return 'Task type cannot be removed while tasks are using it.';
  }
  if (context.method === 'POST' && /^\/tasks\/\d+\/run$/.test(path)) {
    return 'Task is already running. Please wait and try again.';
  }
  if (context.method === 'POST' && path === '/auth/login') {
    return 'Password is not set for this account. Please create password first.';
  }
  if (context.method === 'POST' && isCreatePasswordPath(path)) {
    return 'Password is already set for this user or the user does not exist.';
  }
  if (context.method === 'POST' && isChangePasswordPath(path)) {
    return 'Password cannot be changed right now. Verify current password and account setup.';
  }

  return 'Request conflicts with current data. Please refresh and try again.';
};

const statusFallbackMessage = (status: number, context: RequestContext) => {
  const path = cleanPath(context.path);

  if (status === 400) return 'Invalid request. Please check your input and try again.';
  if (status === 401 && context.method === 'POST' && path === '/auth/login') return 'Incorrect email or password.';
  if (status === 401 && context.method === 'POST' && isChangePasswordPath(path)) return 'Current password is incorrect.';
  if (status === 401) return 'You are not authorized. Please sign in and try again.';
  if (status === 403 && context.method === 'POST' && path === '/auth/login') {
    return 'First-time setup required. Please set your password.';
  }
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404 && context.method === 'POST' && isChangePasswordPath(path)) {
    return 'User account was not found.';
  }
  if (status === 404 && context.method === 'POST' && isCreatePasswordPath(path)) {
    return 'Create password endpoint is not available. Please check backend API.';
  }
  if (status === 404) return 'Requested resource was not found.';
  if (status === 409) return conflictFallbackMessage(context);
  if (status >= 500) return 'Server error. Please try again in a moment.';
  return 'Request failed. Please try again.';
};

const parseValidationErrors = (errors?: Record<string, string[]>) => {
  if (!errors) return '';
  const entries = Object.entries(errors).filter(([, messages]) => Array.isArray(messages) && messages.length > 0);
  if (entries.length === 0) return '';
  return entries
    .slice(0, 3)
    .map(([field, messages]) => `${field}: ${messages[0]}`)
    .join(' | ');
};

const normalizeErrorMessage = (status: number, context: RequestContext, rawMessage?: string, validationMessage?: string) => {
  const fallback = statusFallbackMessage(status, context);
  const message = rawMessage?.trim();
  if (!message) return validationMessage || fallback;
  const lower = message.toLowerCase();
  if (
    lower === 'not found' ||
    lower === 'bad request' ||
    lower === 'conflict' ||
    lower === 'forbidden' ||
    lower === 'unauthorized' ||
    lower === 'error' ||
    lower === 'internal server error' ||
    /^http\s+\d+/.test(lower)
  ) {
    return validationMessage || fallback;
  }
  if (message.includes('<!DOCTYPE') || message.includes('<html')) {
    return validationMessage || fallback;
  }
  return validationMessage ? `${message} (${validationMessage})` : message;
};

const toError = async (response: Response, context: RequestContext) => {
  const fallback = statusFallbackMessage(response.status, context);
  try {
    const rawText = await response.text();
    if (!rawText) {
      return new ApiError({ message: fallback, status: response.status, path: context.path, method: context.method });
    }

    try {
      const body = JSON.parse(rawText) as ProblemDetails;
      if (context.method === 'POST' && cleanPath(context.path) === '/auth/login' && response.status === 403 && body.requiresPasswordSetup) {
        return new ApiError({
          message: 'First-time setup required. Please set your password.',
          status: response.status,
          path: context.path,
          method: context.method,
          data: body,
        });
      }
      const rawMessage = body.detail || body.title || body.message;
      const validationMessage = parseValidationErrors(body.errors);
      return new ApiError({
        message: normalizeErrorMessage(response.status, context, rawMessage, validationMessage),
        status: response.status,
        path: context.path,
        method: context.method,
        data: body,
      });
    } catch {
      return new ApiError({
        message: normalizeErrorMessage(response.status, context, rawText),
        status: response.status,
        path: context.path,
        method: context.method,
      });
    }
  } catch {
    return new ApiError({ message: fallback, status: response.status, path: context.path, method: context.method });
  }
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const context: RequestContext = {
    method: (init?.method ?? 'GET').toUpperCase(),
    path,
  };
  let response: Response;
  try {
    response = await fetch(joinUrl(path), {
      credentials: 'include',
      ...init,
    });
  } catch {
    throw new Error('Unable to reach the API server. Check backend URL/CORS and try again.');
  }

  if (!response.ok) throw await toError(response, context);
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
};

export const httpClient = {
  async get<T>(path: string): Promise<T> {
    return request<T>(path);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  async delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
};
