"use client";

import { openCookieSettings } from "@/src/app/ui/privacy/cookieSettings";
import s from "./publicSiteChrome.module.css";

export default function FooterCookieSettingsButton() {
  return (
    <button
      className={s.footerPreferencesButton}
      onClick={openCookieSettings}
      type="button"
    >
      Nastavení cookies
    </button>
  );
}
