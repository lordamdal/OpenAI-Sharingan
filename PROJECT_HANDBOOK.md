# Project Handbook — "Ring Chief" (working title)

**Event:** AI Tinkerers "Agents, Everywhere" hackathon
**Deadline:** submission closes ~4:30 PM PDT today. **You have ~2 hours of build time left**, then stop to test, record, and submit. Treat every timestamp below as relative to *now*.

## 1. The pivot, in one sentence

Instead of building a generic multi-agent dashboard (a chatbox with extra steps), we ship **one real, working loop**: a Chief-of-Staff agent that, when it hits a step that needs your sign-off, **calls your phone** and asks for approval — and if you don't pick up in time, it proceeds on its own. The phone call *is* the environment. That's the whole differentiator.

This directly targets the judging rubric:

| Criterion | How we hit it |
|---|---|
| Core Requirements & Functionality | One task → one real approval-gated action, working end-to-end, no mocked steps |
| Innovation & Theme Alignment | The agent leaves the chatbox and rings an actual phone — literally can't happen in a chat window |
| Technical Execution & Integration | Real OpenAI tool-calling loop + real Twilio call + real webhook, deployed live on Vercel |
| Usefulness & Agentic Experience | "Ask permission, act if I don't answer" is an obviously useful pattern for any agent doing something consequential |

## 2. What's IN vs OUT (do not relitigate this once building starts)

**IN — the golden path, nothing else:**
- One page, one task input, one "Go" button
- Chief-of-Staff agent (OpenAI tool-calling loop) breaks the task into steps
- One step is tagged "needs approval" → agent calls a `request_phone_approval` tool
- Server places a real outbound Twilio call to a demo phone number
- Call says the pending action, asks to press 1 to approve; **if no input within ~60 seconds, treat as approved and proceed anyway** (this timeout-then-proceed behavior is the point — call it out on stage)
- Live status log on the page (poll every 2s): "delegating…", "calling you…", "waiting (45s)…", "approved / timed out — proceeding", "done: `<result>`"
- One real tool the agent can actually call for the non-approval steps (Exa search — hackathon sponsor credits, dead simple REST call) so the output isn't just LLM prose

