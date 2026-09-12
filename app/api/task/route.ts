import { createTask } from "@/lib/store";
import { runTask } from "@/lib/agent-loop";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { prompt, phone } = (body ?? {}) as { prompt?: unknown; phone?: unknown };

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }
  if (typeof phone !== "string" || phone.trim().length === 0) {
    return Response.json({ error: "phone is required" }, { status: 400 });
  }

  const task = createTask(prompt, phone);

  // Fire-and-forget: don't block the response on the whole agent run.
  runTask(task.id).catch((err) => console.error(err));

  return Response.json({ id: task.id });
}
