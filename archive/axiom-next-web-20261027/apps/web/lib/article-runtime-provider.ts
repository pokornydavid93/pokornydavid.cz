import {
  assertArticlePublicRevisionV1,
  type ArticlePublicRevisionV1Wire,
  type PublicArticleDocumentV2,
} from "@axiom-dp/contracts/article";
import { parseContractJson } from "@axiom-dp/contracts/canonical-json";
import { articleDocumentToBlogPost } from "./article-document-adapter.ts";
import type { BlogPost } from "./blog";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const JSON_CONTENT_TYPE_PATTERN =
  /^application\/json(?:\s*;\s*charset=utf-8)?$/iu;
const CONTENT_LENGTH_PATTERN = /^(?:0|[1-9][0-9]*)$/u;

export const ARTICLE_PUBLIC_RUNTIME_MAX_RESPONSE_BYTES = 12 * 1024 * 1024;
export const ARTICLE_PUBLIC_RUNTIME_MAX_ITEMS = 100;
const MAX_RESPONSE_BYTES_TEXT = String(
  ARTICLE_PUBLIC_RUNTIME_MAX_RESPONSE_BYTES,
);

type UnknownRecord = Record<string, unknown>;

export type ArticleRuntimeRequestOptions = Readonly<{
  signal?: AbortSignal;
}>;

export interface ArticleRuntimeProvider {
  listPublishedArticles(
    options?: ArticleRuntimeRequestOptions,
  ): Promise<BlogPost[]>;
  getPublishedArticle(
    slug: string,
    options?: ArticleRuntimeRequestOptions,
  ): Promise<BlogPost | null>;
}

export type ControlApiArticleRuntimeProviderConfig = Readonly<{
  baseUrl: string;
  workspaceId: string;
  fetchImplementation?: typeof fetch;
}>;

export type ArticleRuntimeProviderErrorCode =
  | "invalid_configuration"
  | "invalid_request"
  | "invalid_response"
  | "unavailable";

export class ArticleRuntimeProviderError extends Error {
  readonly code: ArticleRuntimeProviderErrorCode;

  constructor(code: ArticleRuntimeProviderErrorCode) {
    super(`Article runtime provider ${code.replaceAll("_", " ")}.`);
    this.name = "ArticleRuntimeProviderError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  const prototype =
    typeof value === "object" && value !== null
      ? Object.getPrototypeOf(value)
      : undefined;
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (prototype === Object.prototype || prototype === null)
  );
}

function hasExactKeys(value: UnknownRecord, expected: readonly string[]) {
  const actual = Object.keys(value);
  return (
    actual.length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}

function exceedsResponseLimit(value: string) {
  return (
    !CONTENT_LENGTH_PATTERN.test(value) ||
    value.length > MAX_RESPONSE_BYTES_TEXT.length ||
    (value.length === MAX_RESPONSE_BYTES_TEXT.length &&
      value > MAX_RESPONSE_BYTES_TEXT)
  );
}

function normalizeBaseUrl(value: string) {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    throw new ArticleRuntimeProviderError("invalid_configuration");
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ArticleRuntimeProviderError("invalid_configuration");
  }

  if (
    (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new ArticleRuntimeProviderError("invalid_configuration");
  }

  return parsed.toString().replace(/\/+$/u, "");
}

function assertWorkspaceId(value: string) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new ArticleRuntimeProviderError("invalid_configuration");
  }
  return value;
}

function assertSlug(value: string) {
  if (typeof value !== "string" || !SLUG_PATTERN.test(value)) {
    throw new ArticleRuntimeProviderError("invalid_request");
  }
  return value;
}

