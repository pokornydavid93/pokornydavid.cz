function buildErrorResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key]
  return typeof v === "string" ? v : undefined
}

function normalizeOptionalString(v: string | undefined): string | null {
  const s = (v ?? "").trim()
  return s === "" ? null : s
}

export async function OPTIONS() {
  return new Response(null, { status: 204 })
}

export async function POST(req: Request) {
  const upstreamBase = (process.env.CLIENT_SERVER_URL ?? "").replace(/\/+$/, "")
  if (!upstreamBase) {
    return buildErrorResponse("CLIENT_SERVER_URL is not configured", 500)
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return buildErrorResponse("Invalid JSON", 400)
  }

  if (!isRecord(raw)) {
    return buildErrorResponse("Invalid JSON object", 400)
  }

  // Go server: POST /api/lead -> validace + insert + mail
  const upstreamUrl = `${upstreamBase}/api/lead`

  // topic musí být přesně jeden z enum stringů v DB; když ho FE neposlal, dáme bezpečný default
  const topic = (getString(raw, "topic") ?? "").trim() || "Jiná situace"

  // phone/message v Go requestHandler jsou *string -> null = nil pointer
  const payload = {
    name: (getString(raw, "name") ?? "").trim(),
    email: (getString(raw, "email") ?? "").trim(),
    phone: normalizeOptionalString(getString(raw, "phone")),
    topic,
    message: normalizeOptionalString(getString(raw, "message")),
  }

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain",
      },
      body: JSON.stringify(payload),
    })
  } catch {
    return buildErrorResponse("Upstream unavailable", 502)
  }

  if (upstreamResponse.status === 204) {
    return new Response(null, { status: 204 })
  }

  const text = await upstreamResponse.text()
  const headers = new Headers()
  headers.set(
    "content-type",
    upstreamResponse.headers.get("content-type") ?? "text/plain; charset=utf-8"
  )

  return new Response(text, {
    status: upstreamResponse.status,
    headers,
  })
}
