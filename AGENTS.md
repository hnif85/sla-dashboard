<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:codebase-knowledge -->
# MWX Partnership SLA Dashboard — Codebase Knowledge

## Overview
Sales Pipeline & SLA Tracker untuk tim Partnership MWX. Next.js 16 App Router + React 19 + TypeScript. PostgreSQL via Prisma 7 di Supabase. Auth JWT custom (jsonwebtoken + bcryptjs) via httpOnly cookie. Tailwind CSS v4. Bahasa Indonesia seluruh UI.

## Database Models
- **User** — id, name, email (unique), passwordHash, role (admin|sales|trainer|crm), region, active
- **FunnelStage** — order, name (unique), slaMin, slaTarget, slaMax, convRateTarget (10 stages)
- **Prospect** — namaProspek, stage, channel, estUmkmReach, estNilaiDeal, probability, weightedUmkm, weightedNilai, statusSLA, deletedAt (soft delete). Relasi: sales (User)
- **PipelineHistory** — prospectId, changedById, fieldName, oldValue, newValue, notes
- **Activity** — tipeAktivitas, tanggal, topikHasil, linkMOM. Relasi: sales, prospect (optional)
- **MOM** — title, tanggal, agenda, discussion, decisions, actionItems, nextMeeting. Relasi: sales, prospect
- **Task** — judul, tipeAktivitas, tanggalRencana, status (planned|done|cancelled). Relasi: sales, prospect, activity (optional unique)
- **Config** — key-value store (key unique, value, label, description, category)
- **Event** — namaEvent, tanggal, lokasiType (online|offline), target, jumlahPeserta, jumlahAplikasi. Relasi: sales, prospect, trainers (EventTrainer[])
- **EventTrainer** — eventId, trainerId, topik, order

## API Routes
| Route | Method | Fungsi |
|---|---|---|
| /api/auth/login | POST | Login, set cookie |
| /api/auth/me | GET | Current user session |
| /api/auth/logout | POST | Clear cookie |
| /api/pipeline | GET/POST | List/create prospects |
| /api/pipeline/[id] | GET/PUT/DELETE | Detail/update/soft-delete prospect |
| /api/dashboard | GET | Aggregated dashboard data |
| /api/activities | GET/POST | List/create activities |
| /api/activities/[id] | PUT | Update activity |
| /api/tasks | GET/POST | List/create tasks |
| /api/tasks/[id] | PUT/DELETE | Update/delete task |
| /api/mom | GET/POST | List/create MOM |
| /api/mom/[id] | GET/PUT/DELETE | Detail/update/delete MOM |
| /api/mom/generate | POST | AI generate MOM draft from notes |
| /api/events | GET/POST | List/create events |
| /api/events/[id] | GET/PUT/DELETE | Detail/update/delete event |
| /api/trainers | GET | List trainer users |
| /api/wip-report | GET | Aggregated WIP data per period |
| /api/wip-report/summarize | POST | AI narrative summary of WIP |
| /api/admin/users | GET/POST | CRUD users |
| /api/admin/users/[id] | PUT/DELETE | Update/delete user |
| /api/admin/config | GET/PUT | Global config |
| /api/admin/funnel-stages | GET/PUT | Funnel stages & SLA config |

## Key Patterns
- **Auth**: `auth.ts` — signToken/verifyToken, hashPassword/verifyPassword, getSessionFromRequest. Cookie name: `auth-token`, 7 days expiry.
- **DB**: `db.ts` — PrismaClient singleton with Postgres adapter via DATABASE_URL (Supabase pooler pgbouncer=true port 6543, direct port 5432 fallback).
- **Caching**: `server-cache.ts` — unstable_cache untuk funnel stages (5m) & config (10m). `fetch-cache.ts` — client-side in-memory cache 30s TTL stale-while-revalidate.
- **Seed**: `seed.ts` — auto-run on login attempt, creates admin (admin@mwx.id/admin123) + 2 sales + default funnel stages + default config.
- **Pipeline History**: `pipeline-history.ts` — logPipelineChange() mencatat tiap perubahan field ke PipelineHistory.
- **AI**: External API https://ai-module.mediawave.co.id/completions (Gemini 2.5 Flash) untuk MOM generation & WIP summarization. API key from env AI_API_KEY.
- **Role-based filtering**: API routes filter by salesId untuk role sales. Sidebar/BottomNav filtered by role.
- **Responsive**: BottomNav mobile, Sidebar desktop (collapsible). All pages responsive with card/table views.
- **Soft delete**: Prospects pakai deletedAt field, bukan hard delete.
- **No tests**: No testing infrastructure yet.

## Project Structure (src/)
```
src/
├── app/
│   ├── (app)/dashboard/     pipeline/  activities/  plans/  mom/
│   │      events/  reports/  wip/  admin/
│   ├── api/                 (all REST routes above)
│   └── login/               Halaman login
├── components/              AppShell, Sidebar, BottomNav
├── contexts/                AuthContext
└── lib/                     auth, db, seed, cache, helpers
```

## Funnel Stages (10)
1. Lead/Prospek → 2. Outreach → 3. Follow Up/Kit → 4. Meeting Discovery → 5. Demo/Presentasi → 6. Proposal Formal → 7. Negosiasi → 8. Pilot (opsional) → 9. Deal/Closed Won → 10. Closed Lost
- SLA: tiap stage punya slaMin/slaTarget/slaMax. Status SLA: "On Track" / "At Risk" / "Overdue" dihitung dari hariDiStage vs SLA limits.
- Northstar target: 100.000 UMKM closed won.
<!-- END:codebase-knowledge -->


