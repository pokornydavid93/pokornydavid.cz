export type ApiRequestInit = {
  method?: string
  payload?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
}

export type ApiRequest = <T>(path: string, init?: ApiRequestInit) => Promise<T>
