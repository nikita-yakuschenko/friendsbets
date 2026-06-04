import { Agent } from "undici";

const FETCH_USER_AGENT =
  "FriendsBets/1.0 (+https://github.com/friendsbets; match sync)";

const DEFAULT_TIMEOUT_MS = 20_000;
/** TCP connect (undici default 10s — с Dokploy до championat.ru часто не хватает). */
const CONNECT_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 800;

const championatFetchDispatcher = new Agent({
  connect: { timeout: CONNECT_TIMEOUT_MS },
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  const cause = (error as Error & { cause?: unknown }).cause;
  const causeMessage =
    cause instanceof Error ? cause.message.toLowerCase() : "";
  const causeCode =
    cause && typeof cause === "object" && "code" in cause
      ? String((cause as { code?: string }).code)
      : "";

  return (
    message.includes("terminated") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("connect timeout") ||
    message.includes("fetch failed") ||
    causeMessage.includes("econnreset") ||
    causeMessage.includes("etimedout") ||
    causeMessage.includes("connect timeout") ||
    causeCode === "UND_ERR_CONNECT_TIMEOUT" ||
    causeCode === "UND_ERR_SOCKET" ||
    error.name === "AbortError" ||
    error.name === "TimeoutError"
  );
}

/** Загрузка HTML Championat с повторами при обрыве соединения. */
export async function fetchChampionatHtml(
  url: string,
  options?: { timeoutMs?: number },
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": FETCH_USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatcher: championatFetchDispatcher as any,
      });

      if (!response.ok) {
        throw new Error(
          `Championat request failed (${response.status}): ${url}`,
        );
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS && isRetryableFetchError(error)) {
        await sleep(RETRY_BASE_DELAY_MS * attempt);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
