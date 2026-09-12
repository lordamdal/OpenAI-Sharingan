// Postgres-backed task store (Neon serverless driver over HTTP — works from
// any Vercel Function, no persistent connection needed). Each task is one
// JSONB row, read-modified-written whole; fine at hackathon-demo volume.
// Swapped in after the in-memory version proved to lose tasks across
// serverless instance rotations mid-demo.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let sql: NeonQueryFunction<false, false> | undefined;
function getSql(): NeonQueryFunction<false, false> {
  if (!sql) sql = neon(process.env.DATABASE_URL!);
  return sql;
}

export type TaskStatus =
  | "starting"
  | "researching"
  | "awaiting_approval"
  | "approved"
  | "timed_out"
  | "done"
  | "error";

export interface TaskLogEntry {
  ts: number;
  message: string;
}

export interface Task {
  id: string;
  prompt: string;
  phone: string;
  status: TaskStatus;
  log: TaskLogEntry[];
  pendingReason?: string; // the action the agent wants to take, read aloud on the call
  result?: string;
  error?: string;
  // OpenAI chat message history, kept so the Twilio webhook (a separate
  // request) can resume the tool-calling loop after approval comes in.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages?: any[];
  pendingToolCallId?: string;
}

async function readTask(id: string): Promise<Task | undefined> {
  const rows = await getSql()`SELECT data FROM tasks WHERE id = ${id}`;
  if (rows.length === 0) return undefined;
  return rows[0].data as Task;
}

async function writeTask(task: Task): Promise<void> {
  await getSql()`
    INSERT INTO tasks (id, data, updated_at)
    VALUES (${task.id}, ${JSON.stringify(task)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `;
}

async function mutate(id: string, fn: (task: Task) => void): Promise<void> {
  const task = await readTask(id);
  if (!task) return;
  fn(task);
  await writeTask(task);
}

export async function createTask(prompt: string, phone: string): Promise<Task> {
  const id = Math.random().toString(36).slice(2, 10);
  const task: Task = { id, prompt, phone, status: "starting", log: [] };
  await writeTask(task);
  await appendLog(id, "Task received.");
  return task;
}

export async function getTask(id: string): Promise<Task | undefined> {
  return readTask(id);
}

export async function appendLog(id: string, message: string): Promise<void> {
  await mutate(id, (task) => {
    task.log.push({ ts: Date.now(), message });
  });
}

export async function setStatus(id: string, status: TaskStatus): Promise<void> {
  await mutate(id, (task) => {
    task.status = status;
  });
}

export async function setPendingReason(id: string, reason: string): Promise<void> {
  await mutate(id, (task) => {
    task.pendingReason = reason;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function setMessages(id: string, messages: any[]): Promise<void> {
  await mutate(id, (task) => {
    task.messages = messages;
  });
}

export async function setPendingToolCallId(id: string, toolCallId: string | undefined): Promise<void> {
  await mutate(id, (task) => {
    task.pendingToolCallId = toolCallId;
  });
}

export async function setResult(id: string, result: string): Promise<void> {
  await mutate(id, (task) => {
    task.result = result;
    task.status = "done";
  });
}

export async function setError(id: string, error: string): Promise<void> {
  await mutate(id, (task) => {
    task.error = error;
    task.status = "error";
  });
}
