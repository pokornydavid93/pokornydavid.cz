import { createHmac, timingSafeEqual } from "node:crypto";

export const OVERVIEW_CONFIRMATION_EMAIL_COOKIE = "overview_confirmation_email_v1";

export type OverviewConfirmationEmailStatus = "queued" | "unavailable";

const signatureFor = (receiptId: string, secret: string) =>
  createHmac("sha256", secret)
    .update("pokornydavid.overview.confirmation-email.v1\0")
    .update(receiptId)
    .digest("base64url");

export const createOverviewConfirmationEmailToken = (
  receiptId: string,
  secret: string,
): string => `${receiptId}.${signatureFor(receiptId, secret)}`;

export const readOverviewConfirmationEmailStatus = (
  token: string | undefined,
  receiptId: string,
  secret: string | undefined,
): OverviewConfirmationEmailStatus => {
  if (!token || !receiptId || !secret || secret.length < 32) return "unavailable";
  const expected = createOverviewConfirmationEmailToken(receiptId, secret);
  if (token.length !== expected.length) return "unavailable";
  const actualBytes = Buffer.from(token);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length
    && timingSafeEqual(actualBytes, expectedBytes)
    ? "queued"
    : "unavailable";
};
