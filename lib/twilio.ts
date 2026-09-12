// Kicks off a real phone call asking a human to approve an agent action.
// Fire-and-forget: we don't wait for the call to be answered or resolved
// here — Twilio will hit our /api/twilio/twiml and /api/twilio/gather
// webhooks as the call progresses, and that's what drives resumeTask.

import Twilio from "twilio";

export async function placeApprovalCall(taskId: string, phone: string, reason: string): Promise<void> {
  const client = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ).trim();

  await client.calls.create({
    to: phone,
    from: process.env.TWILIO_FROM_NUMBER as string,
    url: `${baseUrl}/api/twilio/twiml?taskId=${encodeURIComponent(taskId)}&reason=${encodeURIComponent(reason)}`,
    method: "POST",
  });
}
