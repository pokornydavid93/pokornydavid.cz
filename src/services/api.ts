import { ApiClient } from "./ApiClient";

let _api: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (_api) return _api;

  const baseUrl = process.env.NEXT_PUBLIC_CLIENT_SERVER_URL;

  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_CLIENT_SERVER_URL is not defined. Set it in .env.local (dev) and .env.production / Netlify env (prod)."
    );
  }

  _api = new ApiClient(baseUrl);
  return _api;
}
