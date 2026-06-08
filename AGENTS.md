<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:codebase-knowledge -->
# MWX Partnership SLA Dashboard — Codebase Knowledge

## Overview
Sales Pipeline & SLA Tracker untuk tim Partnership MWX. Next.js 16 App Router + React 19 + TypeScript. PostgreSQL via Prisma 7 (PrismaPg adapter). Auth JWT custom (jsonwebtoken + bcryptjs) via httpOnly cookie. Tailwind CSS v4. Bahasa Indonesia seluruh UI.

## Database Models
- **User** — id, name, email (unique), passwordHash, role (admin|sales|trainer|crm), region, active. Relasi: prospects, activities, moms, historyLogs, tasks, events, trainerEvents
- **FunnelStage** — order, name (unique), description, slaMin, slaTarget, slaMax, convRateTarget (10 stages)
- **Prospect** — tglMasuk, salesId, namaProspek, channel, produkFokus, kontakPIC, kontakInfo, stage, tglUpdateStage, nextAction, estUmkmReach, estNilaiDeal, probability, weightedUmkm, weightedNilai, hariDiStage, statusSLA, reasonLost, linkDokumen, deletedAt (soft delete). Relasi: sales, history, activities, moms, tasks, events
- **PipelineHistory** — prospectId, changedById, changedAt, fieldName, oldValue, newValue, notes
- **Activity** — tipeAktivitas, tanggal, salesId, prospectId (optional), namaProspek, pic, topikHasil, nextStage, catatan, linkMOM. Relasi: sales, prospect, task (optional unique)
- **MOM** — title, tanggal, salesId, prospectId (optional), participants, agenda, discussion, decisions, actionItems, nextMeeting. Relasi: sales, prospect
- **Task** — judul, tipeAktivitas, tanggalRencana, catatan, status (planned|done|cancelled). Relasi: sales, prospect, activity (optional unique)
- **Config** — key-value store (key unique, value, label, description, category)
- **Event** — namaEvent, tanggal, lokasiType (online|offline), lokasiDetail, salesId, prospectId (optional), target, jumlahPeserta, jumlahAplikasi, resume. Relasi: sales, prospect, trainers (EventTrainer[])
- **EventTrainer** — eventId, trainerId, topik, order. Relasi: event (cascade delete), trainer (User)

## API Routes
| Route | Method | Fungsi |
|---|---|---|
| /api/auth/login | POST | Login, set cookie |
| /api/auth/me | GET | Current user session |
| /api/auth/logout | POST | Clear cookie |
| /api/pipeline | GET/POST | List/create prospects |
| /api/pipeline/[id] | GET/PUT/DELETE | Detail/update/soft-delete prospect |
| /api/dashboard | GET | Aggregated dashboard data (incl weeklySummary for admin) |
| /api/debug/sla | GET | Debug SLA computation per prospect |
| /api/activities | GET/POST | List/create activities |
| /api/activities/[id] | PUT | Update activity |
| /api/tasks | GET/POST | List/create tasks |
| /api/tasks/[id] | PUT/DELETE | Update/delete task |
| /api/mom | GET/POST | List/create MOM |
| /api/mom/[id] | GET/PUT/DELETE | Detail/update/delete MOM |
| /api/mom/generate | POST | AI generate MOM draft from notes |
| /api/events | GET/POST | List/create events (trainer sees assigned only) |
| /api/events/[id] | GET/PUT/DELETE | Detail/update/delete event (trainer read-only) |
| /api/trainers | GET | List trainer users |
| /api/wip-report | GET | Aggregated WIP data per period |
| /api/wip-report/summarize | POST | AI narrative summary of WIP |
| /api/admin/users | GET/POST | CRUD users |
| /api/admin/users/[id] | PUT/DELETE | Update/delete user |
| /api/admin/config | GET/PUT | Global config (key-value) |
| /api/admin/funnel-stages | GET/PUT | Funnel stages & SLA config |

## Pages
| Route | File | Deskripsi |
|---|---|---|
| /login | `src/app/login/page.tsx` | Login form |
| /dashboard | `src/app/(app)/dashboard/page.tsx` | Admin dashboard (weekly summary, SLA, activity recap) |
| /pipeline | `src/app/(app)/pipeline/page.tsx` | Pipeline table with sort/filter + ProspectModal |
| /pipeline/[id] | `src/app/(app)/pipeline/[id]/page.tsx` | Prospect detail |
| /crm | `src/app/(app)/crm/page.tsx` | CRM (placeholder) |
| /activities | `src/app/(app)/activities/page.tsx` | Activity log list + modal |
| /plans | `src/app/(app)/plans/page.tsx` | Task planner (CRUD, convert to activity with AI) |
| /mom | `src/app/(app)/mom/page.tsx` | MOM list + AI generate |
| /mom/new | `src/app/(app)/mom/new/page.tsx` | Create MOM |
| /mom/[id] | `src/app/(app)/mom/[id]/page.tsx` | MOM detail |
| /mom/[id]/edit | `src/app/(app)/mom/[id]/edit/page.tsx` | Edit MOM |
| /events | `src/app/(app)/events/page.tsx` | Event CRUD with trainers, stats, detail drawer |
| /events/monitoring | `src/app/(app)/events/monitoring/page.tsx` | Monitoring penggunaan (placeholder) |
| /events/peserta | `src/app/(app)/events/peserta/page.tsx` | List peserta (placeholder) |
| /reports | `src/app/(app)/reports/page.tsx` | Laporan — northstar summary, SLA health, stage distribution, activity recap per period, sales performance ranking |
| /wip | `src/app/(app)/wip/page.tsx` | WIP report with period filter + AI summarize |
| /admin/users | `src/app/(app)/admin/users/page.tsx` | Kelola users (CRUD) |
| /admin/config | `src/app/(app)/admin/config/page.tsx` | Konfigurasi global |
| /admin/funnel-stages | `src/app/(app)/admin/funnel-stages/page.tsx` | Edit funnel stages & SLA |

