"use client";

import { openCookieSettings } from "@/src/app/ui/privacy/cookieSettings";
import styles from "@/app/legal.module.css";

export default function LegalCookieSettingsButton() {
  return (
    <button
      type="button"
      className={`${styles.link} ${styles.inlineAction}`}
      onClick={openCookieSettings}
    >
      Otevřít nastavení cookies
    </button>
  );
}
