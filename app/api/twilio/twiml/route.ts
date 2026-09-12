// Twilio requests this URL when the approval call connects. Responds with
// TwiML that reads the pending action aloud and gathers one DTMF digit,
// falling back to "go ahead anyway" if the human never presses anything.

import { NextRequest } from "next/server";

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildTwiml(request: NextRequest): string {
  const taskId = request.nextUrl.searchParams.get("taskId") ?? "";
  const reason = request.nextUrl.searchParams.get("reason") ?? "do something";

  const safeReason = escapeXml(reason);
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ).trim();
  const actionUrl = `${baseUrl}/api/twilio/gather?taskId=${encodeURIComponent(taskId)}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" timeout="60" actionOnEmptyResult="true" action="${actionUrl}" method="POST">
    <Say>Ring Chief here. I want to: ${safeReason}. Press 1 to approve. If I don't hear from you in about a minute, I'll go ahead anyway.</Say>
  </Gather>
</Response>`;
}

async function handle(request: NextRequest): Promise<Response> {
  const xml = buildTwiml(request);
  return new Response(xml, { headers: { "Content-Type": "text/xml" } });
}

export async function POST(request: NextRequest): Promise<Response> {
  return handle(request);
}

export async function GET(request: NextRequest): Promise<Response> {
  return handle(request);
}
