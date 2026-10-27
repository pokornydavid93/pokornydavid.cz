import fs from "node:fs";
import path from "node:path";
import { articleDocumentToBlogPost } from "./article-document-adapter";
import {
  getPublicArticle,
  parseArticleDocumentV2,
  type ArticleDocumentV2,
  type PublicArticleDocumentV2,
} from "./article-document-v2";
import type { BlogPost } from "./blog";

const ARTICLE_FILE_SUFFIX = ".article.json";

function findArticleFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];

  const files: string[] = [];
  const pending = [directory];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;

    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        pending.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(ARTICLE_FILE_SUFFIX)) {
        files.push(fullPath);
      }
    }
  }

  return files.toSorted((left, right) => left.localeCompare(right, "cs-CZ"));
}

export function loadArticleDocuments(directory: string): ArticleDocumentV2[] {
  const documents = findArticleFiles(directory).map((filePath) => {
    const relativePath = path.relative(directory, filePath);
    let source: unknown;

    try {
      source = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Unable to read article JSON ${relativePath}: ${message}`);
    }

    return parseArticleDocumentV2(source, relativePath);
  });

  const slugs = new Set<string>();

  for (const document of documents) {
    if (slugs.has(document.meta.slug)) {
      throw new Error(`Duplicate article slug: ${document.meta.slug}`);
    }
    slugs.add(document.meta.slug);
  }

  return documents;
}

export function loadPublicArticleDocuments(
  directory: string,
): PublicArticleDocumentV2[] {
  return loadArticleDocuments(directory).map(getPublicArticle);
}

export function loadArticleDocumentPosts(directory: string): BlogPost[] {
  const documents = loadPublicArticleDocuments(directory);
  return documents.map((document) =>
    articleDocumentToBlogPost(document, documents),
  );
}
