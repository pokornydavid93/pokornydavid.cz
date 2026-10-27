import { LEAD_TOPICS, type LeadTopic } from "@/lib/api";

export const leadFormTopics = LEAD_TOPICS;

export type LeadFormTopic = (typeof leadFormTopics)[number];

export const isLeadTopic = (value: string): value is LeadTopic =>
  leadFormTopics.includes(value as LeadTopic);
