const BASE = "/api";

// Fields are declared, not constructor parameter properties: tsconfig sets
// erasableSyntaxOnly, which rejects `constructor(readonly status: number)`.
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    const detail =
      typeof body === "object" && body !== null && "detail" in body
        ? (body as { detail?: unknown }).detail
        : null;
    super(typeof detail === "string" ? detail : `request failed with ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type JsonBody = unknown;

async function request<T>(
  method: string,
  path: string,
  body?: JsonBody,
  token?: string | null,
): Promise<T> {
  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, errBody);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// The response type is yours to declare: nothing infers across the Python boundary, so a
// TS interface here mirrors the endpoint's Pydantic model by hand — keep the two in sync.
export const apiGet = <T>(path: string, token?: string | null) =>
  request<T>("GET", path, undefined, token);
export const apiPost = <T>(path: string, body?: JsonBody, token?: string | null) =>
  request<T>("POST", path, body ?? null, token);
export const apiPut = <T>(path: string, body?: JsonBody, token?: string | null) =>
  request<T>("PUT", path, body ?? null, token);
export const apiPatch = <T>(path: string, body?: JsonBody, token?: string | null) =>
  request<T>("PATCH", path, body ?? null, token);
export const apiDelete = <T>(path: string, token?: string | null) =>
  request<T>("DELETE", path, undefined, token);

export async function apiPostStream(
  path: string,
  body: JsonBody,
  token: string | null,
  onChunk: (text: string) => void,
): Promise<void> {
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new ApiError(response.status, errorBody);
  }
  if (!response.body) throw new Error("Translation stream is unavailable");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let eventName = "message";
  while (true) {
    const { done, value } = await reader.read();
    pending += decoder.decode(value, { stream: !done });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventName = line.slice(7);
      } else if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6)) as { text?: string; status?: number; detail?: string };
        if (eventName === "error") {
          throw new ApiError(data.status ?? 502, { detail: data.detail });
        }
        if (data.text) onChunk(data.text);
        eventName = "message";
      }
    }
    if (done) break;
  }
}
