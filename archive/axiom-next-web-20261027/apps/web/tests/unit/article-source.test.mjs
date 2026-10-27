import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  ARTICLE_PUBLIC_RUNTIME_ORIGIN_ENV,
  ARTICLE_PUBLIC_RUNTIME_WORKSPACE_ID_ENV,
  ARTICLE_PUBLIC_SOURCE_ENV,
  ARTICLE_RUNTIME_ORIGIN_ENV,
  ARTICLE_RUNTIME_TIMEOUT_ENV,
  ARTICLE_RUNTIME_WORKSPACE_ID_ENV,
  ARTICLE_SOURCE_ENV,
  ArticleSourceConfigurationError,
  loadConfiguredArticleSource,
  resolveArticleSourceConfig,
} from "../../lib/article-source.ts";

const workspaceId = "11111111-1111-4111-8111-111111111111";

const publishedEnvironment = (overrides = {}) => ({
  [ARTICLE_SOURCE_ENV]: "published",
  [ARTICLE_RUNTIME_ORIGIN_ENV]: "https://control.example.test/",
  [ARTICLE_RUNTIME_WORKSPACE_ID_ENV]: workspaceId,
  ...overrides,
});

const assertConfigurationError = (code) => (error) => {
  assert.ok(error instanceof ArticleSourceConfigurationError);
  assert.equal(error.code, code);
  return true;
};

