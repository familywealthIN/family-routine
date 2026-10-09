# Beta-blocking tickets — Routine Notes

Source: seven-day beta simulation, 16–22 Aug 2026 (account `grvpanchalus@gmail.com`).
Full report: https://claude.ai/code/artifact/3c467de2-fc9e-4ea2-81ff-c24f6c1d5dc2

These are the defects that must close before the AI-routine flow can be handed to
beta testers. Ordered by the sequence a tester hits them.

---

## 1. [Blocker] Month-period AI plan saves the goal but drops all 7 milestones

**Area:** AI routine builder · **Found:** setup day

The headline feature does not persist its timeline when the period is `This Month`.

**Repro**
1. Home → "Build your routine goals with AI" → **Goal** tab.
2. Set period to **This Month**. Enter a seven-day objective. Send.
3. AI returns "Generated Monthly Plan (7 items)" with seven dated entries.
4. Click **Save plan & timeline**.

**Expected:** one month goal + seven day-goal milestones on 16–22 Aug referencing it.
**Actual:** only the month goal is created. Zero milestones. Modal closes, no error, no toast.

**Evidence:** Goals page `Total Day Tasks 0`; Home TODAY empty on both 15 and 16 Aug;
none of the seven titles on the Milestones page; parent has no children. `apps/server`
logs seven rounds of tag work, so the loop runs — the items just never land.

**Key detail for the fix:** the identical flow with period = **Week** creates all seven
correctly. The bug is specific to the month period.

**Done when:** a month-period plan creates its milestones, and any save that cannot
create them fails loudly instead of silently.

---

## 2. [Critical] End agent never fires — no end-of-goal AI feedback exists

**Area:** Agents · **Found:** days 1–7

**Repro**
1. Configure an agent on a routine with both a start and an end URL.
2. Start it — badge reaches `AGENT LISTENING`.
3. Complete every day goal for that routine, on that day and on later days.
4. Complete the parent goal.

**Expected:** end event fires, agent reaches `finished`, user gets the closing analysis.
**Actual:** the end URL was never requested on any of the seven days. Agent sat on
`listening` from day 1 to the end.

**Impact:** the entire "AI efficiency feedback" proposition is unreachable. No completion
rate, consistency summary, completed-vs-skipped breakdown, milestone performance,
bottlenecks or recommendations — none of it runs.

**Done when:** completing the last outstanding day goal for a listening agent fires the
end event and moves the agent to `finished`.

---

## 3. [Critical] Goal marks itself complete with a milestone still unfinished

**Area:** Goal completion · **Found:** day 7

**Repro**
1. Create a week goal with seven daily milestones.
2. Complete six, leaving one mid-week day untouched.
3. Complete the final day's milestone.

**Expected:** goal stays open, or the user is told what is outstanding before it closes.
**Actual:** the parent goal becomes checked and struck through on its own. Never ticked
by the user. The missed day was never completed. Goal reports complete at 6/7.

**Done when:** completion is gated on the goal's criteria, and any auto-complete states
which criteria were met.

---

## 4. [Critical] AI plan entries are not milestones, so milestone tracking reads zero

**Area:** Milestones / Progress · **Found:** day 5

The plan-review pane states: *"all timeline entries will be milestones referencing the
plan title."* They are saved as ordinary day goals.

**Evidence** with four of seven plan days complete:
- Progress → Task and Activities Completed → `Milestones 0/1`
- `/goals/milestones` → day Goals lists none of the seven titles
- `/goals/milestones` → week Goals omits the parent goal entirely
- the goal-item editor exposes no control to mark an item as a milestone, so the user
  cannot correct it manually either

**Done when:** plan entries are stored as milestones, milestone counters reflect them,
and they appear on the Milestones page.

---

## 5. [Major] An agent can only ever be started once per routine item

**Area:** Agents · **Found:** days 1 and 7

**Actual:** day 1's start succeeded and debited 15 diamonds. Day 7's start failed with a
red toast — *"Could not redeem this task. Please try again."* No debit, agent unchanged.

**Cause:** the routine-item document carries `redeemed: true`, and routine items are one
shared document reused across every day — so the flag set on 16 Aug is still true on
22 Aug. A "daily" agent runs exactly one day, then errors permanently.

**Also:** the message says "redeem this task", which does not match the button the user
pressed (**Start agent**), so the failure is unreadable.

**Done when:** the redeem/started flag is scoped per day, and the error names the action
that failed.

---

## 6. [Major] The Skip Day switch does nothing

**Area:** Dashboard · **Found:** day 4

**Repro:** open Home on any day, click the **Skip Day** switch.

**Actual:** nothing. The input stays `checked: false` and is not disabled; no visual
change, no GraphQL request, no console error. Goal checkboxes respond correctly to the
identical interaction in the same session, so this is specific to Skip Day.

**Done when:** the switch either works or is removed.

---

## 7. [Major] No way to skip, delay or defer a single task

**Area:** Goal item · **Found:** day 4

**Actual:** the item editor offers title, tags, description and sub-tasks, plus a
read-only status chip. There is no skip, delay, snooze, move-to-tomorrow or mark-missed
action. The only ways off today's list are to complete the item or delete it — and
deleting destroys the record instead of recording a miss.

Compounded by the Date field being disabled in the same dialog (see candidate D-08),
so the item cannot be moved to another day either.

**Why it's beta-blocking:** real users miss days constantly. This is the path the
product currently handles worst, and it has no workaround.

**Done when:** a task can be deferred or marked missed without destroying it.

---

# Candidates — recommend adding, your call

Not in the blocking set in the report, but each was hit during normal use and each
undermines trust in the data:

| Ref | Severity | Summary |
|-----|----------|---------|
| D-08 | Major | Goal item cannot be rescheduled or moved — Date, Routine task and Goal task fields are all disabled |
| D-10 | Major | An unreachable API renders as "You don't have any goals" rather than an error — looks exactly like data loss |
| D-12 | Major | End-of-goal state is not represented: the parent goal is a bare checkbox with no progress, no remaining items, no criteria |
| D-13 | Major | Routine Efficiency reads 15% on Progress and 6% on History at the same instant, with no formula shown |

The remaining 17 defects in the report are ordinary polish and can ship as a backlog
epic rather than beta blockers.
