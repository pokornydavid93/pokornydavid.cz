import type { LeadFormPayload } from "@/lib/api";

export type LeadSubmitResponse = {
  ok: boolean;
  created: boolean;
  deduped: boolean;
  message?: string;
};

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

  async submitLead(payload: LeadFormPayload) {
    const url = `${this.baseUrl}/api/lead`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(payload),
    });

    let data: LeadSubmitResponse | null = null;
    try {
      data = (await res.json()) as LeadSubmitResponse;
    } catch {
      data = null;
    }

    if (!res.ok || !data || data.ok !== true) {
      const message = data?.message || `Request failed (${res.status})`;
      throw new Error(message);
    }

    return data;
  }
}
