# Tripsync — Implementation Plan

Group travel decision engine. Collect preferences -> find overlap -> score feasible
destinations -> explain trade-offs -> group decides.

## Phases
1. Setup, design system, Supabase schema + client.          [P1]
2. Create trip, join trip, participant sessions, invite.     [P2]
3. 7-step preference flow, calendar, validation, persistence.[P3]
4. Trip dashboard, completion state, group snapshot.         [P4]
5. Deterministic recommendation engine, top 3.               [P5]
6. Places / Routes / Holidays providers.                     [P6]
7. Flight provider (Duffel + optional Amadeus).              [P7]
8. Activities, maps, detail pages.                           [P8]
9. AI explanation + itinerary layer (optional, fallback).    [P9]
10. Decision + confirmation.                                 [P10]
11. Tests, responsive polish, build, deploy.                 [P11]

## Key decisions
- Providers behind interfaces in `lib/providers`; a demo implementation of each is
  selected when credentials are absent or NEXT_PUBLIC_DEMO_MODE=true. Demo data is
  always labelled in the UI — never presented as live.
- Recommendation is deterministic: hard constraints eliminate, weighted soft scores
  rank. AI only rewrites explanations; it never produces numbers or availability.
- Auth = opaque participant tokens, SHA-256 hashed in DB, raw value in an httpOnly
  cookie. Every trip-scoped route handler resolves the cookie to a membership.
- Recommendation runs are persisted so external APIs are not re-hit on render.
