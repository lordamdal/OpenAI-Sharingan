// Chief-of-Staff agent loop: OpenAI chat completions with tool calling.
// Two tools: exa_search (web research) and request_phone_approval (pauses
// the loop for a real outbound phone call; resumed later by a webhook via
// resumeTask()).

import OpenAI from "openai";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import {
  getTask,
  appendLog,
  setStatus,
  setPendingReason,
  setResult,
  setError,
  setMessages,
  setPendingToolCallId,
  type Task,
} from "./store";
import { exaSearch } from "./exa";
import { placeApprovalCall } from "./twilio";

let client: OpenAI | undefined;
function getClient(): OpenAI {
  if (!client) client = new OpenAI();
  return client;
}

const SYSTEM_PROMPT = `You are Ring Chief, a Chief of Staff agent. Break the user's task into concrete steps. For any step involving spending money, sending a message/email, posting publicly, or deleting/canceling something, you MUST call request_phone_approval with a one-sentence description of exactly what you want to do, and WAIT — do not describe the action as done until you get an approved result back. For research/lookup steps, use exa_search. Keep your final answer short: 2-4 sentences summarizing what was done.`;

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "exa_search",
      description:
        "Search the web for real, up-to-date information relevant to a research or lookup step of the task.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_phone_approval",
      description:
        "Request human approval via an outbound phone call before taking a consequential action (spending money, sending a message/email, posting publicly, or deleting/canceling something). Calling this pauses the task until the human responds on the call.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "One-sentence description of exactly what you want to do.",
          },
        },
        required: ["reason"],
      },
    },
  },
];

// Shared tool-calling loop used by both runTask (fresh start) and
// resumeTask (continuing after phone approval). Mutates `messages` in
// place and persists it to the store whenever the loop has to pause.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runLoop(taskId: string, messages: any[]): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;

  for (;;) {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
      tool_choice: "auto",
    });

    const assistantMessage = completion.choices[0].message;
    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      const exaCalls = toolCalls.filter((tc) => tc.function.name === "exa_search");
      const approvalCall = toolCalls.find(
        (tc) => tc.function.name === "request_phone_approval"
      );

      // Handle research calls first.
      for (const call of exaCalls) {
        let query = "";
        try {
          query = JSON.parse(call.function.arguments)?.query ?? "";
        } catch {
          query = call.function.arguments;
        }
        await setStatus(taskId, "researching");
        await appendLog(taskId, `Researching: ${query}`);
        const result = await exaSearch(query);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
      }

      // Then handle an approval request, if any — this pauses the loop.
      if (approvalCall) {
        let reason = "";
        try {
          reason = JSON.parse(approvalCall.function.arguments)?.reason ?? "";
        } catch {
          reason = approvalCall.function.arguments;
        }

        await appendLog(taskId, `Needs your OK: ${reason}`);
        await setPendingReason(taskId, reason);
        await setStatus(taskId, "awaiting_approval");
        await setMessages(taskId, messages);
        await setPendingToolCallId(taskId, approvalCall.id);

        try {
          await placeApprovalCall(taskId, task.phone, reason);
        } catch (err) {
          await appendLog(taskId, `Error placing approval call: ${String(err)}`);
          await setError(taskId, String(err));
        }

        return; // Do not wait here — resumeTask() continues this later.
      }

      // Only research happened this round — call the model again.
      continue;
    }

    // No tool calls: this is the final answer.
    const content = assistantMessage.content ?? "";
    await setResult(taskId, content);
    await appendLog(taskId, "Task complete.");
    return;
  }
}

export async function runTask(taskId: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: task.prompt },
    ];

    await runLoop(taskId, messages);
  } catch (err) {
    await setError(taskId, String(err));
    await appendLog(taskId, `Error: ${String(err)}`);
  }
}

export async function resumeTask(
  taskId: string,
  approved: boolean,
  timedOut: boolean
): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;

  if (!task.messages || !task.pendingToolCallId) {
    await appendLog(taskId, "Error: nothing pending to resume for this task.");
    return;
  }

  try {
    // Per product design, a timeout means "proceed anyway" — both branches
    // continue the loop as approved, just logged differently. `approved`
    // is accepted for signature/API symmetry but doesn't change behavior
    // here since a rejection flow isn't part of this MVP.
    void approved;

    await setStatus(taskId, timedOut ? "timed_out" : "approved");
    await appendLog(taskId, timedOut ? "No response — proceeding anyway." : "Approved by phone.");

    const messages = task.messages;
    messages.push({
      role: "tool",
      tool_call_id: task.pendingToolCallId,
      content: "Approved.",
    });
    await setPendingToolCallId(taskId, undefined);

    await runLoop(taskId, messages);
  } catch (err) {
    await setError(taskId, String(err));
    await appendLog(taskId, `Error: ${String(err)}`);
  }
}
