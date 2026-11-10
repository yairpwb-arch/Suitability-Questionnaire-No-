import { NextResponse, after } from "next/server";
import { getMetaRequestContext, sendMetaLead } from "./meta-capi";

// Give the background work (Apps Script + retries) enough time to finish.
export const maxDuration = 60;

async function sendToSheet(webhookUrl: string, body: Record<string, unknown>) {
  // Apps Script is slow and occasionally flaky; retry before giving up.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      // Apps Script answers 200 with an HTML error page when the script
      // throws, so check the actual body, not just the status.
      if (res.ok && text.includes('"ok"')) return;
      console.error("Sheets webhook error", attempt, res.status, text.slice(0, 500));
    } catch (err) {
      console.error("Sheets webhook request failed", attempt, err);
    }
    await new Promise((r) => setTimeout(r, attempt * 1500));
  }
  console.error("Lead NOT saved to sheet", JSON.stringify(body));
}

export async function POST(request: Request) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "GOOGLE_SHEETS_WEBHOOK_URL is not configured" },
      { status: 500 }
    );
  }

  const { eventId, pageUrl, ...body } = await request.json();
  // Tag leads from this site; the Apps Script writes `reason` into the notes column.
  body.reason = [body.reason, "אתר בלי התחייבות"].filter(Boolean).join("\n");

  const metaCtx = getMetaRequestContext(request, pageUrl);
  const eventTime = Math.floor(Date.now() / 1000);

  // Respond immediately; the slow upstream calls run after the response is sent.
  after(() =>
    Promise.all([
      sendMetaLead(metaCtx, { name: body.name, phone: body.phone, eventId, eventTime }),
      sendToSheet(webhookUrl, body),
    ])
  );

  return NextResponse.json({ status: "ok" });
}
