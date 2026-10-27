import { formPrivacyNotice } from "@/app/content/form-privacy";
import { handleIncomeTestPost } from "@/lib/leads/income-test-http";
import { submitIncomeTest } from "@/lib/leads/income-test-runtime.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleIncomeTestPost(request, { noticeVersion: formPrivacyNotice.version, submit: submitIncomeTest });
}
