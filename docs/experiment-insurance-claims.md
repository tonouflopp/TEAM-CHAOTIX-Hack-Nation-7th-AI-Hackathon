# Experiment: home-insurance claims triage

A controlled end-to-end test of Sage (Capture → Map → Teach) with fake data. It answers the five questions of
*The Apprentice Test* in the challenge brief and checks every **Required** item of the three modules.

- **Duration:** about 75 minutes with three people.
- **Excel files** (in `docs/experiment/`):
  - `claims-sandbox.xlsx`: the **only file shown on screen**. It has the expert's claims queue, the new hire's queue and
    the contacts, with dropdowns in the editable columns.
  - `claims-experiment-kit.xlsx`: **never on screen**. It has the expert rules, the answer key, *what Sage should ask*
    (good and bad questions per screen moment), the debrief targets, the tutor tests, the observer log and the scoring.
    If the rules were on screen, Sage would read them instead of asking for them.
- **Data:** everything below is invented. Names, policy numbers, phones, emails and IBANs are fake. IBANs and IDs have
  valid check digits, because Presidio only detects formally valid ones; the first IBAN is the standard documentation example.
  Never use real customer data.

## 1. Why insurance claims

| Candidate | Fit | Why |
|---|---|---|
| **Insurance claims** | **Chosen** | Decisions hinge on hard limits (amounts, days), real exceptions (gradual vs sudden damage) and clear "stop and ask" moments (fraud, payout to a third party). The screen naturally shows personal data, so privacy gets tested too. A judge can learn the rules in 10 minutes. The app already ships a claims class, so the new session can be compared with it. |
| Procurement | Good | Very close to the brief's invoice example, so it adds little new evidence. |
| KYC checks | Good | Strong guardrails, but almost every field is personal data, which makes the vision and redaction test noisy, and the rules are easy to state without judgment calls. |
| Support escalations | Weak | Rules are softer (tone, priority). Wrong decisions are harder to score as pass/fail. |

## 2. Hypotheses and pass criteria

| # | Apprentice Test question | Hypothesis | Pass if |
|---|---|---|---|
| H1 | When to ask | Sage stays silent while the expert types, reads or talks, and asks only at natural pauses. | ≥ 3 questions, every one asked at a pause (≥ 3 s with no screen change and the expert silent). 0 interruptions mid-typing or mid-sentence. |
| H2 | What to ask | Questions target reasons and guardrails, not what the screen already shows. | ≥ 1 question about a guardrail. ≥ 80 % of questions are about something visible on screen at that moment. |
| H3 | When it has understood | The debrief closes the gaps and ends with a teach-back the expert confirms. | ≥ 3 follow-up questions not answered during the task, plus a teach-back the expert confirms (with at most one correction). |
| H4 | Whether the new hire learned | The tutor teaches in the expert's words and catches a wrong decision on a case the expert never showed. | The tutor stops the learner before they set the status on **both** trap cases (N-2001, N-2002) and explains using the expert's reasoning. No false alarm on the control case (N-2003). |
| H5 | Trust | Off-the-record time leaves no trace, and personal data never reaches storage. | The off-record segment is absent from the timeline and transcript (only a gap marker). 0 unredacted emails, phones, IBANs or IDs in `server/data/*.json`. Names: report the rate (known limitation). |

## 3. Roles

| Role | Who | Sees |
|---|---|---|
| **Expert (E)** | A teammate playing a claims handler with 15 years' experience | The **expert briefing card** (§ 5) and the session claims (§ 6.1) |
| **New hire (N)** | Someone who has **not** seen the briefing card or the expert session | Only the Learn tab and the test claims (§ 6.2) |
| **Observer (O)** | Runs the checklist, times events and fills the log (§ 9) | Everything |

N must not be in the room during phases 1–2.

## 4. Setup (observer, before the session)

Run everything **locally**. On Vercel, sessions live in ephemeral storage and video uploads are capped at 4.5 MB.

1. **Presidio** on port 5002 (`presidio/README.md`). Check `curl http://127.0.0.1:5002/health` returns `ok: true`.
   Without it, the server falls back to a regex filter and H5 must be scored separately.
