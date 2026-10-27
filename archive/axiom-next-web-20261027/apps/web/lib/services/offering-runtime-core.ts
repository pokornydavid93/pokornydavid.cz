import {
  assertWorkspaceOfferingListResponseV1,
  type WorkspaceOfferingV1Wire,
} from "@axiom-dp/contracts/workspace-offering";
import { parseContractJson } from "@axiom-dp/contracts/canonical-json";

export const OFFERING_CATALOG_PATH_PREFIX = "/public/catalog/workspaces";
export const OFFERING_CATALOG_RUNTIME_MODE_ENV =
  "AXIOM_OFFERING_CATALOG_RUNTIME";
export const OFFERING_CATALOG_ORIGIN_ENV = "AXIOM_OFFERING_CATALOG_ORIGIN";
export const OFFERING_CATALOG_WORKSPACE_ID_ENV =
  "AXIOM_OFFERING_CATALOG_WORKSPACE_ID";
export const OFFERING_CATALOG_TIMEOUT_ENV =
  "AXIOM_OFFERING_CATALOG_TIMEOUT_MS";
export const OFFERING_PUBLIC_CATALOG_RUNTIME_MODE_ENV =
  "AXIOM_PUBLIC_OFFERING_CATALOG_RUNTIME";
export const OFFERING_PUBLIC_CATALOG_ORIGIN_ENV =
  "AXIOM_PUBLIC_OFFERING_CATALOG_ORIGIN";
export const OFFERING_PUBLIC_CATALOG_WORKSPACE_ID_ENV =
  "AXIOM_PUBLIC_OFFERING_CATALOG_WORKSPACE_ID";
export const OFFERING_PUBLIC_CATALOG_TIMEOUT_ENV =
  "AXIOM_PUBLIC_OFFERING_CATALOG_TIMEOUT_MS";
export const OFFERING_CATALOG_MAX_RESPONSE_BYTES = 512 * 1024;

const DEFAULT_TIMEOUT_MS = 3_000;
const MIN_TIMEOUT_MS = 250;
const MAX_TIMEOUT_MS = 10_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const JSON_CONTENT_TYPE_PATTERN =
  /^application\/json(?:\s*;\s*charset=utf-8)?$/iu;
const CONTENT_LENGTH_PATTERN = /^(?:0|[1-9][0-9]*)$/u;

export type OfferingCatalogRuntimeMode = "repository" | "control-api";

export type OfferingCatalogProductionConfig = Readonly<{
  origin: string;
  workspaceId: string;
  endpointUrl: string;
  timeoutMs: number;
}>;

export interface OfferingRuntimeProvider {
  listActiveOfferings(): Promise<readonly WorkspaceOfferingV1Wire[]>;
}

export type OfferingCatalogRuntimeErrorCode =
  | "invalid_configuration"
  | "unavailable"
  | "invalid_response"
  | "incomplete_catalog";

export class OfferingCatalogRuntimeError extends Error {
  readonly code: OfferingCatalogRuntimeErrorCode;

  constructor(code: OfferingCatalogRuntimeErrorCode) {
    super(`Offering catalog runtime ${code.replaceAll("_", " ")}.`);
    this.name = "OfferingCatalogRuntimeError";
    this.code = code;
  }
}

function fail(code: OfferingCatalogRuntimeErrorCode): never {
  throw new OfferingCatalogRuntimeError(code);
}

function resolveEnvironmentAlias(
  environment: Record<string, string | undefined>,
  legacyName: string,
  publicName: string,
) {
  const legacyValue = environment[legacyName];
  const publicValue = environment[publicName];
  if (
    legacyValue !== undefined &&
    legacyValue !== "" &&
    publicValue !== undefined &&
    publicValue !== "" &&
    legacyValue !== publicValue
  ) {
    return fail("invalid_configuration");
  }
  return legacyValue !== undefined && legacyValue !== ""
    ? legacyValue
    : publicValue;
}

const isLoopbackHostname = (hostname: string) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "[::1]";