describe("article source selection", () => {
  it("uses repository only as the zero-configuration local mode", () => {
    assert.deepEqual(resolveArticleSourceConfig({ NODE_ENV: "development" }), {
      mode: "repository",
    });
    assert.deepEqual(resolveArticleSourceConfig({ NODE_ENV: "test" }), {
      mode: "repository",
    });
    assert.deepEqual(
      resolveArticleSourceConfig({
        NODE_ENV: "development",
        [ARTICLE_SOURCE_ENV]: "repository",
      }),
      { mode: "repository" },
    );

    for (const environment of [
      { [ARTICLE_RUNTIME_ORIGIN_ENV]: "https://control.example.test" },
      {
        [ARTICLE_SOURCE_ENV]: "repository",
        [ARTICLE_RUNTIME_WORKSPACE_ID_ENV]: workspaceId,
      },
    ]) {
      assert.throws(
        () => resolveArticleSourceConfig(environment),
        assertConfigurationError("ambiguous_repository_configuration"),
      );
    }
  });

  it("requires an explicitly configured published source in production", () => {
    for (const environment of [
      { NODE_ENV: "production" },
      {
        NODE_ENV: "production",
        [ARTICLE_SOURCE_ENV]: "repository",
      },
    ]) {
      assert.throws(
        () => resolveArticleSourceConfig(environment),
        assertConfigurationError("published_required_in_production"),
      );
    }

    assert.deepEqual(
      resolveArticleSourceConfig(
        publishedEnvironment({ NODE_ENV: "production" }),
      ),
      {
        mode: "published",
        origin: "https://control.example.test",
        workspaceId,
        timeoutMs: 3_000,
      },
    );
  });

  it("accepts the non-secret Project runtime aliases and rejects conflicts", () => {
    assert.deepEqual(
      resolveArticleSourceConfig({
        NODE_ENV: "production",
        [ARTICLE_PUBLIC_SOURCE_ENV]: "published",
        [ARTICLE_PUBLIC_RUNTIME_ORIGIN_ENV]: "https://control.example.test",
        [ARTICLE_PUBLIC_RUNTIME_WORKSPACE_ID_ENV]: workspaceId,
      }),
      {
        mode: "published",
        origin: "https://control.example.test",
        workspaceId,
        timeoutMs: 3_000,
      },
    );
    assert.throws(
      () =>
        resolveArticleSourceConfig({
          ...publishedEnvironment(),
          [ARTICLE_PUBLIC_RUNTIME_ORIGIN_ENV]: "https://other.example.test",
        }),
      assertConfigurationError("conflicting_environment_alias"),
    );
  });

  it("requires an exact and complete published configuration", () => {
    assert.deepEqual(resolveArticleSourceConfig(publishedEnvironment()), {
      mode: "published",
      origin: "https://control.example.test",
      workspaceId,
      timeoutMs: 3_000,
    });
    assert.deepEqual(
      resolveArticleSourceConfig(
        publishedEnvironment({
          [ARTICLE_RUNTIME_ORIGIN_ENV]: "http://127.0.0.1:8080",
          [ARTICLE_RUNTIME_TIMEOUT_ENV]: "7500",
        }),
      ),
      {
        mode: "published",
        origin: "http://127.0.0.1:8080",
        workspaceId,
        timeoutMs: 7_500,
      },
    );

    for (const mode of ["Published", " published", "remote", "repository "]) {
      assert.throws(
        () => resolveArticleSourceConfig({ [ARTICLE_SOURCE_ENV]: mode }),
        assertConfigurationError("invalid_mode"),
      );
    }
    for (const environment of [
      { [ARTICLE_SOURCE_ENV]: "published" },
      {
        [ARTICLE_SOURCE_ENV]: "published",
        [ARTICLE_RUNTIME_ORIGIN_ENV]: "https://control.example.test",
      },
    ]) {
      assert.throws(
        () => resolveArticleSourceConfig(environment),
        assertConfigurationError("incomplete_published_configuration"),
      );
    }
  });

  it("rejects unsafe origins, workspace drift and unbounded timeouts", () => {
    for (const origin of [
      "http://control.example.test",
      "https://user@control.example.test",
      "https://control.example.test/private",
      "https://control.example.test?internal=1",
      " https://control.example.test",
    ]) {
      assert.throws(
        () =>
          resolveArticleSourceConfig(
            publishedEnvironment({ [ARTICLE_RUNTIME_ORIGIN_ENV]: origin }),
          ),
        assertConfigurationError("invalid_published_origin"),
      );
    }

    assert.throws(
      () =>
        resolveArticleSourceConfig(
          publishedEnvironment({
            [ARTICLE_RUNTIME_WORKSPACE_ID_ENV]: "not-a-workspace",
          }),
        ),
      assertConfigurationError("invalid_published_workspace"),
    );

    for (const timeout of ["0", "249", "10001", "3000 ", "1.5"]) {
      assert.throws(
        () =>
          resolveArticleSourceConfig(
            publishedEnvironment({ [ARTICLE_RUNTIME_TIMEOUT_ENV]: timeout }),
          ),
        assertConfigurationError("invalid_published_timeout"),
      );
    }
  });

  it("selects exactly one loader and never falls back after published failure", async () => {
    const calls = [];
    const repository = async () => {
      calls.push("repository");
      return "repository-value";
    };
    const published = async (config) => {
      calls.push(`published:${config.workspaceId}`);
      return "published-value";
    };

    assert.equal(
      await loadConfiguredArticleSource({ mode: "repository" }, {
        repository,
        published,
      }),
      "repository-value",
    );
    assert.deepEqual(calls, ["repository"]);

    calls.length = 0;
    const config = resolveArticleSourceConfig(publishedEnvironment());
    assert.equal(
      await loadConfiguredArticleSource(config, { repository, published }),
      "published-value",
    );
    assert.deepEqual(calls, [`published:${workspaceId}`]);

    calls.length = 0;
    const failure = new Error("published unavailable");
    await assert.rejects(
      () =>
        loadConfiguredArticleSource(config, {
          repository,
          published: async () => {
            calls.push("published-failed");
            throw failure;
          },
        }),
      (error) => error === failure,
    );
    assert.deepEqual(calls, ["published-failed"]);
  });

  it("keeps environment reads behind the server-only module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "lib", "article-content.server.ts"),
      "utf8",
    );
    assert.match(source, /^import "server-only";/u);
    assert.match(source, /resolveArticleSourceConfig\(process\.env\)/u);
  });
});
