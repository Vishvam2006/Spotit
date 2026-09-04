# The Continuity Engine — Developer & Hackathon Guide

> "When a booked parking lot fails, Spotit records the issue, protects the
> booking, and ensures the case is handled instead of disappearing."

This document explains **how the Continuity Engine actually works**, file by
file, decision by decision — written so a developer who has never opened the
code can understand it, and so a hackathon team can defend every design
choice under questioning. It complements (doesn't replace) the terse
in-repo README at
[`backend/src/modules/continuity/README.md`](../backend/src/modules/continuity/README.md).

---

## 1. The problem it solves

ParkMitra (Spotit) lets a driver reserve a parking bay ahead of time. The
promise is simple — "this space will be there when you arrive" — but real
parking lots break that promise constantly: another car is in the bay, the
lot is full despite what the app says, the gate is locked, the listing lied
about the address.

Most apps handle this badly in one of two ways:

- **Silently cancel the booking.** The user loses their record, their
  evidence, and any leverage to get a refund or a resolution.
- **Log a support ticket nobody looks at.** The booking still shows
  "confirmed," so the system keeps recommending a lot that just failed
  someone.

The Continuity Engine is ParkMitra's answer to both failure modes. It is
**not** a machine-learning prediction system, and it doesn't try to guess
whether a lot *will* have space. It is a **booking-protection and
incident-management workflow** that:

1. **Protects capacity** the moment a user books (a space is held, not just
   promised).
2. **Tracks the booking lifecycle** with a strict, enforced state machine.
3. **Captures evidence** the instant something goes wrong (photos, GPS,
   timestamps, who was affected).
4. **Creates accountability** by routing the evidence to the lot owner and,
   for serious issues, an admin.
5. **Keeps search results honest** by automatically pulling unreliable lots
   out of circulation — and putting them back the moment they've earned it.

The name matters: the engine's job is *continuity* — making sure that once a
user's experience goes wrong, the **case continues to exist and move
forward** instead of vanishing.

---

## 2. Where the code lives

```
backend/src/modules/continuity/
├── continuity.states.ts        # Booking state machine + transition guards
├── continuity.events.ts        # Append-only audit ledger (ContinuityEvent)
├── continuity.reliability.ts   # Lot confidence / under-review scoring
├── continuity.service.ts       # The engine itself: report, resolve, capacity, queries
├── continuity.controller.ts    # HTTP handlers
├── continuity.routes.ts        # Owner/admin-facing routes
└── continuity.validation.ts    # Zod input schemas

backend/src/services/sessionSweeper.ts   # Background job: expiry & auto-checkout
backend/prisma/schema.prisma             # Booking, ParkingLot, Complaint, ContinuityEvent models

frontend/src/types/continuity.ts         # Shared TS types (mirrors backend enums)
frontend/src/services/continuity.ts      # API client (report, timeline, reliability, evidence upload)
frontend/src/utils/continuity.ts         # Copy, labels, confidence explanations
frontend/src/components/continuity/      # UI: ReportIssueForm, ReportLotModal, ConfidenceBadge,
                                          #     BookingTimeline, LotReliabilityPanel, OwnerReportsPanel

backend/tests/continuity.test.ts         # Unit-level coverage of every rule
backend/tests/demo-loop.test.ts          # One end-to-end story, exactly as it's demoed
```

Two halves worth noticing:

- The **user-facing half** (report an issue, view a booking's timeline)
  hangs off `/api/bookings/:id/...`, next to the booking those actions act
  on.
- The **owner/admin-facing half** (see reports, resolve them, check a lot's
  reliability) lives under `/api/continuity/...`.

---

## 3. The data model

Four tables carry the whole engine. Understanding these first makes every
function below obvious.

```
Booking ──────────┐
  status           │  RESERVED / ACTIVE / COMPLETED / CANCELLED / EXPIRED / DISPUTED
  parkingLotId ─────┼──► ParkingLot
                    │      status                 ACTIVE / INACTIVE / CLOSED / UNDER_REVIEW
                    │      availableSpaces         a plain counter
                    │      availabilityConfidence  HIGH / MEDIUM / LOW / UNDER_REVIEW
                    │      underReviewSince         when the engine escalated it
                    │      statusBeforeReview       what to restore on reinstatement
                    │
Complaint ("report")│
  bookingId ────────┘  nullable — a report can also be filed with no booking
  parkingLotId          (a driver standing at the lot, reporting directly)
  issueType              SPACE_UNAVAILABLE / LOT_FULL / LOT_CLOSED /
                          MISLEADING_LISTING / ACCESS_BLOCKED / OTHER
  severity                SERIOUS or MINOR — derived from issueType
  status                  PENDING / IN_REVIEW / RESOLVED / REJECTED
  photos[]                Cloudinary URLs, evidence

ContinuityEvent ("the ledger")
  type            one of 14 event kinds (see §7)
  bookingId / parkingLotId / complaintId   what this event is about
  actorId / actorRole                       who did it (null = the engine itself)
  fromStatus / toStatus                     the transition, in plain strings
  reason                                     human-readable explanation
  metadata                                   structured extra data (JSON)
  createdAt                                  never updated, never deleted
```

Everything the engine does is one of: **update a Booking's status**,
**create a Complaint**, **update a ParkingLot's status/confidence**, or
**append a ContinuityEvent**. There is no fifth kind of side effect.

---

## 4. The booking state machine

```
RESERVED ──► ACTIVE ──► COMPLETED
    │           │
    │           └──────► DISPUTED
    ├──────► CANCELLED
    ├──────► EXPIRED
    └──────► DISPUTED
```

Defined as a lookup table in `continuity.states.ts`:

```ts
const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  RESERVED: ['ACTIVE', 'CANCELLED', 'EXPIRED', 'DISPUTED'],
  ACTIVE: ['COMPLETED', 'DISPUTED'],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
  DISPUTED: [],
};
```

Every transition anywhere in the codebase goes through `assertTransition()`,
which **throws a 409** on an illegal jump (e.g. `COMPLETED → ACTIVE`) instead
of silently corrupting history. This is the single biggest reason the ledger
can be trusted: a bad transition simply cannot happen, so there's never an
event describing something that shouldn't have occurred.

Two design choices worth knowing cold, because they're the first thing a
reviewer will ask about:

- **Why is the "space held for you" state called `RESERVED` and not
  `CONFIRMED`?** The engine's abstract spec calls it `CONFIRMED`, but Spotit
  already shipped `RESERVED` everywhere — the database, the API, the UI. The
  team renamed the *concept* to match the *codebase*, not the other way
  around, so nothing downstream had to change.
- **Why is there no `PENDING` / `PAYMENT_FAILED` pair?** Bookings in Spotit
  aren't paid for up front. A booking either gets created (and immediately
  holds a space) or it fails to be created at all — there's no in-between
  state to represent.

`DISPUTED` is **terminal by design** — there is no transition out of it.
Once a booking is frozen as evidence, it stays that way forever. Resolving
the underlying report changes the *report's* status, never the booking's.
That's the whole point: the record of what the user actually experienced
must never be rewritable after the fact, even by an admin who later decides
the report was unfounded.

---

## 5. Lot reliability: how "confidence" is computed

This is the part most likely to get an "isn't this just an ML model?"
question — it's the opposite, deliberately.

```
Open serious reports   Confidence   Lot status
───────────────────────────────────────────────
0                       HIGH         ACTIVE
1                       MEDIUM       ACTIVE (still bookable)
2+                      LOW          UNDER_REVIEW (pulled from search)
```

- **"Serious"** means the report claims the advertised availability was
  wrong: `SPACE_UNAVAILABLE`, `LOT_FULL`, `LOT_CLOSED`, `MISLEADING_LISTING`,
  `ACCESS_BLOCKED`. These are the only things that can cost a lot its score.
- **`OTHER`** is `MINOR` — a dirty lot, a rude attendant. Still filed, still
  routed to the owner, but it never escalates the lot and never freezes a
  booking, because it doesn't make `availableSpaces` a lie.
- **The threshold (default 2)** is a config value
  (`UNDER_REVIEW_THRESHOLD` env var), not a hardcoded fact — because the
  "right" number is a policy call (a dense city might want a lower bar), not
  something a model should learn.

Confidence is a **plain, unweighted count of currently-open serious
reports** — no decay, no recency weighting, no per-user trust score. That's
intentional: it's the kind of number you can explain to a user, an owner,
and (per the code comments) "a judge" in one sentence, and it can never
silently drift out of sync with what actually happened.

### `recomputeLotReliability` — the single source of truth

Every path that could change a lot's standing — a new report, a report
being closed, an owner editing their listing, an admin changing a lot's
status — funnels through **one function**:
`recomputeLotReliability(tx, parkingLotId, options)` in
`continuity.reliability.ts`. It:

1. Reads the lot's current status/confidence.
2. Counts open serious reports (`status IN (PENDING, IN_REVIEW)`).
3. Derives the new confidence level and whether the lot *should* be under
   review.
4. Diffs against the current row and only writes what actually changed.
5. Writes a `ContinuityEvent` for each change (`LOT_CONFIDENCE_CHANGED`,
   `LOT_UNDER_REVIEW`, or `LOT_REINSTATED`).

It's **idempotent** — running it twice with nothing new changes nothing —
and it must always be called **inside a transaction that already holds a
`SELECT ... FOR UPDATE` row lock on the lot**, so two reports landing at the
same instant can't both read "1 open report" and leave the lot one
escalation short of where it should be.

Two guard rules prevent the engine from stepping on an owner's own
decisions:

- **Only an `ACTIVE` lot can be escalated** (`isEscalatable`). If the owner
  already marked it `INACTIVE` or `CLOSED`, the engine leaves it alone —
  there's no user to protect from a lot that isn't listed anyway, and
  overwriting it would erase the owner's intent.
- **Reinstatement restores `statusBeforeReview`, not a hardcoded `ACTIVE`.**
  The engine remembers exactly what the lot's status was the moment it
  escalated, so a lot can never come back from review *more* visible than
  the owner had left it.

---

## 6. What happens when a user reports an issue — step by step

`POST /api/bookings/:id/report-issue` — everything below runs inside **one
Prisma transaction**, so it's all-or-nothing:

1. **Lock the lot** (`SELECT ... FOR UPDATE`) before reading any report
   counts — the concurrency guard from §5.
2. **Check for a duplicate open report** from the same user on the same
   booking. If found, throw a 409 ("You already have an open report… we are
   on it.") — checked *before* the state-machine guard, so a second report
   attempt on an already-`DISPUTED` booking reads as "you already told us,"
   not as a confusing state error.
3. **Check the booking is reportable** (`isReportable`) — `RESERVED`,
   `ACTIVE`, `COMPLETED`, or `EXPIRED` all qualify. `CANCELLED` and
   `DISPUTED` do not.
4. **Create the `Complaint` row**, always tying it to `booking.parkingLotId`
   read from the database — **never** trusting a lot ID sent in the
   request, so a report can never be pinned on a lot the user didn't
   actually book.
5. **Record `ISSUE_REPORTED`** on the ledger.
6. **If the report is `SERIOUS` and the booking is still disputable**
   (`RESERVED`/`ACTIVE`):
   - `assertTransition` to `DISPUTED`.
   - Update the booking with an **optimistic-concurrency guard**:
     `updateMany({ where: { id, userId, status: booking.status }, ... })`.
     If the row count returned isn't exactly 1, the booking moved underneath
     us (checked in, expired, swept) between the read and the write — the
     whole transaction is aborted rather than filing a report that claims
     to have protected a booking it didn't.
   - Record `BOOKING_DISPUTED`.
   - **Release the held capacity** back to the lot (`releaseCapacity`),
     since the user never actually parked. Record `CAPACITY_RELEASED`.
7. **If the report is `MINOR`, or the booking is already `COMPLETED` /
   `EXPIRED`**: nothing is frozen — a `MINOR` note shouldn't tear down a
   session that's working fine, and a session that's already over has
   nothing left to protect (rewriting its status would erase the record of
   what actually happened). The report is still filed and the lot is still
   re-scored — **reporting late still costs the lot its standing.**
8. **`recomputeLotReliability`** — the lot re-scores itself, possibly
   dropping out of search.

### Capacity release can't invent spaces

`releaseCapacity` is written as a single guarded SQL statement, not a
read-then-write:

```sql
UPDATE "ParkingLot"
   SET "availableSpaces" = "availableSpaces" + 1
 WHERE id = ${parkingLotId}
   AND "availableSpaces" < "totalSpaces"
```

The `WHERE availableSpaces < totalSpaces` clause means a double release —
say, two race conditions both trying to free the same space — can never
push `availableSpaces` past `totalSpaces`. That failure mode (a lot showing
more available spaces than it physically has) is exactly what this whole
engine exists to prevent, so the code that could cause it is guarded at the
SQL level, not just the application level.

---

## 7. Resolution and accountability — who can do what

| Actor | Can do |
| --- | --- |
| **User** | File a report on their own booking, or directly on a lot they're standing at (geofenced, see below). View their own booking's timeline. |
| **Owner** | See all reports filed against *their* lots. **Acknowledge** a report (moves it to `IN_REVIEW`). Cannot close a report. Cannot lift their own lot out of review. |
| **Admin** | Close reports — `RESOLVED` or `REJECTED`. This is the *only* action that lowers the open-serious count, so it's the only thing that lets a lot climb back out of `UNDER_REVIEW`. |

The owner restriction is deliberate and worth stating plainly in a demo: an
owner acknowledging their own report and then closing it would let them
restore their own lot's trust score unilaterally — the review would mean
nothing. So `resolveReport` explicitly checks `actorRole === 'OWNER'` and
throws a 403 if they try to set anything other than `IN_REVIEW`.

**Resolving a report never touches the booking.** A `DISPUTED` booking
stays `DISPUTED` forever, whatever the report's final status becomes —
that's what makes it trustworthy as a historical record. What resolution
*does* change is the lot: clearing the report is what lets
`recomputeLotReliability` bring the lot's confidence back up.

### Direct lot reporting (no booking required)

`POST /api/continuity/lots/:id/report` lets a driver standing at a lot
report it even if they never booked through the app. To stop this becoming
a spam/sabotage vector (a competitor filing fake reports against a rival
lot from across town), it requires the user's live GPS coordinates and
rejects the report if they're more than **200 metres** from the lot
(Haversine distance check against the lot's stored lat/lng). It's also rate
limited (`reportRateLimiter` middleware) and subject to the same
one-open-report-per-user guard as booking-based reports.

---

## 8. The ledger: why the "case can't disappear" claim is checkable

Every state change — a report filed, a booking disputed, capacity released,
a lot's confidence changing, a lot going under review or being reinstated —
appends **one row** to `ContinuityEvent`. Rows are:

- **Never updated.**
- **Never deleted.**
- **Always written inside the same transaction** as the change they
  describe, so an event describing a rollback that never happened cannot
  exist — either both commit or neither does.

The 14 event types (`ContinuityEventType` enum) cover the whole life of a
booking, not just the failure path: `BOOKING_CREATED`, `CAPACITY_HELD`,
`CAPACITY_RELEASED`, `CHECKED_IN`, `CHECKED_OUT`, `BOOKING_CANCELLED`,
`BOOKING_EXPIRED`, `BOOKING_DISPUTED`, `ISSUE_REPORTED`,
`REPORT_STATUS_CHANGED`, `LOT_CONFIDENCE_CHANGED`, `LOT_UNDER_REVIEW`,
`LOT_REINSTATED`, `LOT_DEACTIVATED`.

`GET /api/bookings/:id/timeline` returns this list, oldest first, and it's
what the frontend's `BookingTimeline.tsx` component renders as a vertical
history — this is the UI surface that turns "your case didn't disappear"
from a marketing promise into something a user can literally scroll through
and verify. Even the background sweeper (`sessionSweeper.ts`, which expires
stale `RESERVED` bookings and auto-completes finished sessions) writes to
the same ledger with `actorId: null` — meaning "the engine did this on its
own," not a person.

---

## 9. Concurrency and correctness — the guarantees that matter under load

| Risk | How it's prevented |
| --- | --- |
| Two reports on the same lot both read "1 open report" and neither escalates it | `SELECT ... FOR UPDATE` locks the lot row before any count is read, inside the same transaction that will write the new count. |
| A booking's status changes between when the report handler reads it and writes `DISPUTED` | Optimistic concurrency: the update includes `WHERE status = <status just read>`; if 0 rows are affected, the whole transaction throws instead of lying about what it did. |
| A double capacity release invents a space that doesn't exist | The `UPDATE ... WHERE availableSpaces < totalSpaces` guard makes it structurally impossible, not just unlikely. |
| A report gets created but the booking-dispute or lot-recompute steps fail | All of it — report, dispute, capacity release, recompute, and every ledger row — is one Prisma `$transaction`. Partial failure is not a state the database can be left in. |
| An illegal state transition slips through | `assertTransition` is the single choke point every transition passes through; it throws rather than returning a boolean, so a caller can't accidentally ignore a `false`. |
| A lot's status and its report counts drift apart over time | Every path that could change either one — new report, resolved report, owner edits listing, admin changes lot status — calls the same `recomputeLotReliability`, so there is only one place the answer is computed. |

---

## 10. Frontend integration

- **`frontend/src/types/continuity.ts`** mirrors the backend Prisma enums by
  hand (not code-generated) — `IssueType`, `IssueSeverity`,
  `AvailabilityConfidence`, `ContinuityEventType`. Keep these in sync
  manually when the backend enum changes.
- **`frontend/src/services/continuity.ts`** is the only place that calls the
  continuity HTTP endpoints. Notably, `uploadEvidencePhoto` uploads directly
  to Cloudinary from the browser using a short-lived signed upload slot
  fetched from the backend (`/api/uploads/evidence-signature`) — the image
  bytes never pass through the Spotit server, and the Cloudinary API secret
  never leaves it.
- **`frontend/src/utils/continuity.ts`** centralizes all user-facing copy:
  the issue-type picker options (ordered so the most common real failure —
  "my bay was taken" — is the first tap), the confidence badge text/colors,
  and the plain-language label for every ledger event type. Centralizing
  copy here means the UI can never show a confidence badge whose text
  contradicts what the backend actually computed.
- **Key components**: `ReportIssueForm` / `ReportLotModal` (filing a
  report), `ConfidenceBadge` (the HIGH/MEDIUM/LOW/UNDER_REVIEW pill shown on
  every lot card), `BookingTimeline` (the ledger, rendered), 
  `LotReliabilityPanel` / `OwnerReportsPanel` (the owner-facing dashboard).

---

## 11. Testing strategy

Two test files, two different jobs:

- **`backend/tests/continuity.test.ts`** (~590 lines) — unit-level coverage
  of every individual rule in isolation: booking protection, capacity
  accounting (including the "can't overshoot totalSpaces" guard), the state
  machine's illegal transitions, the exact escalation thresholds,
  reinstatement, owner-vs-admin permissions, and the ledger contents.
- **`backend/tests/demo-loop.test.ts`** — one single story, walked
  end-to-end over real HTTP calls exactly as it's presented in a demo:
  *driver books → driver reports with photo evidence → booking `DISPUTED` →
  lot confidence falls → admin sees the complaint, the evidence, and the
  timeline → admin resolves → lot is re-scored.* Its own comment explains
  why it exists despite the overlap: the per-step rules already have close
  unit coverage, but this file protects **the seams between steps** — that
  each stage hands the next one exactly the data it needs, through the real
  endpoints the UI calls. A regression here breaks the live demo even when
  every individual rule still passes.

---

## 12. Design decisions worth defending out loud

A few choices that look arbitrary until you know the reasoning — good to
have ready if someone pushes back:

- **Why a plain count instead of a weighted/decayed trust score?** Explored
  in §5 — explainability and non-drift beat statistical sophistication for
  a system whose output someone might dispute or appeal.
- **Why is `DISPUTED` terminal with no way out?** So that "what the user
  experienced" can never be silently rewritten by a later resolution — the
  report's outcome is a separate fact from the booking's history.
- **Why funnel every reliability change through one function
  (`recomputeLotReliability`) instead of updating the lot inline wherever a
  report changes?** Because with N different call sites each doing their
  own arithmetic, it's only a matter of time before two of them disagree.
  One function, called from every path, means the lot's status is always a
  pure function of its open report count — never stale, never drifted.
- **Why lock the lot row before reading report counts, rather than just
  trusting the transaction isolation level?** Postgres's default
  `READ COMMITTED` isolation would let two concurrent reports both read "1
  open report" and both decide "I'm not the one that tips it to 2" — an
  explicit `FOR UPDATE` closes that race deterministically instead of
  relying on isolation-level guarantees that don't cover this case.
- **Why can owners acknowledge but never close a report?** Conflict of
  interest — closing a report is literally the action that restores the
  reporting-lot's own trust score. Letting the accused close their own case
  defeats the purpose of having a review step at all.

---

## Hackathon Q&A — practice set

Use these to rehearse. Answers are deliberately short — expand in your own
words during practice, but the core claim in each answer is the one to keep.

### Concept / product framing

**Q: Is this an AI or ML feature?**
A: No. It's a deterministic, rule-based state machine and a plain-count
scoring formula. Nothing here is trained or predicted — every number is
computable by hand from the data in front of you, which is deliberate: it
has to be explainable to a user, an owner, and an admin adjudicating a
dispute.

**Q: What's the actual user-facing problem this solves?**
A: A driver reserves a bay, arrives, and it's not there. Without this
engine, the booking either silently cancels (losing the user's evidence and
leverage) or sits as an ignored support ticket while the lot keeps getting
recommended to the next driver. This engine freezes the booking as proof,
routes it to someone accountable, and pulls the lot from search until it's
resolved.

**Q: Why "Continuity Engine" and not "Dispute System" or "Trust Score"?**
A: The name describes the guarantee, not the mechanism: once something goes
wrong, the case *continues* to exist and move forward instead of vanishing.
"Trust score" undersells the booking-protection half; "dispute system"
undersells the fact that most of the code is about capacity and state
integrity, not adjudication.

### Architecture / data flow

**Q: Walk me through what happens, end to end, when a user taps "report an
issue."**
A: See §6 — one transaction: lock the lot, check for a duplicate report,
check the booking is reportable, create the Complaint, and — if it's a
serious report on a still-live booking — dispute the booking with an
optimistic-concurrency guard, release its held capacity, and recompute the
lot's reliability. Every step writes a ledger row. All-or-nothing.

**Q: What's the single "source of truth" function in this system, and why
does it matter that there's only one?**
A: `recomputeLotReliability` in `continuity.reliability.ts`. It's the only
place a lot's confidence and under-review status are ever decided, and
every caller — a new report, a resolved report, an owner's listing edit, an
admin's status change — routes through it. That guarantees the lot's status
can never drift out of sync with its actual report count, because there's
no second code path that could compute a different answer.

**Q: Why is the booking-report endpoint under `/api/bookings/:id/...` but
the reliability/resolution endpoints are under `/api/continuity/...`?**
A: The user-facing actions (report an issue, view your booking's history)
live next to the booking resource they act on. The owner/admin-facing
actions (see all reports on your lots, resolve a report, check a lot's
score) are a distinct surface with different auth (`requireOwner`), so they
get their own router.

### Data model / state machine

**Q: Why does `DISPUTED` have no outgoing transitions?**
A: It's the historical record of what a user actually experienced. If
resolving the report could also move the booking (e.g. back to `ACTIVE`),
you could end up "fixing" the record of an incident that genuinely
happened. Resolution changes the *report's* status; the booking stays
frozen forever.

**Q: A booking is `COMPLETED` and a week later the driver reports the lot
was closed that day. What happens?**
A: The report is filed and counted normally — it can still escalate the
lot — but the booking itself is **not** touched, because `isDisputable`
only allows `RESERVED`/`ACTIVE` bookings to be frozen. The session already
happened; overwriting a completed booking's status would erase the record
of what actually occurred. "Reporting late still costs the lot its
standing" is the intended behavior, not a gap.

**Q: What stops a user from filing the same report twice to force a lot
under review faster?**
A: An explicit duplicate-check: before creating a new report, the service
looks for an existing `PENDING`/`IN_REVIEW` report from the same user on
the same booking (or same lot, for direct reports) and rejects with a 409
if one exists.

### Concurrency / correctness (the deep-dive questions)

**Q: Two users report the same lot within the same millisecond. Walk me
through exactly why the lot doesn't end up under-counted.**
A: Both transactions try to `SELECT ... FOR UPDATE` the lot row first.
Postgres serializes them — the second transaction blocks until the first
commits. So the second report's count query only runs after the first
report's write has landed, meaning it always sees the up-to-date count. Without
the lock, both could read "0 open serious reports" under `READ COMMITTED`
and both decide independently that they're not the one tipping the lot into
review.

**Q: Can `availableSpaces` ever exceed `totalSpaces`?**
A: No — `releaseCapacity` is a single guarded UPDATE
(`WHERE availableSpaces < totalSpaces`), not a read-then-increment. Even if
two release paths somehow both fire for the same held space, the second
one's WHERE clause simply matches zero rows once the first has already
incremented past the ceiling in practice (the real guard is per-booking:
each booking's capacity is only ever released once, via the state-machine
transition checks — but the SQL-level guard is the last line of defense
regardless of how that invariant might be violated upstream).

**Q: What happens if the database write to dispute the booking succeeds but
the app crashes before the capacity is released?**
A: It can't happen mid-way — both writes are inside the same
`prisma.$transaction`. Either the whole set of writes (report, dispute,
capacity release, recompute, all ledger rows) commits, or none of it does.
A crash mid-transaction leaves nothing on disk.

**Q: Why check `updateMany(...).count !== 1` after disputing the booking
instead of just trusting the earlier read?**
A: Between reading the booking's status and writing `DISPUTED`, something
else could have changed it — a check-in, an auto-expiry from the sweeper.
The update's `WHERE` clause repeats the exact status just read, so if
anything moved the booking in between, zero rows match and the count comes
back 0. The code treats that as a hard failure and aborts the whole
transaction rather than silently reporting success on a booking it didn't
actually protect.

### Security / abuse resistance

**Q: What stops someone from reporting a competitor's lot from across
town?**
A: Direct lot reports (filed without a booking) require the reporter's live
GPS coordinates and are rejected if they're more than 200 metres from the
lot (Haversine distance check server-side against the lot's stored
lat/lng), plus rate limiting and the duplicate-report guard.

**Q: Can a lot owner make their own lot's bad reviews disappear?**
A: No — owners can acknowledge a report (`IN_REVIEW`) but the resolve
endpoint explicitly 403s if an owner tries to set any other status. Only an
admin can close a report (`RESOLVED`/`REJECTED`), and closing is the only
action that lowers a lot's open-serious count.

**Q: Evidence photos — where do they actually live, and does the backend
ever see them?**
A: They're uploaded straight from the browser to Cloudinary using a
short-lived signed upload slot the backend issues
(`POST /api/uploads/evidence-signature`). The image bytes never transit the
Spotit server, and the Cloudinary API secret never leaves it — the backend
only ever stores the resulting secure URL.

### "What would you do differently" / roadmap questions

**Q: What's the biggest limitation of a plain-count scoring model?**
A: It doesn't weight by recency or volume — one open report on a lot with
2 bookings a week hits exactly as hard as one open report on a lot with 200
bookings a week, even though the second is statistically far less
concerning. That's a deliberate trade for explainability today; a
volume-normalized rate would be the natural next iteration if false
escalations became a real problem.

**Q: If you had another day, what would you add?**
A: Reasonable answers: (1) a rate/volume-normalized confidence score behind
a feature flag, keeping the plain count as the explainable default; (2)
push notifications to the owner the moment a serious report lands, instead
of them having to check the dashboard; (3) an appeal path for an owner who
believes a report was filed in bad faith, distinct from the admin-only
resolve flow. Pick one and be ready to explain why it's next, not the other
two.

**Q: Does this scale to thousands of concurrent reports on the same
lot?**
A: The `FOR UPDATE` row lock means reports against the *same* lot serialize
— that's intentional correctness, not an oversight, and it's a per-lot
bottleneck, not a global one, so it doesn't limit overall system
throughput. Reports against different lots proceed fully in parallel.
