import { parseIncomeTestRequest, type IncomeTestRequest, type IncomeTestSubmitResult } from "./income-test-request.ts";
const MAX_BODY_BYTES = 8192;
const responseHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function handleIncomeTestPost(request: Request, dependencies: Readonly<{
  noticeVersion: string;
  submit: (input: IncomeTestRequest, hostname: string) => Promise<IncomeTestSubmitResult>;
}>) {
  const invalid = () => Response.json({ status: "error", reason: "invalid" }, { status: 400, headers: responseHeaders });
  // A browser may submit contacts only from the same website; no permissive CORS.
  if (new URL(request.url).search !== "") return invalid();
  const hostname = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    if (!["https:", "http:"].includes(origin.protocol) || origin.host !== hostname) return invalid();
  } catch { return invalid(); }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json" || !request.body) return invalid();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); return invalid(); }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const input = parseIncomeTestRequest(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)), dependencies.noticeVersion);
    if (!input) return invalid();
    let result: IncomeTestSubmitResult;
    try { result = await dependencies.submit(input, hostname); }
    catch { result = { status: "error", reason: "unavailable" }; }
    const status = result.status === "accepted" ? 201 : { invalid: 400, unavailable: 503, conflict: 409, "rate-limited": 429 }[result.reason];
    return Response.json(result, { status, headers: responseHeaders });
  } catch { return invalid(); }
}
