/**
 * Thin HTTP client for the Spring Boot API.
 * Knows about auth tokens and error shapes; knows nothing about UI.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");

const TOKEN_KEY = "wdmmg.token";

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;
  /** Machine-readable reason from the API, e.g. "EMAIL_NOT_VERIFIED". */
  readonly code: string | null;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}, code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }

  get isNetwork() {
    return this.status === 0;
  }
  get isUnauthorized() {
    return this.status === 401;
  }
}

// ---------------------------------------------------------------- token storage

type AuthListener = () => void;
const unauthorizedListeners = new Set<AuthListener>();

/** Called when the API rejects our token (expired / revoked). */
export function onUnauthorized(listener: AuthListener) {
  unauthorizedListeners.add(listener);
  return () => void unauthorizedListeners.delete(listener);
}

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable (private mode) – session lasts for this tab only */
    }
  },
};

// ---------------------------------------------------------------- requests

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export function toQueryString(params: QueryParams = {}): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

async function parseError(res: Response): Promise<ApiError> {
  let message = defaultMessage(res.status);
  let fieldErrors: Record<string, string> = {};
  let code: string | null = null;
  try {
    const body = await res.json();
    if (typeof body?.message === "string" && body.message) message = body.message;
    if (body?.fieldErrors && typeof body.fieldErrors === "object") fieldErrors = body.fieldErrors;
    if (typeof body?.code === "string") code = body.code;
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(res.status, message, fieldErrors, code);
}

function defaultMessage(status: number) {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "We couldn't find what you were looking for.";
  if (status >= 500) return "The server ran into a problem. Please try again in a moment.";
  return `Request failed (${status}).`;
}

async function request<T>(method: string, path: string, body?: unknown, params?: QueryParams): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  // FormData sets its own multipart boundary header.
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}${toQueryString(params)}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection or that the API is running.");
  }

  if (!res.ok) {
    const error = await parseError(res);
    if (res.status === 401 && token) unauthorizedListeners.forEach((l) => l());
    throw error;
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const http = {
  get: <T>(path: string, params?: QueryParams) => request<T>("GET", path, undefined, params),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown = {}) => request<T>("PUT", path, body),
  /** Multipart upload (e.g. images). */
  upload: <T>(path: string, form: FormData, method: "POST" | "PUT" = "PUT") => request<T>(method, path, form),
  delete: <T = void>(path: string) => request<T>("DELETE", path),
};

/** Streams an authenticated file download to the browser. */
export async function downloadFile(path: string, params: QueryParams, filename: string) {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}${toQueryString(params)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError(0, "Can't reach the server.");
  }
  if (!res.ok) throw await parseError(res);
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Absolute URL for an API-relative asset path (e.g. an avatar). */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
}

export function errorMessage(error: unknown, fallback = "Something unexpected happened."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
