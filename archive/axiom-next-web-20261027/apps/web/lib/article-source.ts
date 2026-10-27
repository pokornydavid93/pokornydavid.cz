export const ARTICLE_SOURCE_ENV = "AXIOM_ARTICLE_SOURCE" as const;
export const ARTICLE_RUNTIME_ORIGIN_ENV =
  "AXIOM_ARTICLE_RUNTIME_ORIGIN" as const;
export const ARTICLE_RUNTIME_WORKSPACE_ID_ENV =
  "AXIOM_ARTICLE_RUNTIME_WORKSPACE_ID" as const;
export const ARTICLE_RUNTIME_TIMEOUT_ENV =
  "AXIOM_ARTICLE_RUNTIME_TIMEOUT_MS" as const;
export const ARTICLE_PUBLIC_SOURCE_ENV = "AXIOM_PUBLIC_ARTICLE_SOURCE" as const;
export const ARTICLE_PUBLIC_RUNTIME_ORIGIN_ENV =
  "AXIOM_PUBLIC_ARTICLE_RUNTIME_ORIGIN" as const;
export const ARTICLE_PUBLIC_RUNTIME_WORKSPACE_ID_ENV =
  "AXIOM_PUBLIC_ARTICLE_RUNTIME_WORKSPACE_ID" as const;
export const ARTICLE_PUBLIC_RUNTIME_TIMEOUT_ENV =
  "AXIOM_PUBLIC_ARTICLE_RUNTIME_TIMEOUT_MS" as const;

const DEFAULT_RUNTIME_TIMEOUT_MS = 3_000;
const MINIMUM_RUNTIME_TIMEOUT_MS = 250;
const MAXIMUM_RUNTIME_TIMEOUT_MS = 10_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export type ArticleSourceConfig =
  | Readonly<{ mode: "repository" }>
  | Readonly<{
      mode: "published";
      origin: string;
      workspaceId: string;
      timeoutMs: number;
    }>;

export const ARTICLE_SOURCE_CONFIGURATION_ERROR_CODES = [
  "invalid_mode",
  "published_required_in_production",
  "ambiguous_repository_configuration",
  "incomplete_published_configuration",
  "invalid_published_origin",
  "invalid_published_workspace",
  "invalid_published_timeout",
  "conflicting_environment_alias",
] as const;

export type ArticleSourceConfigurationErrorCode =
  (typeof ARTICLE_SOURCE_CONFIGURATION_ERROR_CODES)[number];

export class ArticleSourceConfigurationError extends Error {
  readonly code: ArticleSourceConfigurationErrorCode;

  constructor(code: ArticleSourceConfigurationErrorCode) {
    super(`Article source configuration is invalid (${code}).`);
    this.name = "ArticleSourceConfigurationError";
    this.code = code;
  }
}

const fail = (code: ArticleSourceConfigurationErrorCode): never => {
  throw new ArticleSourceConfigurationError(code);
};

const isConfigured = (value: string | undefined): value is string =>
  value !== undefined && value !== "";

function resolveEnvironmentAlias(
  environment: Readonly<Record<string, string | undefined>>,
  legacyName: string,
  publicName: string,
) {
  const legacyValue = environment[legacyName];
  const publicValue = environment[publicName];
  if (
    isConfigured(legacyValue) &&
    isConfigured(publicValue) &&
    legacyValue !== publicValue
  ) {
    return fail("conflicting_environment_alias");
  }
  return isConfigured(legacyValue) ? legacyValue : publicValue;
}

const isLoopbackHostname = (hostname: string) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "[::1]";

function resolvePublishedOrigin(rawOrigin: string) {
  if (rawOrigin !== rawOrigin.trim() || rawOrigin.length > 2_048) {
    return fail("invalid_published_origin");
  }

  let origin: URL;
  try {
    origin = new URL(rawOrigin);
  } catch {
    return fail("invalid_published_origin");
  }

  const canonicalInput = rawOrigin.endsWith("/")
    ? rawOrigin.slice(0, -1)
    : rawOrigin;
  if (
    canonicalInput !== origin.origin ||
    origin.username !== "" ||
    origin.password !== "" ||
    origin.pathname !== "/" ||
    origin.search !== "" ||
    origin.hash !== "" ||
    (origin.protocol !== "https:" &&
      !(origin.protocol === "http:" && isLoopbackHostname(origin.hostname)))
  ) {
    return fail("invalid_published_origin");
  }

  return origin.origin;
}

