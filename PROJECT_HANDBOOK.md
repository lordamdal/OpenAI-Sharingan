# Project Handbook — "Ring Chief"

**Event:** AI Tinkerers "Agents, Everywhere" hackathon
**Status: BUILT AND LIVE.** The full loop works end-to-end, tested with a real phone call. Remaining time goes to the demo video, written description, and submission — not more building.

**Live URL:** https://openai-sharingan.vercel.app
**Repo:** https://github.com/lordamdal/OpenAI-Sharingan (flip to **public** before submitting — see checklist)

## 1. The pitch, in one sentence

A Chief-of-Staff agent that, when it hits a step that needs your sign-off, **calls your actual phone** and asks for approval — and if you don't pick up within ~60 seconds, it proceeds on its own anyway. The phone call *is* the environment; that's the whole differentiator, and it's real, not mocked.

How it hits the judging rubric:

| Criterion | How we hit it |
|---|---|
| Core Requirements & Functionality | Verified live: real task → real research → real phone call → real approval → real completion |
| Innovation & Theme Alignment | The agent leaves the chatbox and rings an actual phone — can't be reproduced in a chat window |
| Technical Execution & Integration | Real OpenAI tool-calling loop, real Exa search, real Twilio call + webhook, Postgres-backed state, deployed on Vercel |
| Usefulness & Agentic Experience | "Ask permission, act if I don't answer" is a genuinely useful pattern for any agent doing something consequential |

## 2. What's actually built

- **Frontend:** one page (`app/page.tsx`) — task input, phone number input, live status log, polls every 2s.
- **Agent loop** (`lib/agent-loop.ts`): OpenAI `chat.completions` with tool calling. Two tools:
  - `exa_search` — real web search (Exa API), for research/lookup steps.
  - `request_phone_approval` — for any consequential step (spend money, send something, delete/cancel). Pauses the task and triggers a real call.
- **Phone approval** (`lib/twilio.ts`, `app/api/twilio/*`): places an outbound Twilio call, reads the pending action aloud, gathers one DTMF digit with a 60s window. Press 1 = approved. **No response within 60s = proceeds anyway** — this fail-open behavior is the actual thesis of the project, demo it explicitly.
- **State** (`lib/store.ts`): Postgres (Neon), one JSONB row per task. Not in-memory — we hit and fixed a real bug here (see §4).
- **Deployment:** Vercel, `after()` from `next/server` keeps the background agent work alive past the HTTP response (serverless "fire-and-forget" gotcha, also fixed — see §4).

## 3. Demo script (under 2 minutes)

1. Open https://openai-sharingan.vercel.app. Type a task with one research step and one consequential step, e.g. *"Research the top competitor to Notion, then send a $50 refund to a customer named Alex."* Enter your phone number.
2. Hit Go. Log shows: delegating → researching (real Exa result appears, e.g. "Microsoft Loop") → "this needs your OK — calling you now."
3. Phone rings on stage. Answer, press 1. Log updates to "Approved by phone" → "Task complete," with a real result.
4. **Second beat — this is the actual point of the project:** run it again, this time **don't answer**. Let the 60-second timeout hit. Log shows "No response — proceeding anyway," task completes without you. Say out loud what just happened: the agent didn't block on you, it acted responsibly and moved on.

## 4. Bugs we hit and fixed (worth mentioning in the technical writeup — this is real engineering, not a happy-path demo)

- **In-memory task store lost data across serverless instance rotations.** Confirmed by live testing: a task would vanish mid-flow, right around when the phone-approval wait needs state to survive. Fixed by moving to a Postgres-backed store (Neon).
- **Fire-and-forget background work got frozen after the HTTP response returned**, so the agent loop sometimes never finished. Fixed with `after()` from `next/server`, which keeps the function alive until the deferred work completes.
- **Twilio's TwiML `<Gather action>` pointed at a Deployment-Protection-gated URL** (`VERCEL_URL`, which is per-deployment and requires SSO), producing Twilio's generic "an application error has occurred" voice message. Fixed by pointing it at the stable public production alias instead, via `NEXT_PUBLIC_APP_URL`.

## 5. Submission checklist

- [ ] Flip the GitHub repo to **public** (Settings → General → Danger Zone) — required before submitting
- [ ] Project title
- [ ] Written description — lead with the phone-call-permission hook, tie to the theme ("agents leaving the chatbox"), and mention the fail-open timeout behavior explicitly since that's the actual insight
- [ ] Record the 2-minute demo video (script above — do both the "approve" and "timeout" beats)
- [ ] Social media post tagging event partners
- [ ] Submit in the portal before the deadline shown there

## 6. If something breaks right before demo time

- Live URL and repo are both stable; nothing here depends on your laptop.
- If Twilio's trial-account balance or number verification becomes an issue, the code path is still real and correct — narrate it and show the log/result even if the literal ring doesn't happen live.
- Env vars are all set on Vercel already (`OPENAI_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `DATABASE_URL`, `EXA_API_KEY`, `NEXT_PUBLIC_APP_URL`) — no last-minute setup needed.
