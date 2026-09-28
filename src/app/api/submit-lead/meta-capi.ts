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

// Sends a server-side Lead event (Conversions API). Shares eventId with the
// browser pixel's Lead event so Meta deduplicates the two.
export async function sendMetaLead(
  request: Request,
  lead: { name?: string; phone?: string; eventId?: string }
) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return;

  const [firstName, ...rest] = (lead.name ?? "").trim().toLowerCase().split(/\s+/);
  const lastName = rest.join(" ");
  const phone = lead.phone ? normalizePhone(lead.phone) : "";

  const userData: Record<string, unknown> = {
    client_ip_address: request.headers.get("x-forwarded-for")?.split(",")[0].trim(),
    client_user_agent: request.headers.get("user-agent") ?? undefined,
    fbp: getCookie(request, "_fbp"),
    fbc: getCookie(request, "_fbc"),
    country: [sha256("il")],
  };
  if (phone) userData.ph = [sha256(phone)];
  if (firstName) userData.fn = [sha256(firstName)];
  if (lastName) userData.ln = [sha256(lastName)];

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: lead.eventId,
        action_source: "website",
        event_source_url: request.headers.get("referer") ?? undefined,
        user_data: userData,
      },
    ],
  };
  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) console.error("Meta CAPI error", res.status, await res.text());
  } catch (err) {
    console.error("Meta CAPI request failed", err);
  }
}