**OUT — explicitly not building today:**
- Multi-agent swarm / real subagent orchestration (fake it with 2-3 labeled log lines from the *same* backend call if there's time — cosmetic only)
- Voice input, GPT-Live, or a spoken conversation on the phone call (DTMF "press 1" is enough — the ring is the moment, not the dialogue)
- Auth, database, persistent memory, multi-user support
- The "Agent Swarm / Larki Design Co" dashboard UI from the earlier scaffold — don't port that code in, rebuild the single page fresh and small
- Tests, CI, polish beyond "looks intentional"

If the golden path is working with 30+ minutes to spare, THEN and only then consider: a second labeled "specialist" step, nicer visual design, a real `multi_agent` call via the new Agents API.

## 3. Architecture

```
Browser (Next.js page on Vercel)
   |  POST /api/task { prompt, phone }
   v
Next.js API route (Vercel Function)
   |  OpenAI chat.completions loop with tools=[request_phone_approval, exa_search]
   |
   |--- model calls exa_search --------> real Exa API call --> result fed back to model
   |
   |--- model calls request_phone_approval(reason) --->
   |        Twilio Voice: outbound call to DEMO_APPROVER_PHONE
   |        TwiML: <Say>reason</Say><Gather numDigits="1" timeout="60" action="/api/twilio/gather">
   |        Twilio POSTs result to /api/twilio/gather (webhook, must be the public Vercel URL)
   |        No digit within 60s -> Twilio still calls the webhook with empty Digits -> treat as approved
   |
   v
In-memory task store (module-level Map, keyed by taskId — fine for a live demo, not for production)
   |
Browser polls GET /api/task/:id/status -> renders the log
```

## 4. Stack decisions (already locked in, don't re-debate)

- **Repo/host:** GitHub `lordamdal/OpenAI-Sharingan` (private for now, flip to public before submitting), Vercel project `lordamdals-projects/openai-sharingan` — both already created and linked this session.
- **App:** Next.js (App Router), deployed on Vercel. Fluid Compute default is fine.
- **Agent loop:** Start with plain `openai` SDK `chat.completions.create` + `tools` (function calling) — it's stable and the team already knows it. **Optionally** try OpenAI's brand-new (Sept 10, 2026) hosted **Agents API** (`client.beta.agents.sessions.create`, built on the Codex harness, has native `multi_agent.enabled` subagent support) if there's time to spike it in the first 10 minutes — see the coding agent prompt for the exact call shape and the fallback rule. Don't burn more than 10 minutes on the beta API before falling back.
- **Approval channel:** Twilio Programmable Voice, `<Gather>` DTMF (press 1). Not a conversational voice call — too slow to build reliably in 2 hours.
- **Extra real tool:** Exa API for search/research, using hackathon-provided Exa credits.
- **State:** in-memory Map in the API route. No DB. Good enough for one live demo run.

## 5. Setup risks to knock out FIRST (before writing app logic)

1. **Twilio trial number verification** — outbound calls from a trial account only reach *verified* numbers, and prepend a "trial account" disclaimer before your TwiML. Verify the demo phone number in the Twilio console immediately — this can have a delay, don't discover it 10 minutes before demo.
2. **Twilio needs a public HTTPS webhook.** Don't develop against `localhost` — deploy to Vercel early (even a stub page) and point Twilio's callback at the real `*.vercel.app` URL from the start. `vercel deploy` (preview) or `vercel --prod` from the CLI, both already linked.
3. **OpenAI Agents API access** may not be enabled for your key yet (it's 2 days old as of today) — try it, timebox it, fall back without drama.
4. Get `OPENAI_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `DEMO_APPROVER_PHONE`, `EXA_API_KEY` into Vercel env vars (`vercel env add`) before the first real deploy that needs them.

## 6. Timeline (2 hours)

- **0:00–0:15** — Next.js scaffold, push to repo, `vercel --prod` once so the URL and Twilio webhook target exist. Twilio number verification kicked off in parallel.
- **0:15–0:45** — OpenAI tool-calling loop working end-to-end with a fake/stubbed `request_phone_approval` (just logs, no real call yet) and a real `exa_search` call. Prove the reasoning loop works before adding telephony.
- **0:45–1:20** — Real Twilio integration: outbound call, `<Gather>`, webhook, timeout-then-proceed logic. This is the highest-risk block — if it's not ringing a real phone by 1:20, cut to a recorded/simulated call fallback (see §7) and move on.
- **1:20–1:45** — Status-log UI, make it demo-legible (big, readable, shows the timeout counting down).
- **1:45–2:00** — Freeze scope. Dry-run the full demo twice. Fix only what's broken, not what's ugly.
- **After 2:00** — record the 2-minute demo video, write the submission description, flip repo to public, submit.

## 7. Fallback if Twilio doesn't work live

If the real call can't be made reliably by the 1:20 checkpoint, keep the *code path* real (it does attempt the call) but have a backup: a short pre-recorded screen/phone capture of a successful call+approval, spliced into the demo video, while the live demo narrates "and here's what that looks like." Judges score functionality on the actual repo/demo, so keep the real attempt in the code — don't delete it, just don't bet the live stage moment on a flaky trial-account call if it's clearly not going to cooperate.

## 8. Demo script (aim for under 2 minutes)

1. Open the deployed URL. Type a task with an obviously consequential step, e.g. *"Research the top 3 competitors, then send a $200 refund to this customer."*
2. Hit Go. Log shows: delegating → researching (real Exa results appear) → "this needs your OK — calling you now."
3. Phone rings on stage. Answer, press 1. Log updates: "approved by phone" → "done."
4. Optional second beat: run it again, this time **don't answer** — let the 60-second timeout hit, log shows "no response — proceeding anyway," task completes without you. This is the actual thesis of the project — show it explicitly.

## 9. Submission checklist

- [ ] Project title
- [ ] Written description (lead with the phone-call-permission hook, tie to the theme sentence: "agents leaving the chatbox")
- [ ] Repo flipped to **public**
- [ ] 2-minute demo video
- [ ] Social post tagging event partners
- [ ] Submitted in the portal before the deadline shown there

## 10. Roles

- **Backend/agent logic + Twilio integration:** whoever is faster with API wiring — this is the critical path, prioritize headcount here.
- **UI/status log + demo rehearsal:** the other person, plus owns the video recording and submission form.
