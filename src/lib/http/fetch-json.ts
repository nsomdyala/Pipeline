import { readJsonResponse } from "@/lib/http/read-json";

const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Fetch JSON with a hard timeout so UI never hangs on "Loading…".
 */
export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    return readJsonResponse<T>(res);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        error: `Request timed out after ${Math.round(timeoutMs / 1000)}s.`,
        status: 408,
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network request failed.",
      status: 0,
    };
  } finally {
    clearTimeout(timer);
  }
}
