import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { FINANCIAL_CONTENT_DISCLAIMER } from "../../app/content/footer";

const CONSENT_STORAGE_KEY = "cookie_consent_v1";
const CONSENT_VERSION = "2026-05-05-ga4-v1";

async function seedCookieConsent(page: Page) {
  await page.addInitScript(
    ({ key, version }) => {
      const now = Date.now();

      window.localStorage.setItem(
        key,
        JSON.stringify({
          choice: "accepted",
          decidedAt: now,
          expiresAt: now + 365 * 24 * 60 * 60 * 1000,
          version,
        }),
      );
    },
    { key: CONSENT_STORAGE_KEY, version: CONSENT_VERSION },
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Math.max(
            document.documentElement.scrollWidth,
            document.body.scrollWidth,
          ) - document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
}

test.describe("global site footer", () => {
  test.beforeEach(async ({ page }) => {
    await seedCookieConsent(page);
  });

  test("closes public routes with one shared brand, contact, navigation and legal structure", async ({
    page,
  }) => {
    for (const path of [
      "/",
      "/sluzby/",
      "/jak-pracuji/",
      "/reference/",
      "/kdo-jsem/",
      "/clanky/",
    ]) {
      await page.goto(path);

      const footer = page.locator('footer[data-component="site-footer"]');
      await expect(footer).toHaveCount(1);
      await expect(
        footer.getByRole("link", {
          name: "David Pokorný – úvodní stránka",
        }),
      ).toHaveAttribute("href", "/");
      await expect(footer).toContainText(
        "Pomohu vám vidět finance v souvislostech a rozhodovat se srozumitelně.",
      );
      await expect(footer.locator('a[href="tel:+420731830897"]')).toHaveCount(1);
      await expect(
        footer.getByRole("link", { name: "Zavolat Davidovi" }),
      ).toHaveCount(0);
      await expect(
        footer.locator('a[href="mailto:info@pokornydavid.cz"]'),
      ).toHaveAttribute("href", "mailto:info@pokornydavid.cz");
      await expect(
        footer.getByRole("navigation", { name: "Navigace v patičce" }),
      ).toHaveCount(1);
      await expect(footer.getByText(FINANCIAL_CONTENT_DISCLAIMER)).toBeVisible();
      await expect(
        footer.getByRole("button", { name: "Nastavení cookies" }),
      ).toBeVisible();
    }
  });

  test("uses concrete verification destinations and opens the real cookie settings panel", async ({
    page,
  }) => {
    await page.goto("/jak-pracuji/", { waitUntil: "networkidle" });
    const consentBanner = page.getByRole("region", {
      name: "Nastavení cookies",
    });
    if (await consentBanner.isVisible()) {
      await consentBanner.getByRole("button", {
        exact: true,
        name: "Jasně, souhlasím",
      }).click();
      await expect(consentBanner).toBeHidden();
    }
    const footer = page.locator('footer[data-component="site-footer"]');

    const cnbLink = footer.getByRole("link", { name: "Registrace ČNB" });
    await expect(cnbLink).toHaveAttribute(
      "href",
      "https://jerrs.cnb.cz/apljerrsdad/JERRS.WEB10.VIZITKA?p_lang=cz&p_SEQ_ID=13296729&p_VER_ID=1004&p_DATUM=06.10.2026&p_ROL_KOD=",
    );
    await expect(cnbLink).toHaveAttribute("target", "_blank");
    await expect(cnbLink).toHaveAttribute("rel", "noopener noreferrer");
    await expect(
      footer.getByRole("link", { name: "Odborná osvědčení" }),
    ).toHaveAttribute("href", "/osvedceni-a-certifikace/");
    await expect(
      footer.getByRole("link", { name: "Refixace hypotéky", exact: true }),
    ).toHaveCount(0);
    await expect(
      footer.getByRole("link", { name: "Získat přehled" }).first(),
    ).toHaveAttribute(
      "href",
      /\/ziskat-prehled\/\?source=footer&cta=footer-primary$/,
    );

    await footer.getByRole("button", { name: "Nastavení cookies" }).click();
    const settings = page.getByRole("region", { name: "Soukromí a cookies", exact: true });
    await expect(settings).toBeVisible();
    if (await settings.getByText("Volitelné měření je vypnuté.", { exact: true }).count()) {
      await expect(settings.getByRole("switch")).toHaveCount(0);
    } else {
      await expect(
        settings.getByRole("switch", { name: "Vypnout analytiku" }),
      ).toHaveAttribute("aria-checked", "true");
    }
  });

  test("keeps the homepage footer quiet, compact and clearly separated from the final CTA", async ({
    page,
  }) => {
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "networkidle" });

      const footer = page.locator('footer[data-component="site-footer"]');
      const statement = footer.locator("[data-footer-statement]");
      const contactAction = footer.locator("[data-footer-primary-action]");

      await expect(footer.locator("[data-footer-intro]")).toHaveCount(1);
      await expect(footer.locator("[data-footer-contact]")).toHaveCount(1);
      await expect(footer.locator("[data-footer-navigation]")).toHaveCount(1);
      await expect(footer.locator("[data-footer-group]")).toHaveCount(3);
      await expect(footer.locator("[data-footer-disclaimer]")).toHaveCount(1);
      await expect(footer.locator("[data-footer-meta]")).toHaveCount(1);
      await expect(statement).toBeVisible();
      await expect(contactAction).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const geometry = await footer.evaluate((element) => {
        const footerRect = element.getBoundingClientRect();
        const actionRect = element
          .querySelector<HTMLElement>("[data-footer-primary-action]")
          ?.getBoundingClientRect();
        const layoutElement = element.querySelector<HTMLElement>(
          "[data-footer-layout]",
        );
        const introElement = element.querySelector<HTMLElement>(
          "[data-footer-intro]",
        );
        const statementElement = element.querySelector<HTMLElement>(
          "[data-footer-statement]",
        );
        const identityElement = element.querySelector<HTMLElement>(
          "[data-footer-identity]",
        );
        const contactElement = element.querySelector<HTMLElement>(
          "[data-footer-contact]",
        );
        const contactRows = Array.from(element.querySelectorAll<HTMLElement>(
          "[data-footer-contact-list] > div",
        ));
        const secondContactRow = contactRows[1];

        return {
          actionHeight: actionRect?.height ?? 0,
          actionTextDecoration: actionRect
            ? getComputedStyle(
              element.querySelector<HTMLElement>("[data-footer-primary-action]")!,
            ).textDecorationLine
            : "",
          contactBorderBlockEnd: contactElement
            ? Number.parseFloat(getComputedStyle(contactElement).borderBlockEndWidth)
            : -1,
          contactBorderBlockStart: contactElement
            ? Number.parseFloat(getComputedStyle(contactElement).borderBlockStartWidth)
            : -1,
          contactLeft: contactElement?.getBoundingClientRect().left ?? 0,
          contactTop: contactElement?.getBoundingClientRect().top ?? 0,
          contactSeparatorWidth: secondContactRow
            ? Number.parseFloat(getComputedStyle(secondContactRow).borderInlineStartWidth)
            : -1,
          footerRight: footerRect.right,
          introPaddingEnd: introElement
            ? Number.parseFloat(getComputedStyle(introElement).paddingBlockEnd)
            : 0,
          identityBottom: identityElement?.getBoundingClientRect().bottom ?? 0,
          identityRight: identityElement?.getBoundingClientRect().right ?? 0,
          layoutPaddingStart: layoutElement
            ? Number.parseFloat(getComputedStyle(layoutElement).paddingBlockStart)
            : 0,
          statementFontSize: statementElement
            ? Number.parseFloat(getComputedStyle(statementElement).fontSize)
            : 0,
          contactRightEdges: contactRows.map(
            (row) => row.getBoundingClientRect().right,
          ),
        };
      });

      expect(geometry.actionHeight).toBeGreaterThanOrEqual(44);
      expect(geometry.actionTextDecoration).toBe("none");
      expect(geometry.contactBorderBlockStart).toBe(0);
      expect(geometry.contactBorderBlockEnd).toBe(0);
      expect(geometry.contactSeparatorWidth).toBe(0);
      expect(geometry.layoutPaddingStart).toBeGreaterThanOrEqual(40);
      expect(geometry.introPaddingEnd).toBeGreaterThanOrEqual(40);
      expect(geometry.statementFontSize).toBeGreaterThanOrEqual(16);
      expect(geometry.statementFontSize).toBeLessThanOrEqual(20);
      if (viewport.width > 960) {
        expect(geometry.contactLeft - geometry.identityRight)
          .toBeGreaterThanOrEqual(64);
      } else {
        expect(geometry.contactTop - geometry.identityBottom)
          .toBeGreaterThanOrEqual(40);
      }
      expect(Math.max(...geometry.contactRightEdges))
        .toBeLessThanOrEqual(geometry.footerRight + 1);

      if (viewport.width === 1440) {
        const navigationLink = footer.getByRole("link", {
          name: "Registrace ČNB",
        });
        const accentColor = await footer
          .locator("[data-footer-contact] > h2")
          .evaluate((element) => getComputedStyle(element).color);

        await navigationLink.hover();
        await page.waitForTimeout(220);

        const hoverStyles = await navigationLink.evaluate((element) => {
          const styles = getComputedStyle(element);

          return {
            color: styles.color,
            textDecorationColor: styles.textDecorationColor,
            textDecorationLine: styles.textDecorationLine,
          };
        });

        expect(hoverStyles.color).toBe(accentColor);
        expect(hoverStyles.textDecorationColor).toBe(accentColor);
        expect(hoverStyles.textDecorationLine).toContain("underline");
      }
    }
  });

  test("keeps anchors clear of the sticky header and remains accessible at desktop, tablet and mobile widths", async ({
    page,
  }) => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/kdo-jsem/#registrace-cnb");

      const footer = page.locator('footer[data-component="site-footer"]');
      const target = page.locator("#registrace-cnb");
      await expect(target).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const targetTop = await target.evaluate(
        (element) => element.getBoundingClientRect().top,
      );
      expect(targetTop).toBeGreaterThanOrEqual(70);

      const navigation = footer.getByRole("navigation", { name: "Navigace v patičce" });
      await navigation.scrollIntoViewIfNeeded();
      const navLinks = navigation.getByRole("link");
      for (const link of await navLinks.all()) {
        // Offscreen navigation starts at scale(.985); measure the interactive
        // target only after its existing entrance animation has settled.
        await expect.poll(async () => (await link.boundingBox())?.height ?? 0)
          .toBeGreaterThanOrEqual(40);
      }
    }

    const footer = page.locator('footer[data-component="site-footer"]');
    const focusTarget = footer.getByRole("link", { name: "Služby" });
    await focusTarget.focus();
    await expect(focusTarget).toHaveCSS("outline-style", "solid");

    const accessibility = await new AxeBuilder({ page })
      .include('footer[data-component="site-footer"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });
});
