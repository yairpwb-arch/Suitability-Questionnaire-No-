import { createHash } from "node:crypto";

const GRAPH_API_VERSION = "v23.0";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

// Meta expects phone numbers as digits with country code (Israel: 05x -> 9725x).
function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
}

function getCookie(request: Request, name: string) {
  const match = request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// Everything CAPI needs from the incoming request, captured up front so it
// doesn't depend on the request object still being readable inside after().
export function getMetaRequestContext(request: Request, pageUrl?: string) {
  const eventSourceUrl = pageUrl || request.headers.get("referer") || undefined;

  // The pixel only sets _fbc after it loads; if the user submitted before
  // that, rebuild it from the fbclid in the landing URL so the lead still
  // gets attributed to the ad.
  let fbc = getCookie(request, "_fbc");
  if (!fbc && eventSourceUrl) {
    try {
      const fbclid = new URL(eventSourceUrl).searchParams.get("fbclid");
      if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
    } catch {
      // ignore malformed URL
    }
  }

  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim(),
    userAgent: request.headers.get("user-agent") ?? undefined,
    fbp: getCookie(request, "_fbp"),
    fbc,
    eventSourceUrl,
  };
}

export type MetaRequestContext = ReturnType<typeof getMetaRequestContext>;

// Sends a server-side Lead event (Conversions API). Shares eventId with the
// browser pixel's Lead event so Meta deduplicates the two.
export async function sendMetaLead(
  ctx: MetaRequestContext,
  lead: { name?: string; phone?: string; eventId?: string; eventTime: number }
) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) {
    console.error("Meta CAPI not configured (pixel id / access token missing)");
    return;
  }

  const [firstName, ...rest] = (lead.name ?? "").trim().toLowerCase().split(/\s+/);
  const lastName = rest.join(" ");
  const phone = lead.phone ? normalizePhone(lead.phone) : "";

  const userData: Record<string, unknown> = {
    client_ip_address: ctx.ip,
    client_user_agent: ctx.userAgent,
    fbp: ctx.fbp,
    fbc: ctx.fbc,
    country: [sha256("il")],
  };
  if (phone) {
    userData.ph = [sha256(phone)];
    userData.external_id = [sha256(phone)];
  }
  if (firstName) userData.fn = [sha256(firstName)];
  if (lastName) userData.ln = [sha256(lastName)];

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: "Lead",
        event_time: lead.eventTime,
        event_id: lead.eventId,
        action_source: "website",
        event_source_url: ctx.eventSourceUrl,
        user_data: userData,
      },
    ],
  };
  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  // Retry transient failures; same event_id means a retry can't double-count.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${accessToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (res.ok) return;
      const text = await res.text();
      console.error("Meta CAPI error", res.status, text);
      // 4xx (bad token, bad payload) won't fix itself on retry.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return;
    } catch (err) {
      console.error("Meta CAPI request failed", attempt, err);
    }
    await new Promise((r) => setTimeout(r, attempt * 1000));
  }
  console.error("Meta Lead NOT sent", lead.eventId);
}
