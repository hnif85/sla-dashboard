import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import crypto from "crypto";

const AI_URL = process.env.AI_API_URL!;
const AI_KEY = process.env.AI_API_KEY!;

const SYSTEM_PROMPT = `Kamu adalah asisten analisis pipeline sales untuk tim Partnership MWX — perusahaan AI tools untuk UMKM Indonesia.

Tugasmu: buat ringkasan progres dan status prospek tertentu berdasarkan riwayat aktivitas, perubahan stage, dan Minutes of Meeting (MOM).

Format output (gunakan bagian-bagian ini):
1. **Status Saat Ini** — 1–2 kalimat: stage sekarang, berapa hari di stage ini, status SLA
2. **Progres Perjalanan** — narasi singkat timeline dari awal hingga sekarang: kapan masuk, stage apa saja yang sudah dilalui, aktivitas utama
3. **Keputusan & Action Items** — poin-poin penting dari MOM jika ada (decisions + action items)
4. **Isu & Risiko** — apakah ada SLA overdue/at risk? Apakah ada jeda aktivitas yang panjang?
5. **Rekomendasi Next Action** — 1–2 langkah konkret yang bisa dilakukan sales sekarang

Aturan:
- Bahasa Indonesia, profesional tapi natural
- Sebutkan tanggal, tipe aktivitas, dan nama stage secara spesifik
- Panjang total: 150–300 kata
- Jika suatu bagian kosong (misal tidak ada MOM), tulis "Tidak ada data" lalu lanjut
- Gunakan **bold** untuk sub-header bagian`;

