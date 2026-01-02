import type { ApiRequest, ApiRequestInit } from "./core/request"
import { createLeadFormApi } from "./routes/leadForm"
import { createTestimonialsApi } from "./routes/testimonials"

export type CreateApiOptions = {
  baseUrl?: string
  token?: string | null
}

export function createApi(options: CreateApiOptions = {}) {
  const apiBase = (options.baseUrl ?? "/api").replace(/\/+$/, "")
  const token = options.token ?? null

  const request: ApiRequest = async <T>(path: string, init: ApiRequestInit = {}) => {
    const { method = "GET", payload, headers, signal } = init

    const requestHeaders = new Headers(headers)

    if (payload !== undefined && !requestHeaders.has("Content-Type")) {
      requestHeaders.set("Content-Type", "application/json")
    }

    if (token && !requestHeaders.has("Authorization")) {
      requestHeaders.set("Authorization", `Bearer ${token}`)
    }

    const url = `${apiBase}${path.startsWith("/") ? path : `/${path}`}`

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
      signal,
    })

    // Error handling – vždy text, žádné json pokusy
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Request failed with status ${response.status}`)
    }

    if (response.status === 204) {
      return undefined as T
    }

    const text = await response.text()
    if (text.trim() === "") {
      return undefined as T
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      return JSON.parse(text) as T
    }

    return text as unknown as T
  }

  return {
    leadForm: createLeadFormApi(request),
    testimonials: createTestimonialsApi(request),
  }
}