export function resolveOfferingCatalogRuntimeMode(
  environment: Record<string, string | undefined>,
): OfferingCatalogRuntimeMode {
  const configuredMode = resolveEnvironmentAlias(
    environment,
    OFFERING_CATALOG_RUNTIME_MODE_ENV,
    OFFERING_PUBLIC_CATALOG_RUNTIME_MODE_ENV,
  );
  const production = environment.NODE_ENV === "production";
  const hasControlApiConfiguration = [
    resolveEnvironmentAlias(
      environment,
      OFFERING_CATALOG_ORIGIN_ENV,
      OFFERING_PUBLIC_CATALOG_ORIGIN_ENV,
    ),
    resolveEnvironmentAlias(
      environment,
      OFFERING_CATALOG_WORKSPACE_ID_ENV,
      OFFERING_PUBLIC_CATALOG_WORKSPACE_ID_ENV,
    ),
    resolveEnvironmentAlias(
      environment,
      OFFERING_CATALOG_TIMEOUT_ENV,
      OFFERING_PUBLIC_CATALOG_TIMEOUT_ENV,
    ),
  ].some((value) => value !== undefined && value !== "");

  if (configuredMode === undefined || configuredMode === "") {
    if (!production && hasControlApiConfiguration) {
      return fail("invalid_configuration");
    }
    return production ? "control-api" : "repository";
  }
  if (configuredMode !== configuredMode.trim()) {
    return fail("invalid_configuration");
  }
  if (configuredMode === "control-api") return "control-api";
  if (
    configuredMode === "repository" &&
    !production &&
    !hasControlApiConfiguration
  ) {
    return "repository";
  }
  return fail("invalid_configuration");
}

export function parseOfferingCatalogProductionConfig(
  environment: Record<string, string | undefined>,
): OfferingCatalogProductionConfig {
  const rawOrigin = resolveEnvironmentAlias(
    environment,
    OFFERING_CATALOG_ORIGIN_ENV,
    OFFERING_PUBLIC_CATALOG_ORIGIN_ENV,
  );
  const workspaceId = resolveEnvironmentAlias(
    environment,
    OFFERING_CATALOG_WORKSPACE_ID_ENV,
    OFFERING_PUBLIC_CATALOG_WORKSPACE_ID_ENV,
  );
  const rawTimeout = resolveEnvironmentAlias(
    environment,
    OFFERING_CATALOG_TIMEOUT_ENV,
    OFFERING_PUBLIC_CATALOG_TIMEOUT_ENV,
  );

  if (
    !rawOrigin ||
    rawOrigin !== rawOrigin.trim() ||
    rawOrigin.length > 2_048 ||
    !workspaceId ||
    !UUID_PATTERN.test(workspaceId)
  ) {
    return fail("invalid_configuration");
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(rawOrigin);
  } catch {
    return fail("invalid_configuration");
  }

  const canonicalInput = rawOrigin.endsWith("/")
    ? rawOrigin.slice(0, -1)
    : rawOrigin;
  if (
    canonicalInput !== parsedOrigin.origin ||
    parsedOrigin.username !== "" ||
    parsedOrigin.password !== "" ||
    parsedOrigin.search !== "" ||
    parsedOrigin.hash !== "" ||
    (parsedOrigin.pathname !== "" && parsedOrigin.pathname !== "/") ||
    (parsedOrigin.protocol !== "https:" &&
      !(parsedOrigin.protocol === "http:" &&
        isLoopbackHostname(parsedOrigin.hostname)))
  ) {
    return fail("invalid_configuration");
  }

  let timeoutMs = DEFAULT_TIMEOUT_MS;
  if (rawTimeout !== undefined) {
    if (!/^[1-9][0-9]*$/u.test(rawTimeout)) {
      return fail("invalid_configuration");
    }
    timeoutMs = Number(rawTimeout);
    if (
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs < MIN_TIMEOUT_MS ||
      timeoutMs > MAX_TIMEOUT_MS
    ) {
      return fail("invalid_configuration");
    }
  }

  const origin = parsedOrigin.origin;
  return Object.freeze({
    origin,
    workspaceId,
    endpointUrl: `${origin}${OFFERING_CATALOG_PATH_PREFIX}/${workspaceId}/offerings`,
    timeoutMs,
  });
}

