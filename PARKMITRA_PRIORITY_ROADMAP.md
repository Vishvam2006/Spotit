# ParkMitra Priority Roadmap

## 1. Strategic Focus

ParkMitra is not only a parking reservation app. Its differentiator is the Continuity Engine: a workflow that captures evidence when parking fails, protects booking records, maintains accurate capacity, recalculates lot reliability, and gives admins an accountable resolution process.

Before the demo, prioritize visible trust, reliable booking integrity, and one complete driver-to-admin resolution flow. Do not expand into unrelated features.

## 2. Demo-Critical Priorities

| Area | Demo-Critical Task | Why It Matters | Visible Demo Outcome | Completion Check |
|---|---|---|---|---|
| Parking Discovery | Confidence badge on every parking card | Visual trust indicator | High/Medium/Low colour-coded chips | Confidence badge appears on Home, Explore, and Parking Details cards. |
| Parking Discovery | Hide or grey out UNDER_REVIEW lots | Prevent booking broken lots | Lots greyed out with explicit reason label | UNDER_REVIEW lots cannot be booked and show warning. |
| Parking Lot Details | Reliability banner at top | User awareness | Banner with confidence and explanation | Banner is visible on the details page. |
| Parking Lot Details | UNDER_REVIEW warning state | Block untrusted bookings | Book button is disabled with warning | Book button cannot be clicked. |
| AI Document Verification | Freeze it | Focus on core demo | Verification works as-is | Drivers can verify documents successfully. |
| Booking Lifecycle | Show state machine in UI | Clear user feedback | Progress strip: Reserved → Active → Completed | UI shows accurate booking state transitions. |
| Capacity Integrity | Route every release path through `releaseCapacity()` | Prevent capacity corruption | Accurate lot availability | No capacity path can exceed totalSpaces. |
| Geofence Check-In/Out | Visible DEMO_MODE indicator | Explain bypassed GPS rules | DEMO_MODE badge visible to judges | DEMO_MODE is visibly labeled when active. |
| Owner Lot Management | Clear 409 message when editing UNDER_REVIEW lot | Clear error state for owners | Explains why edit is forbidden | 409 response shows understandable reason. |
| Owner Dashboard | Add a reliability tile | Owner awareness | Confidence score front and centre | Owners see their lot's confidence score. |
| Admin Complaints | Single-screen detail view | Efficient resolution | Evidence, context, severity, timeline in one view | Admin sees all details without tab-hunting. |
| Admin Complaints | Show reliability delta before resolving | Inform admin consequences | Delta visible before clicking | Admin sees the reliability change. |
| Continuity Engine | Make timeline visually rich | Proof artifact | Icons, timestamps, plain-English events | Admin sees rich event timeline. |
| Driver Reporting Flow | Post-report recovery screen | Emotional payoff | Next steps, 3 HIGH-confidence lots, simulated credit | Driver sees recovery/next-steps screen after reporting. |
| Testing | Remove `--passWithNoTests`; confirm >0 collected | Trustworthy test suite | Test run passes with actual tests | `npm test` collects more than zero tests and exits non-zero if tests are missing. |
| Testing | `docker-compose` for test Postgres | Reliable test environment | Database spins up automatically | Test PostgreSQL can start through docker-compose. |
| UX / Visual | Consistent status chips across every surface | Visual clarity | One colour language for states | DISPUTED, UNDER_REVIEW, LOW confidence use same colours everywhere. |
| UX / Visual | Loading and empty states | Polished UI experience | Spinners and empty messages | Loading, empty, and error states work for booking/report screens. |

## 3. The Six Must-Do Improvements

1. **Confidence badges on parking cards.**
   - **Problem solved:** Users need visual trust indicators before booking.
   - **Where it appears:** Home, Explore, and Parking Details.
   - **What must be implemented:** High / Medium / Low chip, colour-coded.
   - **How to verify it during the demo:** Confidence badge appears on Home, Explore, and Parking Details cards.

