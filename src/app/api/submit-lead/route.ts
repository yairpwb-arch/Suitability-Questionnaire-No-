import { NextResponse, after } from "next/server";
import { sendMetaLead } from "./meta-capi";

async function sendToSheet(webhookUrl: string, body: Record<string, unknown>) {
  // Apps Script is slow and occasionally flaky; retry once before giving up.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return;
      console.error("Sheets webhook error", res.status, await res.text());
    } catch (err) {
      console.error("Sheets webhook request failed", err);
    }
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

  const { eventId, ...body } = await request.json();
  // Tag leads from this site; the Apps Script writes `reason` into the notes column.
  body.reason = [body.reason, "אתר בלי התחייבות"].filter(Boolean).join("\n");

  // Respond immediately; the slow upstream calls run after the response is sent.
  after(() =>
    Promise.all([
      sendToSheet(webhookUrl, body),
      sendMetaLead(request, { name: body.name, phone: body.phone, eventId }),
    ])
  );

  return NextResponse.json({ status: "ok" });
}