async function cancelResponse(response: Response) {
  await response.body?.cancel().catch(() => undefined);
}

async function readBoundedJson(response: Response): Promise<unknown> {
  if (
    !JSON_CONTENT_TYPE_PATTERN.test(response.headers.get("content-type") ?? "")
  ) {
    await cancelResponse(response);
    return fail("invalid_response");
  }

  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    (!CONTENT_LENGTH_PATTERN.test(declaredLength) ||
      Number(declaredLength) > OFFERING_CATALOG_MAX_RESPONSE_BYTES)
  ) {
    await cancelResponse(response);
    return fail("invalid_response");
  }
  if (response.body === null) return fail("invalid_response");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > OFFERING_CATALOG_MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return fail("invalid_response");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof OfferingCatalogRuntimeError) throw error;
    return fail("invalid_response");
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return parseContractJson(source) as unknown;
  } catch {
    return fail("invalid_response");
  }
}

export function createControlApiOfferingRuntimeProvider(
  config: OfferingCatalogProductionConfig,
  fetchImplementation: typeof fetch = globalThis.fetch,
): OfferingRuntimeProvider {
  let canonicalConfig: OfferingCatalogProductionConfig;
  try {
    canonicalConfig = parseOfferingCatalogProductionConfig({
      [OFFERING_CATALOG_ORIGIN_ENV]: config?.origin,
      [OFFERING_CATALOG_WORKSPACE_ID_ENV]: config?.workspaceId,
      [OFFERING_CATALOG_TIMEOUT_ENV]: String(config?.timeoutMs),
    });
  } catch {
    return fail("invalid_configuration");
  }
  if (
    config?.endpointUrl !== canonicalConfig.endpointUrl ||
    typeof fetchImplementation !== "function"
  ) {
    return fail("invalid_configuration");
  }

  return Object.freeze({
    async listActiveOfferings() {
      let response: Response;
      try {
        response = await fetchImplementation(canonicalConfig.endpointUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          signal: AbortSignal.timeout(canonicalConfig.timeoutMs),
        });
      } catch {
        return fail("unavailable");
      }

      if (response.status !== 200) {
        await cancelResponse(response);
        return fail("unavailable");
      }

      try {
        const envelope = assertWorkspaceOfferingListResponseV1(
          await readBoundedJson(response),
          canonicalConfig.workspaceId,
          "active",
        );
        return envelope.items;
      } catch (error) {
        if (
          error instanceof OfferingCatalogRuntimeError &&
          error.code !== "invalid_response"
        ) {
          throw error;
        }
        return fail("invalid_response");
      }
    },
  });
}

type RepositoryServiceContent = Readonly<{
  offeringKey: string;
  title: string;
  description: string;
}>;

export function projectAxiomOfferingContent<
  Service extends RepositoryServiceContent,
>(
  repositoryItems: readonly Service[],
  offerings: readonly WorkspaceOfferingV1Wire[],
): readonly Service[] {
  const repositoryKeys = new Set<string>();
  for (const service of repositoryItems) {
    if (repositoryKeys.has(service.offeringKey)) {
      return fail("incomplete_catalog");
    }
    repositoryKeys.add(service.offeringKey);
  }
  const offeringsByKey = new Map(
    offerings.map((offering) => [offering.key, offering]),
  );
  if (
    offeringsByKey.size !== offerings.length ||
    repositoryItems.some((service) => !offeringsByKey.has(service.offeringKey))
  ) {
    return fail("incomplete_catalog");
  }

  return Object.freeze(
    repositoryItems.map((service) => {
      const offering = offeringsByKey.get(service.offeringKey);
      if (
        !offering ||
        offering.kind !== "service" ||
        offering.status !== "active" ||
        offering.description === null
      ) {
        return fail("incomplete_catalog");
      }

      return Object.freeze({
        ...service,
        title: offering.name,
        description: offering.description,
      }) as Service;
    }),
  );
}
