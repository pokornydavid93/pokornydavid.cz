import {
  leadIntentSummary,
  leadSourceContextLabels,
  leadTopicLabels,
  preferredCallTimeLabels,
} from "./lead-contract";
import type { NormalizedOverviewRequest } from "./overview-request";

const formatPhoneForReading = (phone: string) => {
  const hasCzechPrefix = phone.startsWith("+420") && phone.length === 13;
  const prefix = hasCzechPrefix ? "+420 " : phone.startsWith("+") ? "+" : "";
  const digits = hasCzechPrefix
    ? phone.slice(4)
    : phone.replace(/^\+/u, "");
  const grouped = digits.replace(/(\d{3})(?=\d)/gu, "$1 ").trim();
  return `${prefix}${grouped}`;
};

export function formatOverviewLeadNotification(
  request: NormalizedOverviewRequest,
) {
  const lines = [
    "Nová žádost o zavolání",
    "",
    "Oblast:",
    leadIntentSummary[request.intent],
  ];

  if (request.topic) {
    lines.push("", "Konkrétní téma:", leadTopicLabels[request.topic]);
  }
  if (request.situationNote) {
    lines.push("", "Vlastní popis:", request.situationNote);
  }

  lines.push("", "Telefon:", formatPhoneForReading(request.phone));
  lines.push("", "E-mail:", request.email);

  if (request.firstName) {
    lines.push("", "Jméno:", request.firstName);
  }
  if (request.preferredCallTime) {
    lines.push(
      "",
      "Preferovaný čas:",
      preferredCallTimeLabels[request.preferredCallTime],
    );
  }

  const sourceParts = [
    request.source.context
      ? leadSourceContextLabels[request.source.context]
      : leadSourceContextLabels.direct,
    request.source.cta,
  ].filter(Boolean);
  lines.push("", "Zdroj:", sourceParts.join(" / "));

  return {
    subject: "Nová žádost o zavolání",
    text: lines.join("\n"),
  };
}
