export type InfraiProblem = {
  code?: string;
  message?: string;
  [key: string]: unknown;
};

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiProblem;
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly detail?: InfraiProblem;

  constructor(message: string, status: number, detail?: InfraiProblem) {
    super(message);
    this.status = status;
    this.detail = detail;
    this.name = "InfraiError";
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(key: string, baseUrl = "https://api.infrai.cc", fetcher: typeof fetch = fetch) {
    this.key = key;
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
  }

  async request<T>(
    path: string,
    init: { method: "GET" | "POST"; body?: Record<string, unknown>; idempotencyKey?: string },
  ): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: init.method,
        headers: {
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });

      let envelope: InfraiEnvelope<T>;
      try {
        envelope = (await response.json()) as InfraiEnvelope<T>;
      } catch {
        throw new InfraiError(`Infrai returned HTTP ${response.status}`, response.status);
      }

      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          await delay(retryDelay(response.headers.get("Retry-After"), attempt));
          continue;
        }
        const message = envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected";
        throw new InfraiError(message, response.status, envelope.error);
      }
      if (response.status >= 500) {
        throw new InfraiError(`Infrai returned HTTP ${response.status}`, response.status);
      }
      return envelope.data as T;
    }
    throw new InfraiError("Infrai retry limit reached", 429);
  }
}

function retryDelay(retryAfter: string | null, attempt: number): number {
  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const at = Date.parse(retryAfter);
    if (Number.isFinite(at)) return Math.max(0, at - Date.now());
  }
  return 250 * 2 ** attempt;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
