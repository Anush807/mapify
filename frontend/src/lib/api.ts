import type { Roadmap, RoadmapSummary, User } from './types';

const BASE_URL = '/api';

/** Mirrors the backend's error envelope so callers can branch on `code`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** The AI couldn't produce a valid roadmap — rewording the topic may help. */
  get isUnprocessable(): boolean {
    return this.status === 422;
  }

  /** The provider itself failed — retrying the same topic is reasonable. */
  get isUpstreamFailure(): boolean {
    return this.status === 502;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      // Sends the httpOnly auth cookie on every call.
      credentials: 'include',
      headers:
        init.body !== undefined ? { 'Content-Type': 'application/json', ...init.headers } : init.headers ?? {},
      ...init,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', "Couldn't reach the server. Check your connection.");
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload: unknown = text ? safeParse(text) : null;

  if (!response.ok) {
    const err = (payload as { error?: { code?: string; message?: string; details?: unknown } })
      ?.error;
    throw new ApiError(
      response.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? `Request failed (${response.status})`,
      err?.details,
    );
  }

  return payload as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = {
  signup: (body: { email: string; password: string; confirmPassword: string }) =>
    request<{ user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),

  me: () => request<{ user: User }>('/auth/me'),

  verifyEmail: (token: string) =>
    request<{ user: User }>(`/auth/verify-email?token=${encodeURIComponent(token)}`),

  /** Signed in: no body needed. Signed out: pass the address. */
  resendVerification: (email?: string) =>
    request<{ ok: true }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify(email ? { email } : {}),
    }),

  createRoadmap: (topic: string) =>
    request<{ roadmap: Roadmap }>('/roadmaps', {
      method: 'POST',
      body: JSON.stringify({ topic }),
    }),

  listRoadmaps: () => request<{ roadmaps: RoadmapSummary[] }>('/roadmaps'),

  getRoadmap: (id: string) => request<{ roadmap: Roadmap }>(`/roadmaps/${id}`),

  deleteRoadmap: (id: string) => request<void>(`/roadmaps/${id}`, { method: 'DELETE' }),

  updateProgress: (id: string, completedIds: string[]) =>
    request<{ progress: { completedIds: string[]; totalNodes: number } }>(
      `/roadmaps/${id}/progress`,
      { method: 'PATCH', body: JSON.stringify({ completedIds }) },
    ),
};