2. **Server:** put the keys in `server/.env`, plus `MCP_TOKEN` (the same value as in `key.env`). Then run `npm run dev` in `server/`.
3. **Web:** run `npm run dev` in `web/`, then open http://localhost:5173 in **Chrome or Edge**. Allow the microphone.
4. **Agent:** `node --env-file=key.env scripts/setup-agent.mjs` (prompt, client tools, Skip turn).
5. **MCP guardrails, reachable from ElevenLabs.** ElevenLabs must reach the server that holds the new session:
   - Enable MCP in the ElevenLabs workspace (*Add Custom MCP Server* → accept the terms, one time).
   - Expose the local server with a tunnel, for example `cloudflared tunnel --url http://localhost:3001`.
   - Run `MCP_URL=https://<tunnel-host>/api/mcp node --env-file=key.env scripts/setup-agent.mjs`.
   - After the experiment, re-run the script with `MCP_URL=https://sage-zeta-ten.vercel.app/api/mcp`.
6. **Screen to work on:** open `docs/experiment/claims-sandbox.xlsx`, sheet *Claims queue*, at zoom ≥ 125 % so the
   vision model can read field changes. Share only that window. Keep `claims-experiment-kit.xlsx` off screen.
7. **Clean slate:**
   - Delete earlier test sessions in `server/data/`.
   - In the browser console: `localStorage.removeItem("sage.progress")`.
   - Accept the privacy notice once, before the session, so it doesn't interrupt phase 1.
8. **Recording for evidence:** record the whole desktop and audio with OBS or similar. This recording is independent from
   Sage's and gives the observer an exact clock.

## 5. Expert briefing card (E only, do not show N)

You know these rules by heart. **Don't read them out.** Apply them while you work, and explain them in your own words
when Sage asks. Rules marked *unwritten* are judgment calls that no process document mentions.

| ID | Rule (guardrail) | Type |
|---|---|---|
| G1 | Under **€800**, with photos and a **sudden** cause: fast-track payout. Never send a field adjuster for these. | Limit |
| G2 | Over **€5,000**: always a field adjuster, and the **team lead signs off** before anything is approved. | Limit / stop and ask |
| G3 | *Unwritten:* **gradual** damage (damp, mould, a slow leak "for weeks") is excluded. **Sudden** escape of water or storm damage is covered. Read the description and photos for the words that give it away. C-1004 is the contrast case. | Judgment call |
| G4 | Reported **more than 30 days** after the incident: never reject it yourself for being late. Put it on hold and send it to the supervisor. | Exception / stop and ask |
| G5 | **3 or more claims** in 12 months: stop and refer to the fraud team (SIU) before any payout. *(No session claim reaches 3. Sage should find this gap in the debrief.)* | Stop and ask |
| G6 | **Payout IBAN holder ≠ policyholder:** never pay. Hold it and call the customer to verify. | Never |

**Think-aloud guidance:**
- Talk while you work, as you would to a colleague.
- Type at least one long handler note without speaking. This is the "don't interrupt while typing" test.
- At C-1003, after setting the Status, click **Off the record**, say something private
  ("let me check a message from my kid"), then resume. Do it *after* the IBAN check, so Sage can still ask about G6.

## 6. Fake data

### 6.1 Session claims (shown to E in phase 1)

Spreadsheet columns, left to right. E edits only the **last four**.

| Claim | Received | Incident | Policyholder | Policy | Description | Amount € | Photos | Prior claims (12 m) | Payout IBAN | IBAN holder | Category | Route | Status | Handler note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C-1001 | 28/09/2026 | 27/09/2026 | Lucía Ferrer Gil | NM-HOG-448120 | Washing-machine hose burst, kitchen floor soaked | 640 | 4 | 0 | ES91 2100 0418 4502 0005 1332 | Lucía Ferrer Gil | | | New | |
| C-1002 | 29/09/2026 | 26/09/2026 | Tomás Ibarra Ruiz | NM-HOG-117355 | Water through the bedroom ceiling after Saturday's storm; plaster fallen | 7,350 | 6 | 1 | ES79 2100 0813 6101 2345 6789 | Tomás Ibarra Ruiz | | | New | |
| C-1003 | 30/09/2026 | 18/08/2026 | Andrea Molina Sáez | NM-HOG-902614 | Bike stolen from the building's storage room | 1,180 | 1 | 2 | ES66 2100 0418 4012 3456 7891 | Rubén Castro Peña | | | New | |
| C-1004 | 01/10/2026 | 30/09/2026 | Pablo Ortega Lin | NM-HOG-330871 | Damp patch behind the bathroom wall, growing for several weeks; black mould on the skirting | 2,100 | 3 | 0 | ES39 2100 0418 4012 3456 7892 | Pablo Ortega Lin | | | New | |

Contact details, in a second tab. These give Presidio something to redact when E reads them out:

| Policyholder | Phone | Email | ID |
|---|---|---|---|
| Lucía Ferrer Gil | 612 345 678 | lucia.ferrer@example.com | 12345678Z |
| Tomás Ibarra Ruiz | 699 111 222 | t.ibarra@example.com | X1234567L |
| Andrea Molina Sáez | 655 987 654 | andrea.molina@example.com | 87654321X |
| Pablo Ortega Lin | 634 222 918 | pablo.ortega@example.com | 44556677L |

The new hire's policyholders (N-2001 to N-2004) have contact rows too, in the *Contacts* sheet of the sandbox.

**Expected expert decisions (observer's answer key):**

| Claim | Category | Route | Status | Rules exercised |
|---|---|---|---|---|
| C-1001 | Water damage (sudden) | Fast-track payout | Approved | G1, G3 |
| C-1002 | Water damage (storm) | Field adjuster | Pending lead sign-off | G2, G3 |
| C-1003 | Theft | Supervisor review | On hold | G4, G6 (G5 near miss: 2 prior claims) |
| C-1004 | Water damage (gradual) | Decline letter | Declined | G3 |

### 6.2 Test claims (shown to N in phase 3 only, never to E's session)

| Claim | Incident | Policyholder | Description | Amount € | Photos | Prior claims | IBAN holder | Trap | Correct decision | Rule |
|---|---|---|---|---|---|---|---|---|---|---|
| N-2001 | 01/10/2026 | Marta Quiles Ros | Roof leak after Tuesday's storm, ceiling stained in two rooms | 7,200 | 5 | 0 | Marta Quiles Ros | Looks like C-1001 ("water + photos"), so it's tempting to fast-track | Field adjuster, pending lead sign-off | G2 |
| N-2002 | 30/09/2026 | Iker Valdés Mora | Pipe under the sink burst overnight | 450 | 3 | 0 | **Nerea Valdés Mora** | Small and sudden, so fast-track seems right | Hold, call the customer | G6 |
| N-2003 | 02/10/2026 | Clara Benet Soler | Dishwasher hose came loose, floor wet | 390 | 3 | 0 | Clara Benet Soler | None (control case) | Fast-track payout, approved | G1 |
| N-2004 *(optional)* | 25/09/2026 | Hugo Prats León | Water heater failed, utility room flooded | 900 | 2 | **3** | Hugo Prats León | Seems routine | Refer to SIU first | G5, only teachable if the debrief captured it |

## 7. Procedure

### Phase 1: Capture (E, 10 min)

1. O starts the evidence recording. E opens **Teach → Start recording** and shares **the spreadsheet window**.
2. E processes C-1001 to C-1004 in order, following § 5. The kit sheet *What Sage should ask* lists, for each screen
   moment, whether Sage should ask, a good and a bad question, and the answer E gives.
3. O logs, with timestamps:
   - every screen action;
   - every question Sage asks, and whether it came at a pause;
   - any interruption while E was typing or talking;
   - the start and end of off the record.
4. E clicks **Save** when done.

### Phase 2: Map and debrief (E, 10 min)

1. Right after saving, E asks Sage out loud: *"What's still unclear? Ask me."* O counts the follow-up questions that were
   **not** answered during the task, for example the G5 threshold or who signs off.
2. E asks: *"Explain the whole process back to me."* E confirms or corrects it. O notes the corrections.
3. O opens **Teach → the new session** and checks the Work Map against the answer key:
   - steps detected;
   - decisions marked;
   - each guardrail linked to a screen moment and to E's own words.

### Phase 3: Teach (N, 20 min)

1. N opens **Learn**, says *"Teach me how to triage a water damage claim"* and lets Sage open the voice class. Check that
   Sage navigates by itself and moves the steps on screen (`show_step`).
2. After the class, N gets the test claims (§ 6.2) in the same spreadsheet layout.
3. **Before typing any Status**, N says the intended decision out loud, for example *"N-2001 is water with photos, I'll
   fast-track it."* The tutor has 10 seconds to react.
4. O records, per case:
   - whether the tutor intervened before the status was typed;
   - whether it cited the expert's reasoning and words;
   - whether the ElevenLabs conversation log shows a `search_guardrails` call.
5. To finish, N asks *"What have I mastered and what should I practice?"* O notes the answer.

### Phase 4: Trust audit (O, 10 min)

1. Open `server/data/<session>.json` and search for:
   - every phone, email, IBAN and ID from § 6.1 (expect **0** hits);
   - every policyholder name (count the hits; names are a known weak spot).
2. Check the timeline:
   - It has a `gap` item covering the off-record segment.
   - No transcript or screen event falls inside it.
   - Nothing said off the record appears anywhere.
3. Check that the session thumbnail is blurred and unreadable.

## 8. Metrics

| Metric | Measured by | Target |
|---|---|---|
| Live questions | Observer log | ≥ 3 (and ≤ 5 per 10 min by design) |
| Questions at a natural pause | Log plus evidence recording | 100 % |
| Interruptions while typing or talking | Log | 0 |
| Guardrail questions | Log | ≥ 1 |
| Questions about something on screen | Log | ≥ 80 % |
| Pause-to-question latency | Evidence recording | Median < 4 s after the pause starts |
| Screen-event recall | Detected events ÷ actual field changes (16 = 4 fields × 4 claims) | ≥ 75 % |
| Screen-event precision | Correct events ÷ detected events | ≥ 90 % |
| Debrief follow-ups | Log | ≥ 3 new questions |
| Teach-back | Expert confirmation | Confirmed, ≤ 1 correction |
| Guardrails captured in the Work Map | Compared with G1–G6 (G5 only via debrief) | ≥ 4 of 5 seen; each with screen moment and expert's words |
| Tutor catches | N-2001 and N-2002 | 2 of 2, before the status is typed |
| Tutor false alarms | N-2003 | 0 |
| Expert's reasoning used | Tutor quotes or paraphrases E's own explanation | Both catches |
| PII in storage | Search of the JSON | 0 phones, emails, IBANs or IDs. Names reported. |
| Off-record leakage | Timeline review | 0 |

## 9. Observer log template

```
Run: ____   Date: ____   Expert: ____   New hire: ____   Presidio up: Y/N   MCP via: tunnel / production / none

PHASE 1 — CAPTURE
mm:ss | screen action / speech            | Sage asked? (text)                     | at pause? | about screen? | guardrail?
------|-----------------------------------|----------------------------------------|-----------|---------------|-----------
      |                                   |                                        |           |               |
Interruptions while typing/talking: ____    Off record from ____ to ____

PHASE 2 — DEBRIEF
Follow-up questions (new):  1. ____  2. ____  3. ____
Teach-back confirmed? Y/N   Corrections: ____
Work Map: steps ____  decisions ____  guardrails ____ / G1 G2 G3 G4 G6 (+G5)

PHASE 3 — TEACH
Case   | N's stated decision | Tutor intervened before save? | Expert's words used? | search_guardrails called?
N-2001 |                     |                               |                      |
N-2002 |                     |                               |                      |
N-2003 |                     | (should NOT)                  |                      |
N-2004 |                     |                               |                      |
Mastered / practice next (tutor's answer): ____

PHASE 4 — TRUST
Hits in JSON → phones __ emails __ IBANs __ IDs __ names __    Off-record leakage: Y/N    Thumbnail readable: Y/N
```

## 10. Known gaps this experiment will expose

Score these honestly. They are the current state of the build, not experiment failures.

| Gap | Effect on the experiment | Workaround used here |
|---|---|---|
| No dedicated spoken **debrief** step (the agent only mentions up to three unclear points at the end) | H3 is likely to fail | E prompts the debrief by voice (phase 2). Record whether Sage can do it unprompted. |
| The Work Map is built with a keyword heuristic, not an LLM | Guardrails worded without trigger words may be labelled as "reasons" | Score guardrail recall per rule; list the misses as Map-phase issues. |
| The tutor does **not watch the new hire's screen** | It can't see a wrong value being typed | Verbal protocol: N says each decision before typing it (phase 3, step 3). |
| Frames reach the vision model before redaction. Presidio filters what is *stored*, not what is *seen*. | Personal data in frames reaches the vision API | Fake data only. Report as a finding for H5. |
| Name detection depends on spaCy NER | Lower-case or unusual names can slip through | Report the name hit rate separately from the other personal data. |
| MCP has to reach the server that stores the session | The production MCP doesn't see local sessions | Tunnel (setup step 5). |

## 11. Results and decision

Copy this table into the run report:

| Hypothesis | Result (pass / partial / fail) | Evidence (log line, timestamp, file) |
|---|---|---|
| H1 When to ask | | |
| H2 What to ask | | |
| H3 When it has understood | | |
| H4 Whether the new hire learned | | |
| H5 Trust | | |

- **Ready for the demo** when H1, H2, H4 and H5 pass and H3 is at least partial.
- Run the experiment **twice**. In run 2, swap roles so the new hire has a different person. In both runs, check that the
  tutor catches N-2001 and N-2002, not just once.