## Key Patterns
- **Auth**: `auth.ts` — signToken/verifyToken, hashPassword/verifyPassword, getSession (server component), getSessionFromRequest (route handler). Cookie name: `auth-token`, 7 days expiry.
- **Middleware**: `src/proxy.ts` — Next.js middleware (matcher: exclude _next/static, _next/image, favicon.ico). Redirects unauthenticated to /login, blocks non-admin from /admin.
- **DB**: `db.ts` — PrismaClient singleton with `@prisma/adapter-pg` (PrismaPg). DATABASE_URL from env.
- **Caching**: `server-cache.ts` — unstable_cache untuk funnel stages (5m, tag: funnel-stages) & config (10m, tag: global-config). `fetch-cache.ts` — client-side in-memory cache 30s TTL stale-while-revalidate (getCached, setCached, bustCachePrefix).
- **Seed**: `seed.ts` — auto-run on login attempt. Creates admin (admin@mwx.id/admin123), budi@mwx.id & erik@mwx.id (sales123), 10 funnel stages with descriptions, 6 config keys, 1 demo prospect.
- **Pipeline History**: `pipeline-history.ts` — logPipelineChange() mencatat perubahan tracked fields ke PipelineHistory. Tracked: salesId, namaProspek, channel, produkFokus, kontakPIC, kontakInfo, stage, tglUpdateStage, nextAction, estUmkmReach, estNilaiDeal, probability, statusSLA, reasonLost, linkDokumen.
- **AI**: External API https://ai-module.mediawave.co.id/completions (Gemini 2.5 Flash) untuk MOM generation & WIP summarization. API key from env AI_API_KEY.
- **Role-based filtering**: API routes filter by salesId untuk role sales, trainer sees only assigned events. Sidebar/BottomNav filtered by role. Admin see all.
- **Responsive**: BottomNav mobile, Sidebar desktop (collapsible w/ animation). All pages responsive with card (mobile) / table (desktop) views.
- **Soft delete**: Prospects pakai deletedAt field, bukan hard delete.
- **No tests**: No testing infrastructure yet.

## Project Structure (src/)
```
src/
├── app/
│   ├── (app)/
│   │   ├── dashboard/        page.tsx
│   │   ├── pipeline/         page.tsx, [id]/page.tsx, ProspectModal.tsx
│   │   ├── crm/              page.tsx (placeholder)
│   │   ├── activities/       page.tsx, ActivitiesClient.tsx
│   │   ├── plans/            page.tsx
│   │   ├── mom/              page.tsx, new/page.tsx, [id]/page.tsx, [id]/edit/page.tsx
│   │   ├── events/           page.tsx, monitoring/page.tsx, peserta/page.tsx
│   │   ├── reports/          page.tsx
│   │   ├── wip/              page.tsx
│   │   ├── admin/            users/page.tsx, config/page.tsx, funnel-stages/page.tsx
│   │   └── layout.tsx        AppShell wrapper
│   ├── api/                  (all REST routes above)
│   ├── login/                page.tsx
│   ├── page.tsx              Redirect ke /dashboard
│   └── layout.tsx            Root layout (Inter font, AuthProvider)
├── components/               AppShell.tsx, Sidebar.tsx, BottomNav.tsx
├── contexts/                 AuthContext.tsx
├── lib/                      auth.ts, db.ts, seed.ts, server-cache.ts, fetch-cache.ts, pipeline-history.ts
├── proxy.ts                  Next.js middleware (auth check + redirect)
```

## Funnel Stages (10)
1. Lead/Prospek → 2. Outreach → 3. Follow Up → 4. Meeting Discovery → 5. Demo/Presentasi → 6. Proposal Formal → 7. Negosiasi → 8. Pilot (opsional) → 9. Deal/Closed Won → 10. Closed Lost
- SLA: tiap stage punya slaMin/slaTarget/slaMax. Status SLA: "On Track" (days ≤ slaMax×0.5) / "At Risk" (days ≤ slaMax) / "Overdue" (days > slaMax) dihitung dari effectiveDate (max of tglUpdateStage & last activity date).
- Northstar target: 100.000 UMKM closed won (config: target_northstar_nasional).

## Role Access
| Role | Sidebar Access |
|---|---|
| admin | Dashboard, Pipeline, CRM, Activity Log, Rencana, MOM, Laporan, WIP, Events, Admin panel |
| sales | Pipeline, Activity Log, Rencana, MOM, Laporan, WIP |
| trainer | Events (assigned only), Event sub-pages (List Peserta, Monitoring) |
| crm | CRM, Laporan |
<!-- END:codebase-knowledge -->