function buildDataHash(activitiesCount: number, momsCount: number, lastActivityDate: Date | null, lastMomDate: Date | null): string {
  const raw = `${activitiesCount}:${momsCount}:${lastActivityDate?.toISOString() ?? ""}:${lastMomDate?.toISOString() ?? ""}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salesId: string; prospectId: string }> }
) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { salesId, prospectId } = await params;

  if (session.role === "sales" && session.userId !== salesId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "trainer" || session.role === "crm") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Fetch prospect with all related data
    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId, salesId, deletedAt: null },
      select: {
        id: true,
        namaProspek: true,
        channel: true,
        produkFokus: true,
        stage: true,
        tglMasuk: true,
        tglUpdateStage: true,
        estUmkmReach: true,
        nextAction: true,
        activities: {
          select: {
            id: true,
            tanggal: true,
            tipeAktivitas: true,
            topikHasil: true,
            catatan: true,
            nextStage: true,
          },
          orderBy: { tanggal: "asc" },
        },
        moms: {
          select: {
            id: true,
            title: true,
            tanggal: true,
            participants: true,
            agenda: true,
            discussion: true,
            decisions: true,
            actionItems: true,
          },
          orderBy: { tanggal: "asc" },
        },
        history: {
          where: { fieldName: "Stage" },
          select: {
            changedAt: true,
            oldValue: true,
            newValue: true,
          },
          orderBy: { changedAt: "asc" },
        },
        summaryCache: {
          select: { dataHash: true },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Check if we can skip generation (hash unchanged)
    const lastActivityDate = prospect.activities.length
      ? new Date(prospect.activities[prospect.activities.length - 1].tanggal)
      : null;
    const lastMomDate = prospect.moms.length
      ? new Date(prospect.moms[prospect.moms.length - 1].tanggal)
      : null;
    const currentHash = buildDataHash(
      prospect.activities.length,
      prospect.moms.length,
      lastActivityDate,
      lastMomDate
    );

    // If hash unchanged and summary exists, return cached
    if (prospect.summaryCache && prospect.summaryCache.dataHash === currentHash) {
      const cached = await prisma.prospectSummaryCache.findUnique({
        where: { prospectId },
        select: {
          summary: true,
          generatedAt: true,
          activitiesCount: true,
          momsCount: true,
          generatedBy: { select: { name: true } },
        },
      });
      if (cached) {
        return NextResponse.json({
          summary: cached.summary,
          generatedAt: cached.generatedAt,
          generatedBy: cached.generatedBy.name,
          isStale: false,
          fromCache: true,
          activitiesCount: cached.activitiesCount,
          momsCount: cached.momsCount,
        });
      }
    }

    // ── Build prompt data ────────────────────────────────────────────────────
    const fmt = (d: Date | string) =>
      new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    const lines: string[] = [];

    lines.push(`NAMA PROSPEK: ${prospect.namaProspek}`);
    lines.push(`CHANNEL: ${prospect.channel || "-"}`);
    lines.push(`PRODUK FOKUS: ${prospect.produkFokus || "-"}`);
    lines.push(`STAGE SAAT INI: ${prospect.stage}`);
    lines.push(`TANGGAL MASUK: ${fmt(prospect.tglMasuk)}`);
    lines.push(`TERAKHIR UPDATE STAGE: ${fmt(prospect.tglUpdateStage)}`);
    lines.push(`EST. UMKM: ${prospect.estUmkmReach?.toLocaleString("id-ID") || "-"}`);
    lines.push(`NEXT ACTION: ${prospect.nextAction || "-"}`);

    // Stage history
    lines.push(`\nRIWAYAT PERUBAHAN STAGE (${prospect.history.length}):`);
    if (!prospect.history.length) {
      lines.push("- Tidak ada perubahan stage tercatat");
    } else {
      for (const h of prospect.history) {
        lines.push(`- ${fmt(h.changedAt)}: ${h.oldValue ?? "?"} → ${h.newValue ?? "?"}`);
      }
    }

    // Activities
    lines.push(`\nRIWAYAT AKTIVITAS (${prospect.activities.length}):`);
    if (!prospect.activities.length) {
      lines.push("- Belum ada aktivitas");
    } else {
      for (const a of prospect.activities) {
        const topik = a.topikHasil || a.catatan || "-";
        const nextStage = a.nextStage ? ` → next: ${a.nextStage}` : "";
        lines.push(`- ${fmt(a.tanggal)} | ${a.tipeAktivitas}: ${topik.slice(0, 200)}${nextStage}`);
      }
    }

    // MOMs
    lines.push(`\nMINUTES OF MEETING (${prospect.moms.length}):`);
    if (!prospect.moms.length) {
      lines.push("- Tidak ada MOM");
    } else {
      for (const m of prospect.moms) {
        lines.push(`- ${fmt(m.tanggal)}: "${m.title}"`);
        if (m.agenda?.trim()) lines.push(`  Agenda: ${m.agenda.trim().slice(0, 150)}`);
        if (m.decisions?.trim()) lines.push(`  Keputusan: ${m.decisions.trim().slice(0, 200)}`);
        if (m.actionItems?.trim()) lines.push(`  Action Items: ${m.actionItems.trim().slice(0, 200)}`);
      }
    }

    const userContent = `Buatkan ringkasan progres prospek berikut:\n\n${lines.join("\n")}`;

    // ── Call AI ──────────────────────────────────────────────────────────────
    const aiRes = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Key": AI_KEY,
      },
      body: JSON.stringify({
        service: "CreateWhiz",
        ai: "vertex",
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.5,
        top_p: 1,
        debug: false,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return NextResponse.json({ error: "AI API error: " + errText }, { status: 502 });
    }

    const aiData = await aiRes.json();
    const content = aiData?.data?.content;
    if (!content) {
      return NextResponse.json({ error: "AI returned no content" }, { status: 502 });
    }
    const summaryText = typeof content === "string" ? content.trim() : JSON.stringify(content);

    // ── Upsert cache to DB ───────────────────────────────────────────────────
    const saved = await prisma.prospectSummaryCache.upsert({
      where: { prospectId },
      update: {
        summary: summaryText,
        dataHash: currentHash,
        activitiesCount: prospect.activities.length,
        momsCount: prospect.moms.length,
        generatedAt: new Date(),
        generatedById: session.userId,
      },
      create: {
        prospectId,
        summary: summaryText,
        dataHash: currentHash,
        activitiesCount: prospect.activities.length,
        momsCount: prospect.moms.length,
        generatedById: session.userId,
      },
      select: {
        generatedAt: true,
        generatedBy: { select: { name: true } },
      },
    });

    return NextResponse.json({
      summary: summaryText,
      generatedAt: saved.generatedAt,
      generatedBy: saved.generatedBy.name,
      isStale: false,
      fromCache: false,
      activitiesCount: prospect.activities.length,
      momsCount: prospect.moms.length,
    });
  } catch (error) {
    console.error("[api/reports/prospect/summarize] failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
