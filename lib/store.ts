// In-memory task store. Good enough for one live demo run on a single
// warm Vercel Fluid Compute instance — NOT durable, NOT multi-instance safe.
// If we get spare time, swap this for Vercel KV/Upstash without changing callers.

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

const tasks = new Map<string, Task>();

export function createTask(prompt: string, phone: string): Task {
  const id = Math.random().toString(36).slice(2, 10);
  const task: Task = { id, prompt, phone, status: "starting", log: [] };
  tasks.set(id, task);
  appendLog(id, "Task received.");
  return task;
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id);
}

export function appendLog(id: string, message: string): void {
  const task = tasks.get(id);
  if (!task) return;
  task.log.push({ ts: Date.now(), message });
}

export function setStatus(id: string, status: TaskStatus): void {
  const task = tasks.get(id);
  if (!task) return;
  task.status = status;
}

export function setPendingReason(id: string, reason: string): void {
  const task = tasks.get(id);
  if (!task) return;
  task.pendingReason = reason;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setMessages(id: string, messages: any[]): void {
  const task = tasks.get(id);
  if (!task) return;
  task.messages = messages;
}

export function setPendingToolCallId(id: string, toolCallId: string | undefined): void {
  const task = tasks.get(id);
  if (!task) return;
  task.pendingToolCallId = toolCallId;
}

export function setResult(id: string, result: string): void {
  const task = tasks.get(id);
  if (!task) return;
  task.result = result;
  task.status = "done";
}

export function setError(id: string, error: string): void {
  const task = tasks.get(id);
  if (!task) return;
  task.error = error;
  task.status = "error";
}
