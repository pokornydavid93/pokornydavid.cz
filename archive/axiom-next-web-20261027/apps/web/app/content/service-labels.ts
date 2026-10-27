export type ServiceKey =
  | "comprehensivePlan"
  | "mortgage"
  | "investments"
  | "incomeProtection"
  | "propertyProtection";

export const SERVICE_CONFIG = {
  comprehensivePlan: {
    label: "Finanční plán",
    shortLabel: "Finanční plán",
  },
  mortgage: {
    label: "Hypotéka a financování",
    shortLabel: "Hypotéka",
  },
  investments: {
    label: "Investice a spoření",
    shortLabel: "Investice",
  },
  incomeProtection: {
    label: "Zajištění příjmu",
    shortLabel: "Zajištění příjmu",
  },
  propertyProtection: {
    label: "Pojištění majetku",
    shortLabel: "Pojištění majetku",
  },
} as const satisfies Record<
  ServiceKey,
  {
    label: string;
    shortLabel: string;
  }
>;