async function readJsonResponse(response: Response): Promise<unknown> {
  if (!JSON_CONTENT_TYPE_PATTERN.test(response.headers.get("content-type") ?? "")) {
    await response.body?.cancel().catch(() => undefined);
    throw new ArticleRuntimeProviderError("invalid_response");
  }

  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    exceedsResponseLimit(declaredLength)
  ) {
    await response.body?.cancel().catch(() => undefined);
    throw new ArticleRuntimeProviderError("invalid_response");
  }
  if (response.body === null) {
    throw new ArticleRuntimeProviderError("invalid_response");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > ARTICLE_PUBLIC_RUNTIME_MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new ArticleRuntimeProviderError("invalid_response");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ArticleRuntimeProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ArticleRuntimeProviderError("invalid_response");
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return parseContractJson(source) as unknown;
  } catch {
    throw new ArticleRuntimeProviderError("invalid_response");
  }
}

function assertPublicRevision(value: unknown) {
  try {
    return assertArticlePublicRevisionV1(value);
  } catch {
    throw new ArticleRuntimeProviderError("invalid_response");
  }
}

function assertPublicListEnvelope(value: unknown) {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "items"]) ||
    value.schema_version !== 1 ||
    !Array.isArray(value.items) ||
    value.items.length > ARTICLE_PUBLIC_RUNTIME_MAX_ITEMS
  ) {
    throw new ArticleRuntimeProviderError("invalid_response");
  }

  const items = value.items.map(assertPublicRevision);
  const articleIds = new Set<string>();
  const slugs = new Set<string>();

  for (const item of items) {
    if (
      articleIds.has(item.article_id) ||
      slugs.has(item.document.meta.slug)
    ) {
      throw new ArticleRuntimeProviderError("invalid_response");
    }
    articleIds.add(item.article_id);
    slugs.add(item.document.meta.slug);
  }

  return items;
}

function mapPublicRevisions(
  revisions: readonly Readonly<ArticlePublicRevisionV1Wire>[],
) {
  const documents: PublicArticleDocumentV2[] = revisions.map(
    (revision) => revision.document,
  );
  return revisions.map((revision) =>
    articleDocumentToBlogPost(revision.document, documents),
  );
}

async function fetchJson(
  fetchImplementation: typeof fetch,
  url: string,
  signal: AbortSignal | undefined,
) {
  let response: Response;
  try {
    response = await fetchImplementation(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ArticleRuntimeProviderError("unavailable");
  }
  return response;
}

export function createControlApiArticleRuntimeProvider(
  config: ControlApiArticleRuntimeProviderConfig,
): ArticleRuntimeProvider {
  if (!config || typeof config !== "object") {
    throw new ArticleRuntimeProviderError("invalid_configuration");
  }

  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const workspaceId = assertWorkspaceId(config.workspaceId);
  const fetchImplementation = config.fetchImplementation ?? globalThis.fetch;
  if (typeof fetchImplementation !== "function") {
    throw new ArticleRuntimeProviderError("invalid_configuration");
  }

  const collectionUrl = `${baseUrl}/public/content/workspaces/${workspaceId}/articles`;

  return {
    async listPublishedArticles(options = {}) {
      const response = await fetchJson(
        fetchImplementation,
        collectionUrl,
        options.signal,
      );
      if (response.status !== 200) {
        await response.body?.cancel().catch(() => undefined);
        throw new ArticleRuntimeProviderError("unavailable");
      }

      const revisions = assertPublicListEnvelope(await readJsonResponse(response));
      return mapPublicRevisions(revisions);
    },

    async getPublishedArticle(slug, options = {}) {
      const checkedSlug = assertSlug(slug);
      const response = await fetchJson(
        fetchImplementation,
        `${collectionUrl}/${checkedSlug}`,
        options.signal,
      );
      if (response.status === 404) {
        await response.body?.cancel().catch(() => undefined);
        return null;
      }
      if (response.status !== 200) {
        await response.body?.cancel().catch(() => undefined);
        throw new ArticleRuntimeProviderError("unavailable");
      }

      const revision = assertPublicRevision(await readJsonResponse(response));
      if (revision.document.meta.slug !== checkedSlug) {
        throw new ArticleRuntimeProviderError("invalid_response");
      }
      return mapPublicRevisions([revision])[0] ?? null;
    },
  };
}
