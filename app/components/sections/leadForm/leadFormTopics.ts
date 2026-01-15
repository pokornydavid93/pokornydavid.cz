import type { LeadTopic } from "@/lib/api";

export const leadFormTopics = [
  "Hypotéka & bydlení",
  "Finanční plán",
  "Investice a spoření",
  "Zajištění příjmu",
  "Pojištění vozidla",
  "Reality (prodej nemovitosti)",
  "Energie a úspory",
  "Ochrana majetku",
  "Pojištění odpovědnosti",
  "Spotřebitelské a podnikatelské úvěry",
  "Jiná situace",
] as const;

export type LeadFormTopic = (typeof leadFormTopics)[number];

export const isLeadTopic = (value: string): value is LeadTopic =>
  leadFormTopics.some((topic) => topic === value);