2. **Reliability banner and booking block on Parking Details.**
   - **Problem solved:** Prevents booking of unreliable or under-review lots.
   - **Where it appears:** Parking lot details page.
   - **What must be implemented:** Reliability banner at top and an UNDER_REVIEW warning state that blocks the Book button.
   - **How to verify it during the demo:** UNDER_REVIEW parking lots show an explicit warning and cannot be booked.

3. **Post-report recovery screen.**
   - **Problem solved:** Provides an emotional payoff and alternatives when parking fails.
   - **Where it appears:** Driver reporting flow (after submission).
   - **What must be implemented:** After the user submits a serious parking issue report, show a recovery screen with next steps, three nearby high-confidence parking suggestions, and a clearly labeled simulated goodwill credit. Do not call this a live refund, payment, or completed automatic rebooking unless those systems are implemented.
   - **How to verify it during the demo:** The driver sees a recovery/next-steps screen after reporting.

4. **Unified safe capacity release.**
   - **Problem solved:** Inaccurate capacity management and leaks.
   - **Where it appears:** Backend capacity logic.
   - **What must be implemented:** Route every release path through `releaseCapacity()`. 0 ≤ availableSpaces ≤ totalSpaces. Cancellation, checkout, expiration, dispute, and lot deactivation must all use the same guarded `releaseCapacity()` logic.
   - **How to verify it during the demo:** All capacity releases use guarded shared logic and availableSpaces never exceeds totalSpaces.

5. **Rich Continuity Engine timeline.**
   - **Problem solved:** Needs accountable resolution workflow visualization.
   - **Where it appears:** Admin complaints detail view.
   - **What must be implemented:** Make the timeline visually rich — icons, timestamps, plain-English event names. This is your proof artifact.
   - **How to verify it during the demo:** The admin can view evidence, severity, booking context, reliability information, and a rich event timeline on one screen.

6. **Working, trustworthy test suite.**
   - **Problem solved:** Prove reliability through code.
   - **Where it appears:** CI/CD or local test runs.
   - **What must be implemented:** Remove `--passWithNoTests`; confirm >0 collected. Use `docker-compose` for the test Postgres.
   - **How to verify it during the demo:** The test suite collects more than zero tests and passes, and Test PostgreSQL can start through `docker-compose`.

## 4. Detailed Roadmap by Area

### Authentication
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NEXT | Refresh tokens + logout invalidation | JWT-only means no session revocation | Improved security and session control |
| NEXT | Rate-limit login and report endpoints | Prevent abuse | Rate limits active on auth endpoints |
| LATER | Email verification on signup | Verify user identity | Users verify email before accessing app |

### Parking Discovery
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NOW | Confidence badge on every parking card | Visual trust indicator | High / Medium / Low chip, colour-coded |
| NOW | Hide or grey out UNDER_REVIEW lots with an explicit reason label | Prevent booking broken lots | UNDER_REVIEW lots visually disabled |
| NEXT | Move radius filtering server-side (PostGIS or bounding-box query) | Client-side breaks past ~200 lots | Scalable location filtering |
| LATER | "Report rate" micro-stat on cards: 2 issues in last 30 bookings | Extra transparency | Users see issue frequency |

### Parking Lot Details
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NOW | Reliability banner at top: confidence + one-line explanation | Immediate user awareness | Banner visible with context |
| NOW | UNDER_REVIEW warning state that blocks the Book button | Stop bookings on disputed lots | Book button is disabled with warning |
| NEXT | Show last 3 resolved complaints (anonymised) | Transparency beats a bare score | Recent issues visible to drivers |
| NEXT | Wire the "Report this lot" trigger to ReportLotModal | Easy access to reporting | Modal opens on click |

### Vehicle Management
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NEXT | Block deleting a vehicle tied to an ACTIVE booking | Prevent orphan records | Cannot delete active vehicles |
| LATER | Vehicle type (2W/4W) → filter lots by supported type | Better search filtering | Lots filtered by vehicle type |
| LATER | Re-verification prompt when documents expire | Compliance | Users prompted to re-verify |

### AI Document Verification
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NOW | Freeze it. Working is enough | Focus on Continuity Engine | Verification works as-is |
| NEXT | Surface confidence score and failure reason | Better user feedback | Driver sees why document failed |
| LATER | Manual admin override queue for rejected documents | Edge case handling | Admins can approve rejected docs |

