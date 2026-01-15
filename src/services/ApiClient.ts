import type { LeadFormPayload } from "@/lib/api";

export type LeadSubmitResponse = {
  message?: string;
  deduped?: boolean;
};

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    if (!baseUrl) {
      throw new Error("ApiClient: baseUrl is required");
    }
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;

    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");

    const res = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
      cache: init.cache ?? "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed (${res.status})`);
    }

    if (res.status === 204) {
      return null as T;
    }

    const text = await res.text();
    if (!text) {
      return null as T;
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return JSON.parse(text) as T;
    }

    return text as unknown as T;
  }

  private async safeReadJson<T>(res: Response): Promise<T | null> {
    if (res.status === 204) {
      return null;
    }

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    const isJson =
      contentType.includes("application/json") || contentType.includes("+json");

    const text = await res.text();
    if (!text) {
      return null;
    }

    if (isJson) {
      try {
        return JSON.parse(text) as T;
      } catch {
        return null;
      }
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  async submitLead(payload: LeadFormPayload) {
    const url = `${this.baseUrl}/api/lead`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(payload),
    });

    const data = await this.safeReadJson<{ message?: string } & LeadSubmitResponse>(
      res
    );

    if (!res.ok) {
      const message =
        data?.message ??
        (res.status === 429 ? "Příliš mnoho pokusů." : `HTTP ${res.status}`);
      throw new ApiError(message, res.status, data);
    }

    return {
      message: data?.message ?? "",
      deduped: Boolean(data?.deduped),
    };
  }
}
