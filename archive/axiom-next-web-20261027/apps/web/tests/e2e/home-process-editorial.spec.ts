import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PROCESS_TITLES = [
  "Řeknete mi, co právě řešíte.",
  "Dám vše do souvislostí a ukážu vám možnosti.",
  "Rozhodnete, jak chcete pokračovat.",
] as const;

const PROCESS_SUPPORT = [
  "Stačí vlastními slovy. Bez smluv, výpisů a složité přípravy.",
  "Seřadím priority, porovnám varianty a ukážu jejich dopad na celý plán.",
  "Bez tlaku. Konečné rozhodnutí zůstává vždy na vás.",
] as const;

async function primeRejectedConsent(page: Page) {
  await page.addInitScript(() => {
    const decidedAt = Date.now();
    localStorage.setItem("cookie_consent_v1", JSON.stringify({
      choice: "rejected",
      decidedAt,
      expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
      version: "2026-05-05-ga4-v1",
    }));
  });
}

async function openStaticHomepage(
  page: Page,
  viewport: { width: number; height: number },
) {
  await primeRejectedConsent(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(viewport);
  await page.goto("/", { waitUntil: "networkidle" });
  const process = page.locator('[data-home-module="process"]');
  await expect(process.locator("[data-process-reveal]")).toHaveAttribute(
    "data-state",
    "reduced-motion",
  );
  return process;
}

test.describe("homepage process editorial chapters", () => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    test(`composes a strong three-chapter trajectory at ${viewport.width}×${viewport.height}`, async ({
      page,
    }) => {
      const process = await openStaticHomepage(page, viewport);

      await expect(process.getByRole("heading", {
        level: 2,
        name: "Jak spolupráce probíhá",
      })).toBeVisible();
      await expect(process.locator("[data-process-step] h3")).toHaveText(
        PROCESS_TITLES,
      );
      await expect(process.locator("[data-process-step-support]")).toHaveText(
        PROCESS_SUPPORT,
      );
      await expect(process.locator("[data-process-role]")).toHaveText([
        "VY",
        "JÁ",
        "VY",
      ]);
      await expect(process.locator("[data-process-rail]")).toHaveAttribute(
        "role",
        "list",
      );
      await expect(process.locator("[data-process-role-echo]")).toHaveCount(0);
      await expect(process.locator("[data-process-step-light]")).toHaveCount(0);
      await expect(process.locator("[data-process-focus]")).toHaveCount(0);
      await expect(process.locator("[data-process-role-mask]")).toHaveCount(3);
      await expect(process.locator("[data-process-role-ink]")).toHaveCount(3);
      await expect(process.locator("[data-process-meta]")).toHaveCount(3);
      await expect(process.locator("[data-process-step-role]")).toHaveCount(3);
      await expect(process.locator("[data-process-role-rule]")).toHaveCount(0);
      await expect(process.locator("[data-process-index-ink]")).toHaveCount(3);
      await expect(process.locator("[data-process-step-rule]")).toHaveCount(3);
      await expect(process.locator("[data-process-index]")).toHaveText([
        "01",
        "02",
        "03",
      ]);
      await expect(process.locator("[data-process-liquid-lines]")).toHaveCount(1);
      await expect(process.locator("[data-process-liquid-lines]")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      await expect(process.locator("[data-process-liquid-lines]")).toHaveAttribute(
        "data-state",
        "static",
      );
      await expect(process.locator("[data-process-liquid-lines-webgl]"))
        .toHaveCount(0);
      await expect(process.locator("canvas")).toHaveCount(0);

      const geometry = await process.evaluate((section) => {
        const rows = [...section.querySelectorAll<HTMLElement>(
          "[data-process-step]",
        )];
        const titles = rows.map((row) => row.querySelector<HTMLElement>("h3")!);
        const roles = rows.map((row) => row.querySelector<HTMLElement>(
          "[data-process-role]",
        )!);
        const rules = rows.map((row) => row.querySelector<HTMLElement>(
          "[data-process-step-rule]",
        )!);
        const outcome = section.querySelector<HTMLElement>(
          "[data-process-outcome]",
        )!;
        const result = section.querySelector<HTMLElement>(
          "[data-process-result]",
        )!;
        const action = section.querySelector<HTMLElement>(
          "[data-process-action-rail]",
        )!;
        const video = section.querySelector<HTMLElement>(
          "[data-process-video-rail]",
        )!;
        return {
          actionLeft: action.getBoundingClientRect().left,
          background: getComputedStyle(section).backgroundImage,
          lastRowBottom: rows.at(-1)!.getBoundingClientRect().bottom,
          outcomeTop: outcome.getBoundingClientRect().top,
          resultBottom: result.getBoundingClientRect().bottom,
          resultTop: result.getBoundingClientRect().top,
          overflow: document.documentElement.scrollWidth
            - document.documentElement.clientWidth,
          roleLefts: roles.map((role) => role.getBoundingClientRect().left),
          roleSizes: roles.map((role) => Number.parseFloat(
            getComputedStyle(role).fontSize,
          )),
          ruleLefts: rules.map((rule) => rule.getBoundingClientRect().left),
          ruleRights: rules.map((rule) => rule.getBoundingClientRect().right),
          rowHeights: rows.map((row) => row.getBoundingClientRect().height),
          rowLefts: rows.map((row) => row.getBoundingClientRect().left),
          rowRights: rows.map((row) => row.getBoundingClientRect().right),
          sectionHeight: section.getBoundingClientRect().height,
          titleLefts: titles.map((title) => title.getBoundingClientRect().left),
          titleRights: titles.map((title) => title.getBoundingClientRect().right),
          videoLeft: video.getBoundingClientRect().left,
        };
      });

      expect(geometry.sectionHeight).toBeGreaterThan(viewport.height * 1.05);
      expect(geometry.sectionHeight).toBeLessThan(viewport.height * 2.05);
      expect(geometry.rowHeights.every(
        (height) => height >= viewport.height * 0.22,
      )).toBe(true);
      expect(Math.max(...geometry.rowHeights) - Math.min(...geometry.rowHeights))
        .toBeLessThanOrEqual(1);
      expect(Math.max(...geometry.titleLefts) - Math.min(...geometry.titleLefts))
        .toBeLessThanOrEqual(1);
      expect(Math.max(...geometry.roleLefts) - Math.min(...geometry.roleLefts))
        .toBeLessThanOrEqual(1);
      expect(geometry.roleSizes.every((size) => size >= 48 && size <= 86))
        .toBe(true);
      expect(geometry.titleRights.every((right) => right <= viewport.width))
        .toBe(true);
      expect(geometry.ruleLefts.every(
        (left, index) => Math.abs(left - geometry.rowLefts[index]) <= 1,
      )).toBe(true);
      expect(geometry.ruleRights.every(
        (right, index) => Math.abs(right - geometry.rowRights[index]) <= 1,
      )).toBe(true);
      expect(Math.abs(geometry.resultTop - geometry.lastRowBottom))
        .toBeLessThanOrEqual(1);
      expect(geometry.outcomeTop).toBeGreaterThanOrEqual(geometry.resultBottom);
      expect(geometry.videoLeft).toBeGreaterThan(geometry.actionLeft);
      expect(geometry.background).not.toContain("gradient");
      expect(geometry.overflow).toBeLessThanOrEqual(1);

      await expect(process.locator("[data-process-cta]")).toContainText(
        "Získat přehled",
      );
      await expect(process.locator("[data-process-video-trigger]")).toContainText(
        "Podívat se, jak spolupráce probíhá",
      );
      await expect(process.locator("[data-process-result]")).toContainText(
        "Přehled, díky kterému víte, co dál.",
      );
      await expect(process.locator("[data-process-result]")).toContainText(
        "Budete rozumět své situaci, prioritám i možnostem — a vědět, který další krok dává smysl právě vám.",
      );
      await expect(process.locator("[data-process-rail] [data-process-result]"))
        .toHaveCount(0);
    });
  }

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ]) {
    test(`preserves hierarchy and full-width actions at ${viewport.width}×${viewport.height}`, async ({
      page,
    }) => {
      const process = await openStaticHomepage(page, viewport);

      const geometry = await process.evaluate((section) => {
        const rows = [...section.querySelectorAll<HTMLElement>(
          "[data-process-step]",
        )];
        const outcome = section.querySelector<HTMLElement>(
          "[data-process-outcome]",
        )!;
        const result = section.querySelector<HTMLElement>(
          "[data-process-result]",
        )!;
        const cta = section.querySelector<HTMLElement>("[data-process-cta]")!;
        const video = section.querySelector<HTMLElement>(
          "[data-process-video-trigger]",
        )!;
        return {
          cta: cta.getBoundingClientRect().toJSON(),
          lastRowBottom: rows.at(-1)!.getBoundingClientRect().bottom,
          outcomeTop: outcome.getBoundingClientRect().top,
          resultBottom: result.getBoundingClientRect().bottom,
          resultTop: result.getBoundingClientRect().top,
          overflow: document.documentElement.scrollWidth
            - document.documentElement.clientWidth,
          rows: rows.map((row) => {
            const role = row.querySelector<HTMLElement>(
              "[data-process-role]",
            )!;
            const rule = row.querySelector<HTMLElement>(
              "[data-process-step-rule]",
            )!;
            const title = row.querySelector<HTMLElement>("h3")!;
            return {
              height: row.getBoundingClientRect().height,
              ruleLeft: rule.getBoundingClientRect().left,
              ruleRight: rule.getBoundingClientRect().right,
              rowLeft: row.getBoundingClientRect().left,
              rowRight: row.getBoundingClientRect().right,
              roleBottom: role.getBoundingClientRect().bottom,
              roleRight: role.getBoundingClientRect().right,
              titleLeft: title.getBoundingClientRect().left,
              titleRight: title.getBoundingClientRect().right,
              titleTop: title.getBoundingClientRect().top,
            };
          }),
          section: section.getBoundingClientRect().toJSON(),
          video: video.getBoundingClientRect().toJSON(),
        };
      });

      expect(geometry.rows.every((row) => row.height >= 220)).toBe(true);
      expect(geometry.rows.every((row) => (
        Math.abs(row.ruleLeft - row.rowLeft) <= 1
        && Math.abs(row.ruleRight - row.rowRight) <= 1
      ))).toBe(true);
      if (viewport.width <= 720) {
        expect(geometry.rows.every((row) => row.roleBottom < row.titleTop))
          .toBe(true);
      } else {
        expect(geometry.rows.every((row) => row.roleRight < row.titleLeft))
          .toBe(true);
      }
      expect(geometry.rows.every((row) => (
        row.titleLeft >= geometry.section.left
        && row.titleRight <= geometry.section.right + 1
      ))).toBe(true);
      expect(Math.abs(geometry.resultTop - geometry.lastRowBottom))
        .toBeLessThanOrEqual(1);
      expect(geometry.outcomeTop).toBeGreaterThanOrEqual(geometry.resultBottom);
      expect(geometry.cta.top).toBeGreaterThan(geometry.resultBottom);
      if (viewport.width <= 720) {
        expect(geometry.video.top).toBeGreaterThan(geometry.cta.top);
      } else {
        expect(geometry.video.left).toBeGreaterThan(geometry.cta.right);
      }
      expect(geometry.overflow).toBeLessThanOrEqual(1);

      if (viewport.width <= 720) {
        expect(geometry.cta.width).toBeGreaterThanOrEqual(
          geometry.section.width - 52,
        );
        expect(geometry.video.width).toBeGreaterThanOrEqual(
          geometry.section.width - 52,
        );
      }
    });
  }

  test("keeps the process semantic and accessible in its static fallback", async ({
    page,
  }) => {
    const process = await openStaticHomepage(page, {
      width: 1440,
      height: 900,
    });
    await process.scrollIntoViewIfNeeded();

    const results = await new AxeBuilder({ page }).include("#postup").analyze();
    expect(results.violations).toEqual([]);

    await process.locator("[data-process-cta]").focus();
    await expect(process.locator("[data-process-cta]")).toBeFocused();
    await process.locator("[data-process-video-trigger]").focus();
    await expect(process.locator("[data-process-video-trigger]")).toBeFocused();
  });
});
