/**
 * Safely parse a fetch Response as JSON.
 * Platform/proxy failures often return plain text like "An error occurred…".
 */
export async function readJsonResponse<T = unknown>(
  res: Response,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const text = await res.text();
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      ok: false,
      error: res.ok
        ? "Empty response from server."
        : `Request failed (${res.status}).`,
      status: res.status,
    };
  }

  try {
    const data = JSON.parse(trimmed) as T;
    if (!res.ok) {
      const message =
        data &&
        typeof data === "object" &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : `Request failed (${res.status}).`;
      return { ok: false, error: message, status: res.status };
    }
    return { ok: true, data };
  } catch {
    const preview = trimmed.slice(0, 160).replace(/\s+/g, " ");
    return {
      ok: false,
      error: res.ok
        ? `Server returned non-JSON: ${preview}`
        : `Request failed (${res.status}): ${preview}`,
      status: res.status,
    };
  }
}
