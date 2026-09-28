import { NextResponse } from "next/server";
import { sendMetaLead } from "./meta-capi";

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

  const upstream = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }

  await sendMetaLead(request, { name: body.name, phone: body.phone, eventId });

  return NextResponse.json({ status: "ok" });
}
