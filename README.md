# Freelance HQ — Project Management

A dark, green-accented Next.js app for tracking SEO, web development and digital
marketing client projects: what to do today, what's open, and what's done.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (dark theme, green/accent palette)
- Server Actions for all mutations (no client-side API calls)

## Current data layer

`lib/store.ts` holds an in-memory demo data store (seeded with example SEO, web
dev and digital marketing projects) so the whole app can be designed and used
before a real database is wired up. Every function in that file is `async` and
already shaped like a query, so swapping it for Supabase later is a matter of
replacing the function bodies with `supabase.from(...)` calls — no page or
component code should need to change.

### Wiring up Supabase next

1. Create tables mirroring `lib/types.ts`: `projects`, `stages`, `tasks`.
2. Add `@supabase/supabase-js` and a `lib/supabase.ts` client using
   `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
   env vars.
3. Replace the bodies of the functions in `lib/store.ts` with Supabase queries,
   keeping the same signatures.
4. Add Supabase Auth if you want to log in before seeing your projects.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.
