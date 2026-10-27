import { WEB_PRIVACY_NOTICE_VERSION } from "../../lib/privacy/policy";

export const formPrivacyNotice = {
  version: WEB_PRIVACY_NOTICE_VERSION,
  detailHref: "/zasady-zpracovani-osobnich-udaju/",
  leadText:
    "Údaje z formuláře použiji k odpovědi na vaši poptávku, domluvě dalšího kroku a přípravě služby, o kterou žádáte. Odesláním vás nepřihlašuji k newsletteru.",
  screeningText:
    "Odpovědi a orientační výsledek této kontroly zůstávají ve vašem prohlížeči. Odesíláte pouze kontaktní údaje a téma článku, abych se vám mohl ozvat. Odesláním vás nepřihlašuji k newsletteru.",
  funnelScreeningText:
    "Odpovědi a orientační výsledek této kontroly zůstávají ve vašem prohlížeči. Odesíláte pouze kontakt a případně čas, kdy se vám hodí spojení, abychom domluvili další krok k hypotéce a ochraně příjmu. Odesláním vás nepřihlašuji k newsletteru.",
} as const;