### Booking Lifecycle
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NOW | Show the state machine in the UI — a small progress strip: Reserved → Active → Completed | Clear user context | Progress strip visible |
| NEXT | Extend-booking action (with capacity re-check) | Better user experience | Users can extend active bookings |
| NEXT | Cancellation window rules (free before X minutes) | Fair cancellation policy | Time-based cancellation limits |
| LATER | Recurring / monthly passes | Frequent user support | Subscription parking available |

### Capacity Integrity
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NOW | Route every release path through releaseCapacity() — deactivation, checkout, expiry, dispute | Prevent capacity corruption | Centralized, guarded logic |
| NEXT | Add capacityReleasedAt on booking | Makes release idempotent | Prevents double-releasing |
| LATER | Derive availability from live count of overlapping bookings; drop counter | Removes state drift | Availability calculated dynamically |

### Geofence Check-In and Check-Out
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NOW | Visible DEMO_MODE indicator so judges know why GPS isn't being enforced | Context for demo | DEMO_MODE badge visible |
| NEXT | Distance-to-geofence readout instead of silent failure | Better UX | "You're 40m outside the zone" |
| LATER | QR fallback at the lot entrance when GPS is unreliable | Fallback mechanism | QR scanning works for check-in |

### Session Sweeper
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NEXT | Warn driver before auto-expiry rather than expiring silently | Better UX | Warning notification before expiry |
| NEXT | Log sweeper runs so you can prove it fired during the demo | Traceability | Sweeper execution is logged |
| LATER | Move from interval polling to a job queue | Scalability | Job queue manages sessions |

### Owner Lot Management
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NOW | Clear 409 message when editing an UNDER_REVIEW lot | Inform owner why action is blocked | Shows why, not just "forbidden" |
| NEXT | Bulk price / capacity edit | Better owner tools | Edit multiple lots at once |
| LATER | Operating hours + closed-day scheduling | Removes a whole complaint category | Configurable operating hours |

### Owner Dashboard
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NOW | Add a reliability tile — owners should see their own confidence score front and centre | Owner awareness | Score visible on dashboard |
| NEXT | Trend line: reports over time | Analytics | Chart showing report history |
| LATER | Trim the charts. Revenue graphs are the least differentiated thing | Focus | Streamlined charts |

### Owner Reports Panel
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NEXT | Let owners submit a counter-statement + evidence | Fair dispute resolution | Owners can dispute reports |
| NEXT | Show the consequence ladder ("2 more serious reports → delisting") | Clear rules | Consequence path visible |
| LATER | Email/push on new report | Timely alerts | Notifications delivered |

### Admin Complaints
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NOW | Single-screen detail view: evidence photos, booking context, severity, lot reliability, timeline | No tab-hunting during demo | All data on one screen |
| NOW | Show the reliability delta the resolution will cause before the admin clicks | Informed consequences | Delta visible before action |
| NEXT | Bulk resolve for duplicates | Efficiency | Multiple tickets resolved at once |
| NEXT | Add DISPUTE_REJECTED | Protects booking | False reports don't stain booking |

### Admin Bookings and Overview
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NEXT | Click-through from a metric tile to its filtered list | Navigation | Clicking tile opens list |
| LATER | User management and lot management pages | Admin tooling | Not demo-critical pages built |

### Continuity Engine
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NOW | Make the timeline visually rich — icons, timestamps, plain-English event names | Proof artifact | Timeline looks polished |
| NEXT | Rate-based reliability (reports ÷ completed bookings) with time decay | Better metric | Dynamic reliability calculation |
| NEXT | Require admin confirmation before auto-delisting | Safety check | Manual override for delisting |
| LATER | Reporter reputation weighting | Trust scoring | Weighted reports based on user |

### Driver Reporting Flow
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NOW | After submission: show next steps + 3 nearby HIGH-confidence lots + a simulated credit | Emotional payoff | Recovery screen shown |
| NEXT | Draft-save if the photo upload fails | Resilience | Report isn't lost on network error |
| LATER | Report status tracking for the driver ("Under admin review") | Transparency | Driver sees report state |

