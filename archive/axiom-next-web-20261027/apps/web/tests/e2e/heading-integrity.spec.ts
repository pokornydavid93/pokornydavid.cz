import { expect, test, type Page } from "@playwright/test";

const publicRoutes = [
  "/",
  "/jak-pracuji/",
  "/kdo-jsem/",
  "/osvedceni-a-certifikace/",
  "/sluzby/",
  "/reference/",
  "/refixace-hypoteky/",
  "/clanky/",
  "/clanky/konec-fixace-hypoteky/",
  "/clanky/zdrazilo-vam-pojisteni/",
  "/clanky/mate-pojisteni-prijmu-nebo-jen-pocit/",
  "/clanky/chcete-investovat-zacnete-planem/",
  "/ziskat-prehled/",
  "/ziskat-prehled/dekujeme/",
  "/pravni-informace/",
  "/zasady-zpracovani-osobnich-udaju/",
  "/cookies-a-mereni/",
] as const;

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "notebook", width: 1366, height: 768 },
  { name: "wide", width: 1920, height: 1080 },
] as const;

type HeadingIssue = {
  route: string;
  viewport: string;
  heading: string;
  selector: string;
  problem: string;
};

async function primeStaticAuditState(page: Page) {
  await page.addInitScript(() => {
    const decidedAt = Date.now();
    localStorage.setItem("cookie_consent_v1", JSON.stringify({
      choice: "rejected",
      decidedAt,
      expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
      version: "2026-05-05-ga4-v1",
    }));
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

test("public headings keep Czech glyphs and adjacent lines clear", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await primeStaticAuditState(page);

  const issues: HeadingIssue[] = [];
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  const selectedViewports = process.env.HEADING_AUDIT_VIEWPORT
    ? viewports.filter(({ name }) => name === process.env.HEADING_AUDIT_VIEWPORT)
    : viewports;

  for (const viewport of selectedViewports) {
    await page.setViewportSize(viewport);

    for (const route of publicRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.keyboard.press("Escape");
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      const routeIssues = await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll(
        (headings, context) => {
          const { route, viewportName } = context;
          const output: HeadingIssue[] = [];

          const selectorFor = (element: Element) => {
            if (element.id) return `#${CSS.escape(element.id)}`;

            for (const attribute of element.getAttributeNames()) {
              if (attribute.startsWith("data-") && element.getAttribute(attribute) === "") {
                return `${element.localName}[${attribute}]`;
              }
            }

            const className = Array.from(element.classList)[0];
            return className
              ? `${element.localName}.${CSS.escape(className)}`
              : element.localName;
          };

          const getLineTops = (heading: Element) => {
            const tops: number[] = [];
            const walker = document.createTreeWalker(
              heading,
              NodeFilter.SHOW_TEXT,
            );
            let node = walker.nextNode();

            while (node) {
              const value = node.textContent ?? "";
              for (let index = 0; index < value.length; index += 1) {
                if (/\s/u.test(value[index] ?? "")) continue;
                const range = document.createRange();
                range.setStart(node, index);
                range.setEnd(node, index + 1);
                const rect = range.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) tops.push(rect.top);
              }
              node = walker.nextNode();
            }

            return tops
              .sort((a, b) => a - b)
              .filter((top, index, values) => (
                index === 0 || Math.abs(top - values[index - 1]!) > 2
              ));
          };

          for (const heading of headings) {
            const element = heading as HTMLElement;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            if (
              rect.width <= 2
              || rect.height <= 2
              || style.display === "none"
              || style.visibility === "hidden"
            ) continue;

            const text = (element.innerText || element.textContent || "")
              .replace(/\s+/gu, " ")
              .trim();
            if (!text) continue;

            const fontSize = Number.parseFloat(style.fontSize);
            const lineHeight = Number.parseFloat(style.lineHeight);
            const lineTops = getLineTops(element);
            const selector = selectorFor(element);

            if (
              lineTops.length > 1
              && fontSize >= 30
              && Number.isFinite(lineHeight)
              && lineHeight / fontSize < 0.975
            ) {
              output.push({
                route,
                viewport: viewportName,
                heading: text,
                selector,
                problem: `multiline display line-height ${(lineHeight / fontSize).toFixed(3)} is below the safe 0.975 floor`,
              });
            }

            const clippingBoxes = [element, ...Array.from(element.querySelectorAll("*"))]
              .filter((candidate): candidate is HTMLElement => candidate instanceof HTMLElement)
              .filter((candidate) => {
                const candidateStyle = getComputedStyle(candidate);
                return [candidateStyle.overflow, candidateStyle.overflowY]
                  .some((value) => value === "hidden" || value === "clip");
              });

            for (const clippingBox of clippingBoxes) {
              const clippingStyle = getComputedStyle(clippingBox);
              const lineClamp = Number.parseInt(
                clippingStyle.getPropertyValue("-webkit-line-clamp"),
                10,
              );
              const clipMargin = Number.parseFloat(
                clippingStyle.getPropertyValue("overflow-clip-margin"),
              );
              if (lineClamp > 0 || clipMargin > 0) continue;
              if (clippingBox.scrollHeight <= clippingBox.clientHeight + 1) continue;
              output.push({
                route,
                viewport: viewportName,
                heading: text,
                selector,
                problem: `text mask clips ${clippingBox.scrollHeight - clippingBox.clientHeight}px vertically`,
              });
              break;
            }
          }

          return output;
        },
        { route, viewportName: viewport.name },
      );

      issues.push(...routeIssues);
    }
  }

  expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
  expect(runtimeErrors, JSON.stringify(runtimeErrors, null, 2)).toEqual([]);
});
