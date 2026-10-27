import fs from "node:fs";
import path from "node:path";
import { renderPublicArticleMarkdown } from "../../../packages/article-editorial/src/index.mjs";

const contentDirectory = path.join(process.cwd(), "content", "blog");
const dashboardRegistryPath = path.resolve(
  process.cwd(),
  "../../packages/article-editorial/generated/dashboard-articles.json",
);

function findArticleFiles(directory) {
  const files = [];
  const pending = [directory];

  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(target);
      else if (entry.name.endsWith(".article.json")) files.push(target);
    }
  }

  return files.sort((left, right) =>
    path.basename(left).localeCompare(path.basename(right), "cs-CZ"),
  );
}

const dashboardArticles = [];

for (const articlePath of findArticleFiles(contentDirectory)) {
  const article = JSON.parse(fs.readFileSync(articlePath, "utf8"));
  const markdown = renderPublicArticleMarkdown(article);
  const previewPath = articlePath.replace(/\.article\.json$/, ".preview.md");
  fs.writeFileSync(previewPath, markdown);

  dashboardArticles.push({
    schemaVersion: article.schemaVersion,
    publication: article.publication,
    meta: {
      slug: article.meta.slug,
      topic: article.meta.topic,
      category: article.meta.category,
      estimatedReadTime: article.meta.estimatedReadTime,
    },
    hero: {
      title: article.hero.title,
      subtitle: article.hero.subtitle,
    },
    sections: article.sections.map((section) => ({
      id: section.id,
      title: section.title,
    })),
    editorial: article.editorial,
  });
}

fs.mkdirSync(path.dirname(dashboardRegistryPath), { recursive: true });
fs.writeFileSync(
  dashboardRegistryPath,
  `${JSON.stringify(dashboardArticles, null, 2)}\n`,
);