### Testing
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NOW | Remove --passWithNoTests; confirm >0 collected | Trustworthy suite | Tests run and pass |
| NOW | docker-compose for the test Postgres | Reliable env | DB spins up automatically |
| NEXT | CI on push with a minimum test-count gate | Code quality | Automated testing |
| LATER | Frontend tests | UI reliability | Frontend tests added |

### UX and Visual Consistency
| Priority | Task | Reason | Expected Result |
|---|---|---|---|
| NOW | Consistent status chips across every surface | Visual language | One colour language for states |
| NOW | Loading and empty states on the report flow and bookings tabs | Polish | Spinners and empty states visible |
| NEXT | Full dark-theme pass using your token set | Complete design | Dark theme fully supported |
| LATER | Animations, transitions, polish | Premium feel | Enhanced UI micro-interactions |

## 5. Demo Flow Checklist

- [ ] Driver opens Home or Explore.
- [ ] Driver sees availability-confidence chips.
- [ ] Driver opens Parking Details.
- [ ] Driver sees reliability explanation and booking availability.
- [ ] Driver makes or opens a reservation.
- [ ] Driver sees booking lifecycle progress: Reserved → Active → Completed.
- [ ] Driver reports a serious issue with photo evidence.
- [ ] Driver sees post-report recovery screen.
- [ ] Booking becomes DISPUTED.
- [ ] Capacity is safely released.
- [ ] Lot confidence changes.
- [ ] Admin opens the complaint from the dashboard.
- [ ] Admin sees evidence, booking context, severity, reliability state, and rich timeline.
- [ ] Admin sees the reliability change that resolution will cause.
- [ ] Admin resolves/rejects the complaint.
- [ ] Lot reliability recalculates correctly.

### Technical Checklist
- [ ] DEMO_MODE indicator is visible if enabled.
- [ ] Test suite collects tests.
- [ ] Test suite passes.
- [ ] Test Postgres runs through docker-compose.
- [ ] No capacity path can exceed totalSpaces.
- [ ] Loading, error, and empty states are visible and usable.

## 6. Post-Demo Priorities

These items improve scale, fairness, reliability, operational tooling, and user communication after the core demo is proven.

| Area | Improvement | Why It Comes After Demo | Intended Outcome |
|---|---|---|---|
| Authentication | Refresh tokens + logout | Not visually impactful | Secure session revocation |
| Authentication | Rate-limit endpoints | Unlikely to face abuse in demo | Protected endpoints |
| Parking Discovery | Server-side radius filtering | Client-side works for small datasets | Scalable location querying |
| Parking Lot Details | Show last 3 resolved complaints | Transparency is a nice-to-have | Recent issues visible to drivers |
| Parking Lot Details | Wire "Report this lot" to modal | Can report via booking for now | Easy access to reporting |
| Vehicle Management | Block deleting active vehicles | Edge case | Prevent orphan records |
| AI Verification | Surface confidence score and reason | Binary pass/fail works for demo | Driver sees why document failed |
| Booking Lifecycle | Extend-booking action | Complexity not needed for core flow | Users can extend active bookings |
| Booking Lifecycle | Cancellation window rules | Complex logic | Time-based cancellation limits |
| Capacity Integrity | Add `capacityReleasedAt` on booking | Current clamping is sufficient | Idempotent capacity releases |
| Geofence Check-In | Distance-to-geofence readout | Silent failure is acceptable for now | Better UX for check-in |
| Session Sweeper | Warn driver before auto-expiry | Silent expiry works for demo | Warning notification |
| Session Sweeper | Log sweeper runs | Easy to show manually during demo | Traceability of runs |
| Owner Management | Bulk price / capacity edit | Can edit one by one for demo | Edit multiple lots at once |
| Owner Dashboard | Trend line: reports over time | Too complex for initial build | Chart showing report history |
| Owner Reports | Counter-statement + evidence | Not part of driver-admin core flow | Owners can dispute reports |
| Owner Reports | Consequence ladder | Too much detail for demo | Clear consequence path visible |
| Admin Complaints | Bulk resolve for duplicates | Edge case | Multiple tickets resolved at once |
| Admin Complaints | Add DISPUTE_REJECTED | Basic resolution is enough for demo | False reports don't stain booking |
| Admin Bookings | Click-through to filtered list | Basic navigation exists | Clicking tile opens list |
| Continuity Engine | Rate-based reliability with time decay | Simple scores work for demo | Dynamic reliability calculation |
| Continuity Engine | Admin confirmation for auto-delisting | Automated is fine for demo | Manual override for delisting |
| Driver Reporting | Draft-save on upload failure | Edge case | Report isn't lost on network error |
| Testing | CI on push with minimum test gate | Local testing suffices for demo | Automated pipeline testing |
| UX/Visual | Full dark-theme pass | Light theme is the priority focus | Dark theme fully supported |

