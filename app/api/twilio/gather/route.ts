// Twilio POSTs here after the <Gather> in /api/twilio/twiml resolves —
// either because the caller pressed a digit, or (thanks to
// actionOnEmptyResult) because the 60s window timed out with no keypress.
// Either way we resume the agent's task; resumeTask decides what to do
// with approved/timedOut.

import { NextRequest } from "next/server";
import { resumeTask } from "@/lib/agent-loop";

const HANGUP_TWIML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Got it, thanks.</Say>
  <Hangup/>
</Response>`;

export async function POST(request: NextRequest): Promise<Response> {
  const taskId = request.nextUrl.searchParams.get("taskId") ?? "";

  try {
    const formData = await request.formData();
    const digits = (formData.get("Digits") as string | null) ?? "";

    const approved = digits === "1";
    const timedOut = !digits;

    await resumeTask(taskId, approved, timedOut);
  } catch (err) {
    console.error("Error handling Twilio gather webhook:", err);
  }

  return new Response(HANGUP_TWIML, { headers: { "Content-Type": "text/xml" } });
}
