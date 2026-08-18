# Continuity Engine

> When a booked parking lot fails, ParkMitra records the issue, protects the
> booking, and ensures the case is handled instead of disappearing.

A booking-protection and incident-management workflow — not a prediction model.
It does five things:

1. **Protects capacity** when a user books.
2. **Tracks the booking lifecycle** from reservation to completion.
3. **Captures evidence** when something goes wrong.
4. **Creates accountability** for owner and admin review.
5. **Keeps availability reliable** by putting questionable lots under review.

## Files

| File | Responsibility |
| --- | --- |
| `continuity.states.ts` | Booking state machine + transition guards |
| `continuity.events.ts` | Append-only ledger (`ContinuityEvent`) |
| `continuity.reliability.ts` | Lot confidence / under-review scoring |
| `continuity.service.ts` | The engine: report, resolve, capacity, queries |
| `continuity.controller.ts` / `.routes.ts` | HTTP surface |

## Booking state machine

```
RESERVED ──► ACTIVE ──► COMPLETED
    │           │
    │           └────► DISPUTED
    ├────► CANCELLED
    ├────► EXPIRED
    └────► DISPUTED
```

`RESERVED` is the "space is held for you" state — what the engine spec calls
`CONFIRMED`. It kept its existing name because the database, API and UI already
shipped with it. There is no `PENDING`/`PAYMENT_FAILED` pair: bookings are not
paid up front, so a booking is either created or it failed to be created.

`DISPUTED` is **terminal by design**. Resolving a case updates the *report*,
never the booking, so the record of what the user experienced can never be
rewritten after the fact.

Every transition goes through `assertTransition`, which throws on an illegal
jump rather than silently corrupting history.

## Lot reliability

Confidence is a plain count of **unresolved serious reports** — trivial to
explain, impossible to drift:

| Open serious reports | Confidence | Lot status |
| --- | --- | --- |
| 0 | `HIGH` | `ACTIVE` |
| 1 | `MEDIUM` | `ACTIVE` (still bookable) |
| 2+ | `LOW` | `UNDER_REVIEW` |

A report is **serious** when it means the advertised availability was wrong
(`SPACE_UNAVAILABLE`, `LOT_FULL`, `LOT_CLOSED`, `MISLEADING_LISTING`,
`ACCESS_BLOCKED`). `OTHER` is `MINOR`: still filed, still reaches the owner,
but it never escalates a lot and never freezes a booking.

`UNDER_REVIEW` lots drop out of search and cannot take new bookings, because
`buildWhere` and `createBooking` both require `status === 'ACTIVE'`. Existing
bookings on the lot are **not** cancelled.

`recomputeLotReliability` is the single place this is decided, is idempotent,
and always runs under a `FOR UPDATE` row lock on the lot so two simultaneous
reports cannot both read a stale count.

## What happens when a user reports an issue

`POST /api/bookings/:id/report-issue` — one transaction, all-or-nothing:

1. Writes the report, tied to user + booking + lot + time + photo evidence.
2. Freezes the booking as `DISPUTED` (serious issues only).
3. Releases the held space back to the lot — the user never parked, and the lot
   must not also be short a space.
4. Re-scores the lot, pulling it from search if reports have piled up.

Capacity release is guarded (`availableSpaces < totalSpaces`) so a double
release can never invent a space that does not physically exist.

## Resolution and accountability

- Owners see reports on their lots and may **acknowledge** (`IN_REVIEW`) them.
- Owners **cannot close** a report, and cannot lift their own lot out of
  review — closing is what restores the lot's score, and the owner is the
  interested party.
- Admins close reports (`RESOLVED` / `REJECTED`), which recomputes the lot and
  is the only way it climbs back out of `UNDER_REVIEW`.

## The ledger

Every state change appends one `ContinuityEvent` row — never updated, never
deleted — recording the type, the before/after status, who did it, and why.
Events are always written inside the transaction that made the change, so an
event describing a rollback that never happened cannot exist.

This is what makes "your case did not disappear" checkable rather than a
promise: `GET /api/bookings/:id/timeline`.

## Endpoints

| Method | Path | Who |
| --- | --- | --- |
| `POST` | `/api/bookings/:id/report-issue` | booking owner |
| `GET` | `/api/bookings/:id/timeline` | booking owner, admin |
| `GET` | `/api/continuity/owner/reports` | owner, admin |
| `PATCH` | `/api/continuity/reports/:id` | owner (acknowledge), admin |
| `GET` | `/api/continuity/lots/:id/reliability` | lot owner, admin |
| `PATCH` | `/api/admin/complaints/:id/status` | admin (routes through the engine) |
| `POST` | `/api/uploads/evidence-signature` | any signed-in user |

## Tests

`tests/continuity.test.ts` covers booking protection, capacity accounting, the
state machine, the escalation thresholds, reinstatement, owner/admin
permissions, and the ledger.
