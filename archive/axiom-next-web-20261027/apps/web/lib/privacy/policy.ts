/** The website's own purposes are distinct from SAB's regulated client agenda. */
export const WEB_PRIVACY_NOTICE_VERSION = "privacy-notice-2026-10-09";
export const WEB_PRIVACY_EFFECTIVE_DATE = "2026-10-09";
export const WEB_PRIVACY_POLICY_PATH = "/zasady-zpracovani-osobnich-udaju";
export const WEB_COOKIE_POLICY_PATH = "/cookies-a-mereni";
// Enable optional measurement only after its actual provider settings, retention
// and automatic event collection have been checked against the public notice.
export const WEB_ANALYTICS_PRIVACY_VERIFIED = true;
export const WEB_TECHNICAL_LOG_RETENTION_DAYS = 7;

export const WEB_PRIVACY_CONTROLLER = Object.freeze({
  name: "David Pokorný",
  registrationId: "IČO 09016236",
  address: "Za Zbrojnicí 446, 784 01 Červenka",
  email: "info@pokornydavid.cz",
});

export const WEB_FORM_PROCESSING_PURPOSE =
  "Vyřízení vaší žádosti, domluva kontaktu a navazující komunikace k tématu, které jste si vybrali.";

export const WEB_ENQUIRY_RIGHTS_NOTICE =
  "Údaje používám k vyřízení vaší žádosti na základě oprávněného zájmu. Správcem je David Pokorný, IČO 09016236, Za Zbrojnicí 446, 784 01 Červenka. Proti tomuto zpracování můžete z důvodů vaší konkrétní situace vznést námitku na info@pokornydavid.cz. Podrobnosti a další práva: https://pokornydavid.cz/zasady-zpracovani-osobnich-udaju/. Odesláním žádosti se nepřihlašujete k newsletteru.";

export const SAB_PRIVACY_INFORMATION_URL = "https://www.sabservis.cz/gdpr";

export const NEWSLETTER_CONSENT_TEXT =
  "Souhlasím, aby mi David Pokorný posílal e-mailem finanční tipy a nabídky svých služeb. Souhlas mohu kdykoli odvolat odkazem v každém e-mailu.";

export function formatPrivacyDate(date: string): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "long",
    timeZone: "Europe/Prague",
  }).format(new Date(`${date}T12:00:00Z`));
}
