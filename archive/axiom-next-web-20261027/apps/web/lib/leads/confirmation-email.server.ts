import "server-only";

import type { NormalizedOverviewRequest } from "./overview-request";
import { queueOverviewConfirmationEmailWithDependencies } from "./confirmation-email";

export const queueOverviewConfirmationEmail = (
  request: NormalizedOverviewRequest,
  acceptedReference: string,
) => queueOverviewConfirmationEmailWithDependencies(
  request,
  acceptedReference,
  process.env,
  globalThis.fetch,
);