## 7. Future Roadmap

These items belong in Phase 2 or future development, and should not be begun until earlier priorities are complete.

| Area | Future Capability | Product Value | Prerequisite / Note |
|---|---|---|---|
| Authentication | Email verification on signup | Identity validation | Requires mail server integration |
| Parking Discovery | "Report rate" micro-stat | Transparency | Requires stable reporting data |
| Vehicle Management | Vehicle type filtering (2W/4W) | Better UX | Requires rich lot metadata |
| Vehicle Management | Re-verification prompt on expiry | Compliance | Requires robust cron/workers |
| AI Verification | Manual admin override queue | Edge case handling | Requires new admin UI pages |
| Booking Lifecycle | Recurring / monthly passes | Revenue growth | Requires payment processing |
| Capacity Integrity | Derive availability from live count | Reliability | Requires high-performance queries |
| Geofence Check-In | QR fallback for bad GPS | Reliability | Requires lot physical signage |
| Session Sweeper | Move from polling to job queue | Scalability | Requires Redis/queue infrastructure |
| Owner Management | Operating hours + closed days | Deflection of complaints | Requires timezone/calendar logic |
| Owner Dashboard | Trim charts | Focus | Can be done as UI refactor |
| Owner Reports | Email/push on new report | Alerting | Requires notification infrastructure |
| Admin Bookings | User and lot management pages | Tooling | Requires large UI buildout |
| Continuity Engine | Reporter reputation weighting | Trust | Requires complex scoring algorithm |
| Driver Reporting | Report status tracking | Transparency | Requires driver dashboard updates |
| Testing | Frontend tests | Reliability | Requires Cypress/Playwright setup |
| UX/Visual | Animations, transitions, polish | Premium feel | Requires design system maturity |

## 8. Scope Guardrails

### What Not to Build Before Demo

- Payment gateway or real refunds.
- Government authority integration.
- IoT, ANPR, cameras, or hardware dependency.
- Email/push notification infrastructure.
- Complex admin user-management expansion.
- Advanced analytics dashboards.
- Production-scale job queue migration.
- Large UI redesigns unrelated to the trust/reliability flow.
- Full frontend test suite.
- Animations and nonessential visual polish.

These are valid future directions, but they do not strengthen the main demo as much as a stable, visible, end-to-end Continuity Engine workflow.

## 9. Definition of Demo Ready

### ParkMitra is Demo Ready When:

- The test suite collects more than zero tests and passes.
- `--passWithNoTests` is removed.
- Test PostgreSQL can start through docker-compose.
- All capacity releases use guarded shared logic.
- `availableSpaces` never exceeds `totalSpaces`.
- Drivers can see High, Medium, Low, and Under Review reliability states.
- UNDER_REVIEW parking lots show an explicit warning and cannot be booked.
- Drivers can file a serious booking-linked report with photo evidence.
- The booking becomes DISPUTED without losing the original evidence trail.
- The driver sees a recovery/next-steps screen after reporting.
- The admin can view evidence, severity, booking context, reliability information, and a rich event timeline on one screen.
- Admin resolution recalculates lot reliability correctly.
- DEMO_MODE is visibly labeled when active.
- Loading, empty, and error states work for booking/report screens.

Primary demo message:
“ParkMitra does not only help users reserve parking. When parking fails in the real world, ParkMitra preserves evidence, protects booking integrity, maintains accurate capacity, and routes the issue into an accountable resolution workflow.”
