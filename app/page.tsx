"use client";

import { useEffect, useRef, useState } from "react";

interface TaskLogEntry {
  ts: number;
  message: string;
}

type TaskStatus =
  | "starting"
  | "researching"
  | "awaiting_approval"
  | "approved"
  | "timed_out"
  | "done"
  | "error";

interface TaskView {
  id: string;
  prompt: string;
  phone: string;
  status: TaskStatus;
  log: TaskLogEntry[];
  pendingReason?: string;
  result?: string;
  error?: string;
}

const ACCENT = "var(--blue)";
const AMBER = "#c97925";
const DANGER = "#a9361e";

const STATUS_LABELS: Record<TaskStatus, string> = {
  starting: "Delegating…",
  researching: "Researching…",
  awaiting_approval: "Waiting for your OK — check your phone…",
  approved: "Approved — finishing up…",
  timed_out: "No response — proceeding anyway…",
  done: "Done",
  error: "Something went wrong",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [phone, setPhone] = useState("");
  const [task, setTask] = useState<TaskView | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [task?.log.length]);

  async function pollStatus(id: string) {
    try {
      const res = await fetch(`/api/task/${id}/status`);
      if (!res.ok) {
        setFormError("Lost track of that task.");
        stopPolling();
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as TaskView;
      setTask(data);
      if (data.status === "done" || data.status === "error") {
        stopPolling();
        setSubmitting(false);
      }
    } catch {
      setFormError("Network hiccup while polling status — will keep trying.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!prompt.trim() || !phone.trim()) {
      setFormError("Both a task and a phone number are required.");
      return;
    }

    setSubmitting(true);
    setTask(null);
    stopPolling();

    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data?.error ?? "Failed to start task.");
        setSubmitting(false);
        return;
      }
      const id = data.id as string;
      // Kick off an immediate poll, then keep polling every 2s.
      pollStatus(id);
      intervalRef.current = setInterval(() => pollStatus(id), 2000);
    } catch {
      setFormError("Could not reach the server. Is it running?");
      setSubmitting(false);
    }
  }

  const statusLabel = task ? STATUS_LABELS[task.status] : null;

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 24px 80px",
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}
    >
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 24 }}>
        <h1
          style={{
            fontFamily: "var(--display)",
            fontSize: 56,
            margin: 0,
            letterSpacing: -2.5,
            fontWeight: 800,
            lineHeight: 0.95,
          }}
        >
          Ring <em style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 400 }}>Chief</em>
        </h1>
        <p style={{ marginTop: 10, color: "var(--muted)", fontSize: 15 }}>
          An agent that calls you when it needs your OK.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted)" }}>
            Task
          </span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Research the top 3 competitors, then send a $200 refund to this customer."
            rows={3}
            disabled={submitting}
            style={{
              background: "#fff",
              color: "var(--ink)",
              border: "1px solid #bfbfba",
              borderRadius: 0,
              padding: "12px 14px",
              fontSize: 15,
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted)" }}>
            Phone number
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+15551234567"
            disabled={submitting}
            style={{
              background: "#fff",
              color: "var(--ink)",
              border: "1px solid #bfbfba",
              borderRadius: 0,
              padding: "12px 14px",
              fontSize: 15,
              fontFamily: "inherit",
            }}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 6,
            background: submitting ? "var(--soft)" : ACCENT,
            color: submitting ? "var(--muted)" : "#fff",
            border: `1px solid ${submitting ? "var(--rule)" : ACCENT}`,
            borderRadius: 0,
            padding: "14px 20px",
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Working…" : "Go"}
        </button>
      </form>

      {formError && (
        <div
          style={{
            background: "#fff7eb",
            border: `1px solid ${DANGER}`,
            color: DANGER,
            borderRadius: 0,
            padding: "12px 16px",
            fontSize: 14,
          }}
        >
          {formError}
        </div>
      )}

      {task && (
        <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              border: `1px solid ${task.status === "error" ? DANGER : "var(--ink)"}`,
              borderRadius: 0,
              padding: "20px 24px",
              background: "#fff",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted)", marginBottom: 8 }}>
              Status
            </div>
            <div
              style={{
                fontFamily: "var(--display)",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: -0.5,
                color:
                  task.status === "error"
                    ? DANGER
                    : task.status === "awaiting_approval" || task.status === "timed_out"
                    ? AMBER
                    : task.status === "done"
                    ? ACCENT
                    : "var(--ink)",
              }}
            >
              {statusLabel}
            </div>

            {task.status === "awaiting_approval" && task.pendingReason && (
              <div
                style={{
                  marginTop: 14,
                  fontSize: 15,
                  color: "var(--ink)",
                  background: "#fff7eb",
                  border: `1px solid ${AMBER}`,
                  borderRadius: 0,
                  padding: "10px 14px",
                }}
              >
                Calling you to approve: {task.pendingReason}
              </div>
            )}
          </div>

          {task.status === "done" && task.result && (
            <div
              style={{
                background: "var(--soft)",
                border: `1px solid ${ACCENT}`,
                borderRadius: 0,
                padding: "20px 24px",
              }}
            >
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: ACCENT, marginBottom: 8 }}>
                Result
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {task.result}
              </div>
            </div>
          )}

          {task.status === "error" && task.error && (
            <div
              style={{
                background: "#fff7eb",
                border: `1px solid ${DANGER}`,
                borderRadius: 0,
                padding: "20px 24px",
              }}
            >
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: DANGER, marginBottom: 8 }}>
                Error
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {task.error}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted)", marginBottom: 8 }}>
              Log
            </div>
            <div
              style={{
                border: "1px solid var(--rule)",
                borderRadius: 0,
                background: "#fff",
                maxHeight: 260,
                overflowY: "auto",
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {task.log.length === 0 && (
                <div style={{ color: "var(--muted)", fontSize: 14 }}>No activity yet.</div>
              )}
              {task.log.map((entry, i) => (
                <div
                  key={`${entry.ts}-${i}`}
                  style={{ fontSize: 13, color: "var(--ink)", display: "flex", gap: 10 }}
                >
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>
                    {formatTime(entry.ts)}
                  </span>
                  <span>{entry.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
