import "server-only";
import { cnbRegistryUrl } from "../../app/content/multipage";

import type {
  PublicVerifiedFact,
  VerifiedFactEvidence,
} from "./types";

const verifiedFactEvidence = [
  {
    id: "experience-5-plus-years",
    kind: "experience",
    label: "Praxe ve finančním plánování",
    value: "5+ let",
    publicExplanation: "Více než pět let praxe ve finančním plánování.",
    source: "Schválení business ownera v projektovém zadání",
    sourceUrl: undefined,
    verifiedAt: "2026-07-15",
    reviewAt: "2027-01-15",
    expiresAt: undefined,
    owner: "Business owner PokornyDavid.cz",
    status: "verified",
    allowedPlacements: ["home"],
  },
  {
    id: "client-base-200-plus",
    kind: "client-base",
    label: "Klienti v dosavadní praxi",
    value: "200+ klientů",
    publicExplanation: "Více než dvě stě klientů v dosavadní praxi.",
    source: "Schválení business ownera v projektovém zadání",
    sourceUrl: undefined,
    verifiedAt: "2026-07-15",
    reviewAt: "2027-01-15",
    expiresAt: undefined,
    owner: "Business owner PokornyDavid.cz",
    status: "verified",
    allowedPlacements: ["home"],
  },
  {
    id: "role-sab-bound-representative",
    kind: "role",
    label: "Profesní role",
    value: "Vázaný zástupce společnosti SAB servis s.r.o.",
    publicExplanation:
      "Veřejný záznam uvádí profesní roli a podrobnosti k příslušnému oprávnění.",
    source: "JERRS · registr České národní banky",
    sourceUrl: cnbRegistryUrl,
    verifiedAt: "2026-05-06",
    reviewAt: "2026-11-06",
    expiresAt: "2026-11-06",
    owner: "Vlastník existujícího právního obsahu webu",
    status: "verified",
    allowedPlacements: ["home", "profile", "footer"],
  },
] as const satisfies readonly VerifiedFactEvidence[];

const endOfDayUtc = (date: string) => new Date(`${date}T23:59:59.999Z`).getTime();

export const getVerifiedFactEvidence = () => verifiedFactEvidence;

export const getPublicVerifiedFact = (
  id: string,
  now = new Date(),
): PublicVerifiedFact | null => {
  const fact = verifiedFactEvidence.find((candidate) => candidate.id === id);
  if (!fact || fact.status !== "verified") return null;
  if (!fact.allowedPlacements.includes("home")) return null;
  if (endOfDayUtc(fact.reviewAt) < now.getTime()) return null;
  if (fact.expiresAt && endOfDayUtc(fact.expiresAt) < now.getTime()) return null;

  return {
    id: fact.id,
    label: fact.label,
    value: fact.value,
    publicExplanation: fact.publicExplanation,
    publicSourceLabel: fact.source,
    publicSourceUrl: fact.sourceUrl,
    publicVerifiedAt: fact.verifiedAt,
  };
};

export const getHomepagePublicFacts = (
  ids: readonly string[],
  now = new Date(),
) => ids
  .map((id) => getPublicVerifiedFact(id, now))
  .filter((fact): fact is PublicVerifiedFact => fact !== null);
