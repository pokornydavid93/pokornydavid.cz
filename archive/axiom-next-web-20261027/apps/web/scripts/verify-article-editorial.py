from pathlib import Path
from playwright.sync_api import sync_playwright

WEB_URL = "http://127.0.0.1:3000"
ADMIN_URL = "http://127.0.0.1:3001"
ARTIFACTS = Path("apps/web/artifacts/article-editorial-separation")

ARTICLE_SLUGS = [
    "mate-financni-produkty-ale-mate-skutecne-financni-plan",
    "v-jakem-poradi-resit-osobni-finance",
    "kolik-ma-mit-domacnost-v-rezerve",
    "banka-vam-pujci-vic-nez-si-muzete-dovolit",
    "urokova-sazba-neni-cena-hypoteky",
    "penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku",
    "cestovko-zdarma-od-karty-vas-nemusi-zachranit",
    "planujete-jednou-deti-pojistit-se-na-to-da-jen-dokud-je-to-jednou",
]

FORBIDDEN_PUBLIC = [
    "sourceNote",
    "needsVerification",
    "vyžaduje ověření",
    "před publikací",
    "veřejný render",
    "interní ověřovací workflow",
]


def wait_for_page(page, selector):
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(selector, state="visible")


def assert_no_overflow(page):
    overflow = page.evaluate(
        "Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)"
        " - document.documentElement.clientWidth"
    )
    assert overflow <= 1, f"Horizontal overflow: {overflow}px at {page.url}"


def mock_admin_session(page):
    page.route(
        "http://localhost:8082/me",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"email":"editorial@axiom.test","first_name":"Editorial","last_name":"Reviewer","role":"platform_admin","capabilities":{},"platform_workspaces":[]}',
        ),
    )


with sync_playwright() as playwright:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    browser = playwright.chromium.launch(headless=True)
    console_errors = []

    public_page = browser.new_page(viewport={"width": 1440, "height": 1000})
    public_page.on(
        "console",
        lambda message: console_errors.append(f"public: {message.text}")
        if message.type == "error"
        else None,
    )

    for slug in ARTICLE_SLUGS:
        public_page.goto(f"{WEB_URL}/clanky/{slug}/", wait_until="domcontentloaded")
        wait_for_page(public_page, "[data-semantic-article]")
        public_html = public_page.locator("main").inner_html()
        for phrase in FORBIDDEN_PUBLIC:
            assert phrase.lower() not in public_html.lower(), f"{slug}: leaked {phrase}"
        json_ld = "\n".join(
            public_page.locator('script[type="application/ld+json"]').all_text_contents()
        )
        for key in ["verificationItems", "sourceBasis", "productionNotes"]:
            assert key not in json_ld, f"{slug}: JSON-LD leaked {key}"
        assert_no_overflow(public_page)

    for width, height, label in [
        (390, 844, "mobile"),
        (768, 1024, "tablet"),
        (1440, 1000, "desktop"),
        (1920, 1080, "wide"),
    ]:
        public_page.set_viewport_size({"width": width, "height": height})
        public_page.goto(
            f"{WEB_URL}/clanky/{ARTICLE_SLUGS[6]}/", wait_until="domcontentloaded"
        )
        wait_for_page(public_page, "[data-semantic-article]")
        assert_no_overflow(public_page)
        public_page.screenshot(
            path=str(ARTIFACTS / f"public-{label}.png"), full_page=False
        )

    admin_context = browser.new_context(viewport={"width": 1440, "height": 1000})
    admin_context.add_cookies(
        [{"name": "adm_sess", "value": "editorial-test", "url": ADMIN_URL}]
    )
    admin_page = admin_context.new_page()
    mock_admin_session(admin_page)
    admin_page.on(
        "console",
        lambda message: console_errors.append(f"admin: {message.text}")
        if message.type == "error"
        else None,
    )
    admin_page.goto(f"{ADMIN_URL}/dashboard/articles", wait_until="domcontentloaded")
    wait_for_page(admin_page, "text=Editorial release queue")
    assert admin_page.locator('a[href^="/dashboard/articles/"]').count() == 8
    assert_no_overflow(admin_page)
    admin_page.screenshot(
        path=str(ARTIFACTS / "dashboard-list-desktop.png"), full_page=True
    )

    detail_slug = ARTICLE_SLUGS[6]
    admin_page.goto(
        f"{ADMIN_URL}/dashboard/articles/{detail_slug}", wait_until="domcontentloaded"
    )
    wait_for_page(admin_page, "text=Draft → Review → Ready → Published")
    assert admin_page.locator("details").count() == 8
    assert admin_page.get_by_text("8 unresolved · 0 resolved", exact=True).count() == 1
    admin_page.get_by_role("button", name="Zobrazit editorial kontroly").click()
    admin_page.wait_for_selector("text=Editorial overlay", state="visible")
    admin_page.screenshot(
        path=str(ARTIFACTS / "dashboard-detail-overlay-desktop.png"), full_page=True
    )
    admin_page.get_by_role("button", name="PUBLISH — ověřit serverový gate").click()
    admin_page.wait_for_selector("text=Publikace byla serverem odmítnuta.")
    assert_no_overflow(admin_page)

    mobile_context = browser.new_context(viewport={"width": 390, "height": 844})
    mobile_context.add_cookies(
        [{"name": "adm_sess", "value": "editorial-test", "url": ADMIN_URL}]
    )
    mobile_page = mobile_context.new_page()
    mock_admin_session(mobile_page)
    mobile_page.goto(
        f"{ADMIN_URL}/dashboard/articles/{detail_slug}", wait_until="domcontentloaded"
    )
    wait_for_page(mobile_page, "text=Draft → Review → Ready → Published")
    assert_no_overflow(mobile_page)
    mobile_page.screenshot(
        path=str(ARTIFACTS / "dashboard-detail-mobile.png"), full_page=False
    )

    mobile_context.close()
    admin_context.close()
    public_page.close()
    browser.close()

    assert not console_errors, "Console errors:\n" + "\n".join(console_errors)
    print(
        {
            "public_articles": len(ARTICLE_SLUGS),
            "public_viewports": 4,
            "dashboard_verification_items": 8,
            "server_publish_gate": "rejected pending blocking checks",
            "console_errors": len(console_errors),
        }
    )
