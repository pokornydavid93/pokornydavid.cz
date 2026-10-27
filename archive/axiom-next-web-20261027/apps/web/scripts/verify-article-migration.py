import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright


BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3107"
ARTICLES = {
    "mate-financni-produkty-ale-mate-skutecne-financni-plan": 9,
    "v-jakem-poradi-resit-osobni-finance": 9,
    "kolik-ma-mit-domacnost-v-rezerve": 10,
    "banka-vam-pujci-vic-nez-si-muzete-dovolit": 9,
    "urokova-sazba-neni-cena-hypoteky": 10,
    "penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku": 10,
    "cestovko-zdarma-od-karty-vas-nemusi-zachranit": 10,
    "planujete-jednou-deti-pojistit-se-na-to-da-jen-dokud-je-to-jednou": 10,
}


def assert_no_overflow(page):
    overflow = page.evaluate(
        """
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
          - document.documentElement.clientWidth
        """
    )
    assert overflow <= 1, f"Horizontal overflow: {overflow}px"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    console_errors = []
    page_errors = []
    page.on(
        "console",
        lambda message: console_errors.append(message.text)
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: page_errors.append(str(error)))

    for slug, expected_sections in ARTICLES.items():
        response = page.goto(
            f"{BASE_URL}/clanky/{slug}/", wait_until="networkidle"
        )
        assert response and response.ok, f"Failed article route: {slug}"
        assert page.locator('[data-article-renderer="canonical"]').count() == 1
        assert page.locator("[data-semantic-article]").count() == 1
        assert (
            page.locator("[data-article-section]").count() == expected_sections
        ), slug
        assert page.locator("[data-article-hero-visual-fallback]").is_visible()
        assert page.locator("main h1").count() == 1
        assert page.locator("main > header time").count() == 0
        assert_no_overflow(page)

    representative = "mate-financni-produkty-ale-mate-skutecne-financni-plan"
    page.goto(
        f"{BASE_URL}/clanky/{representative}/", wait_until="networkidle"
    )
    for block_type in (
        "lead",
        "explanation",
        "comparison",
        "decision",
        "caseStudy",
        "financialDelta",
        "sourceNote",
        "nextAction",
    ):
        assert page.locator(
            f'[data-article-semantic-block="{block_type}"]'
        ).count(), block_type

    generic_cta = page.locator(
        '[data-article-semantic-block="nextAction"] a'
    ).last.get_attribute("href")
    generic_query = parse_qs(urlparse(generic_cta).query)
    assert "intent" not in generic_query
    assert "topic" not in generic_query

    page.goto(
        f"{BASE_URL}/clanky/urokova-sazba-neni-cena-hypoteky/",
        wait_until="networkidle",
    )
    mortgage_cta = page.locator(
        '[data-article-semantic-block="nextAction"] a'
    ).last.get_attribute("href")
    mortgage_query = parse_qs(urlparse(mortgage_cta).query)
    assert mortgage_query.get("intent") == ["housing"]
    assert mortgage_query.get("topic") == ["mortgage-refixation"]

    Path("/tmp/article-migration").mkdir(exist_ok=True)
    page.screenshot(path="/tmp/article-migration/desktop.png", full_page=False)

    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(
        f"{BASE_URL}/clanky/{representative}/", wait_until="domcontentloaded"
    )
    page.locator("[data-article-hero-visual-fallback]").wait_for()
    assert page.locator("[data-article-hero-visual-fallback]").is_visible()
    assert_no_overflow(page)
    page.screenshot(path="/tmp/article-migration/mobile.png", full_page=False)

    assert not page_errors, page_errors
    assert not console_errors, console_errors
    browser.close()

print("Article migration browser verification passed for 8 routes.")
