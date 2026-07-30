# Freelance HQ — Project Management

A dark, green-accented Next.js app for tracking SEO, web development and digital
marketing client projects: what to do today, what's open, and what's done.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (dark theme, green/accent palette)
- Server Actions for all mutations (no client-side API calls)
- Supabase (Postgres) for data storage

## Data layer

`lib/store.ts` is the only file that talks to the database. Every function is
`async` and shaped like the app's domain types (`lib/types.ts`), so pages and
components never touch Supabase directly. Access goes through
`lib/supabaseClient.ts`, a lazily-created client using the **service role key**,
which only ever runs on the server (Server Components / Server Actions) and
bypasses Row Level Security — the anon/public key is not used anywhere in this
app, so there's nothing to leak to the browser.

## Branding & client reports

Go to **Settings** to set your company name and upload your logo — this brands
every SEO daily report PDF alongside the client's own logo (uploaded from that
project's Client Details card). If either logo is missing, the report falls
back to showing the company/client name as text instead. Uploads go through a
Server Action straight into Supabase Storage (the `logos` bucket), so no
client-side Supabase key is ever needed.

## Task files & client sharing

Any task can carry file attachments of any kind — add them from the task
detail modal, right when creating a task, or (on the client-facing link
below) directly from the client. Files are stored in a public `task-files`
Supabase Storage bucket and can be downloaded or removed any time. Every task
is fully editable — title, notes, checklist, status, priority, stage, dates,
and files — across SEO, Web Development, and every other project type.

Every project has a **Client Link** control (in the project's Client Details
tab): generate a unique, unguessable URL (`/share/<token>`) and send it to
your client. From that link — no account needed — they can see the project's
task board, add new tasks, and attach files, but can't edit, delete, or mark
anything as done; that stays under your control. Regenerate the link any time
to invalidate the old one, or disable sharing entirely.

## Logging in

The app (everything except `/share/<token>` client links, which are
intentionally public) requires you to be signed in. There's no public sign-up
page — you create your own account directly in Supabase:

1. In the Supabase dashboard, go to **Authentication > Users**.
2. Click **Add user > Create new user**, enter your email and a password, and
   make sure **Auto Confirm User** is checked (so you don't need to click an
   email confirmation link).
3. Go to `/login` in the app and sign in with that email/password.

Session checking happens in `middleware.ts` using the public anon key —
that key only ever performs `.auth.*` calls (sign in, sign out, check
session). It has no access to your projects/tasks/etc. even if used
directly, since every table has Row Level Security enabled with no
policies; all real data access still goes through the service-role client
described above.

## Setting up Supabase (step by step)

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**, pick an organization, name it (e.g. `freelance-hq`),
   set a database password (save it somewhere — you won't need it for this app,
   but you'll want it if you ever connect directly to Postgres), and choose a
   region close to you.
3. Wait for the project to finish provisioning (~2 minutes).

### 2. Create the tables

1. In the Supabase dashboard, open **SQL Editor** in the left sidebar.
2. Click **New query**, paste in the contents of [`supabase/schema.sql`](./supabase/schema.sql),
   and click **Run**. This creates the `projects`, `stages`, `tasks`, and
   `business_profile` tables (enabling Row Level Security on all of them) and a
   public `logos` storage bucket for client/company logo uploads.
3. (Optional) Run [`supabase/seed.sql`](./supabase/seed.sql) the same way if you
   want to start with the two example projects instead of an empty dashboard.

> Already ran `schema.sql` before logo uploads existed? Just run
> [`supabase/migrations/002_logos_and_business_profile.sql`](./supabase/migrations/002_logos_and_business_profile.sql)
> once — it only adds the new table and storage bucket, nothing destructive.
>
> Already ran it before task checklists / date-based scheduling existed? Also run
> [`supabase/migrations/003_task_checklist_and_schedule_date.sql`](./supabase/migrations/003_task_checklist_and_schedule_date.sql) —
> it adds a `checklist` column and converts `scheduled_for` from a `'today'`-only
> flag into a real date.
>
> Already ran it before task images / client sharing existed? Also run
> [`supabase/migrations/004_task_images_and_client_sharing.sql`](./supabase/migrations/004_task_images_and_client_sharing.sql) —
> it adds an `images` column to tasks, a `share_token` column to projects, and
> the `task-images` storage bucket.
>
> Already ran it before task attachments supported any file type (not just
> images)? Also run
> [`supabase/migrations/005_task_files.sql`](./supabase/migrations/005_task_files.sql) —
> it renames the `images` column to `files` and adds a `task-files` storage
> bucket for the new uploads.

### 3. Get your API credentials

1. In the Supabase dashboard, go to **Project Settings > API**.
2. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`).
3. Copy the **`service_role`** key under **Project API keys** — click "Reveal"
   first. This is a secret key with full database access; never put it in a
   `NEXT_PUBLIC_*` variable or commit it to git.
4. Also copy the **`anon` / `public`** key from the same page — this one is
   safe to expose to the browser (see "Logging in" above for why).

### 4. Add the environment variables

**Locally:**

```bash
cp .env.example .env.local
```

Then fill in all four values in `.env.local`:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

(`SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` are the same value — one is
server-only, the other is exposed to the browser for the login flow.)

`.env.local` is already gitignored, so it stays out of version control.

**On Vercel (or wherever you deploy):**

1. Open your project on [vercel.com](https://vercel.com) > **Settings > Environment Variables**.
2. Add all four variables above with the same values, for the **Production**
   and **Preview** environments.
3. Redeploy (or just push — the next deploy will pick them up).

### 5. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the dashboard, projects, and task boards are now
reading and writing to your Supabase database.

## Getting started (without Supabase configured)

The app still builds and lints without the two env vars set, since every
data-driven route renders dynamically (no build-time database calls). It will
throw a clear error at request time, though, so you do need Supabase configured
to actually run it.
