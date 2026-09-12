import { getTask } from "@/lib/store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = getTask(id);

  if (!task) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const { messages, ...safe } = task;
  return Response.json(safe);
}