function resolvePublishedTimeout(rawTimeout: string | undefined) {
  if (rawTimeout === undefined || rawTimeout === "") {
    return DEFAULT_RUNTIME_TIMEOUT_MS;
  }
  if (!/^[1-9][0-9]*$/u.test(rawTimeout)) {
    return fail("invalid_published_timeout");
  }
  const timeoutMs = Number(rawTimeout);
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < MINIMUM_RUNTIME_TIMEOUT_MS ||
    timeoutMs > MAXIMUM_RUNTIME_TIMEOUT_MS
  ) {
    return fail("invalid_published_timeout");
  }
  return timeoutMs;
}

/**
 * Repository is the zero-configuration local/test mode. Production requires an
 * explicit published source. Partial or ambiguous runtime configuration never
 * changes the selected source and never falls back to repository content.
 */
export function resolveArticleSourceConfig(
  environment: Readonly<Record<string, string | undefined>>,
): ArticleSourceConfig {
  const rawMode = resolveEnvironmentAlias(
    environment,
    ARTICLE_SOURCE_ENV,
    ARTICLE_PUBLIC_SOURCE_ENV,
  );
  const rawOrigin = resolveEnvironmentAlias(
    environment,
    ARTICLE_RUNTIME_ORIGIN_ENV,
    ARTICLE_PUBLIC_RUNTIME_ORIGIN_ENV,
  );
  const rawWorkspaceId = resolveEnvironmentAlias(
    environment,
    ARTICLE_RUNTIME_WORKSPACE_ID_ENV,
    ARTICLE_PUBLIC_RUNTIME_WORKSPACE_ID_ENV,
  );
  const rawTimeout = resolveEnvironmentAlias(
    environment,
    ARTICLE_RUNTIME_TIMEOUT_ENV,
    ARTICLE_PUBLIC_RUNTIME_TIMEOUT_ENV,
  );
  const isProduction = environment.NODE_ENV === "production";
  const hasPublishedConfiguration = [
    rawOrigin,
    rawWorkspaceId,
    rawTimeout,
  ].some(isConfigured);

  if (rawMode === undefined || rawMode === "") {
    if (isProduction) {
      return fail("published_required_in_production");
    }
    if (hasPublishedConfiguration) {
      return fail("ambiguous_repository_configuration");
    }
    return Object.freeze({ mode: "repository" });
  }

  if (rawMode === "repository") {
    if (isProduction) {
      return fail("published_required_in_production");
    }
    if (hasPublishedConfiguration) {
      return fail("ambiguous_repository_configuration");
    }
    return Object.freeze({ mode: "repository" });
  }

  if (rawMode !== "published") {
    return fail("invalid_mode");
  }
  if (!isConfigured(rawOrigin) || !isConfigured(rawWorkspaceId)) {
    return fail("incomplete_published_configuration");
  }
  if (!UUID_PATTERN.test(rawWorkspaceId)) {
    return fail("invalid_published_workspace");
  }

  return Object.freeze({
    mode: "published",
    origin: resolvePublishedOrigin(rawOrigin),
    workspaceId: rawWorkspaceId,
    timeoutMs: resolvePublishedTimeout(rawTimeout),
  });
}

export type ArticleSourceLoaders<Value> = Readonly<{
  repository: () => Promise<Value>;
  published: (
    config: Extract<ArticleSourceConfig, { mode: "published" }>,
  ) => Promise<Value>;
}>;

export function loadConfiguredArticleSource<Value>(
  config: ArticleSourceConfig,
  loaders: ArticleSourceLoaders<Value>,
): Promise<Value> {
  return config.mode === "published"
    ? loaders.published(config)
    : loaders.repository();
}
