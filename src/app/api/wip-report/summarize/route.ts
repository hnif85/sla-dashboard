import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

const AI_URL = process.env.AI_API_URL!;
const AI_KEY = process.env.AI_API_KEY!;

const SYSTEM_PROMPT = `Kamu adalah asisten laporan WIP (Work In Progress) untuk tim sales MWX Partnership — perusahaan AI tools untuk UMKM Indonesia.

Tugasmu: buat ringkasan narasi WIP dari data aktivitas tim selama satu periode.

Format output:
1. Paragraf pembuka singkat (1–2 kalimat) yang menyebutkan periode dan highlight utama
2. Bagian "📊 Aktivitas Tim" — narasi siapa melakukan apa, sebutkan angka
3. Bagian "🆕 Pipeline Baru" — prospek baru yang masuk, sebutkan channel dan estimasi UMKM jika relevan
4. Bagian "🔄 Pergerakan Pipeline" — deal-deal yang maju stage, sebutkan yang signifikan
5. Bagian "📝 Minutes of Meeting" — MOM yang diadakan dan keputusan penting
6. Bagian "🏆 Wins" — jika ada Closed Won, highlight dengan semangat; jika tidak ada, skip bagian ini
7. Penutup singkat (1 kalimat) tentang momentum tim

Aturan:
- Bahasa Indonesia profesional namun natural, bukan kaku
- Sebutkan nama orang dan prospek secara spesifik agar terasa personal
- Panjang total: 200–400 kata
- Jika suatu bagian tidak ada datanya, tulis saja "Tidak ada di periode ini" lalu lanjut
- Output: teks biasa, gunakan emoji section header seperti di atas`;

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { period, summary, activitiesMatrix, newProspects, stageChanges, closedWon, moms } = body;

  if (!period?.from || !period?.to) {
    return NextResponse.json({ error: "Period data diperlukan" }, { status: 400 });
  }

  // Build a compact text representation of the data for the AI
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  const lines: string[] = [];

  lines.push(`PERIODE: ${fmt(period.from)} — ${fmt(period.to)}`);
  lines.push(`\nRINGKASAN:`);
  lines.push(`- Total aktivitas: ${summary.totalActivities}`);
  lines.push(`- Prospek baru: ${summary.newProspects}`);
  lines.push(`- Perubahan stage: ${summary.stageChanges}`);
  lines.push(`- MOM diadakan: ${summary.totalMoms}`);
  lines.push(`- Closed Won: ${summary.closedWon}`);

  // Activities matrix
  lines.push(`\nAKTIVITAS PER SALES:`);
  for (const [salesName, counts] of Object.entries(activitiesMatrix as Record<string, Record<string, number>>)) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const detail = Object.entries(counts).map(([t, c]) => `${t}: ${c}`).join(", ");
    lines.push(`- ${salesName}: ${total} aktivitas (${detail})`);
  }

  // New prospects
  lines.push(`\nPROSPEK BARU (${newProspects?.length ?? 0}):`);
  if (!newProspects?.length) {
    lines.push("- Tidak ada prospek baru");
  } else {
    for (const p of newProspects) {
      const umkm = p.estUmkmReach ? `, Est. UMKM: ${p.estUmkmReach.toLocaleString("id-ID")}` : "";
      lines.push(`- ${p.namaProspek} (Channel: ${p.channel || "-"}, Stage: ${p.stage}, Sales: ${p.sales.name}${umkm})`);
    }
  }

  // Stage movements (exclude closed won)
  const movements = (stageChanges ?? []).filter(
    (h: { newValue: string | null }) => h.newValue !== "9. Deal/Closed Won"
  );
  lines.push(`\nPERGERAKAN PIPELINE (${movements.length}):`);
  if (!movements.length) {
    lines.push("- Tidak ada pergerakan stage");
  } else {
    for (const h of movements.slice(0, 15)) {
      const who = h.changedBy?.name ?? "-";
      const prospect = h.prospect?.namaProspek ?? "-";
      const d = fmt(h.changedAt);
      lines.push(`- ${prospect}: ${h.oldValue ?? "?"} → ${h.newValue ?? "?"} (oleh ${who}, ${d})`);
    }
    if (movements.length > 15) lines.push(`  ... dan ${movements.length - 15} pergerakan lainnya`);
  }

  // MOMs
  lines.push(`\nMINUTES OF MEETING (${moms?.length ?? 0}):`);
  if (!moms?.length) {
    lines.push("- Tidak ada MOM");
  } else {
    for (const m of moms) {
      const prospect = m.prospect?.namaProspek ? ` untuk ${m.prospect.namaProspek}` : "";
      lines.push(`- "${m.title}"${prospect} oleh ${m.sales.name} (${fmt(m.tanggal)})`);
      if (m.decisions?.trim()) lines.push(`  Keputusan: ${m.decisions.trim().slice(0, 200)}`);
      if (m.actionItems?.trim()) lines.push(`  Action: ${m.actionItems.trim().slice(0, 200)}`);
    }
  }

  // Closed Won
  lines.push(`\nCLOSED WON (${closedWon?.length ?? 0}):`);
  if (!closedWon?.length) {
    lines.push("- Tidak ada deal closed di periode ini");
  } else {
    for (const h of closedWon) {
      const who = h.changedBy?.name ?? "-";
      const prospect = h.prospect?.namaProspek ?? "-";
      lines.push(`- ${prospect} — closed oleh ${who} pada ${fmt(h.changedAt)}`);
    }
  }

  const userContent = `Buatkan ringkasan WIP dari data berikut:\n\n${lines.join("\n")}`;

  try {
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
        temperature: 0.6,
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

    if (typeof content !== "string" && typeof content !== "object") {
      return NextResponse.json({ error: "AI returned unexpected content" }, { status: 502 });
    }

    const text = typeof content === "string" ? content : JSON.stringify(content);

    return NextResponse.json({ resume: text.trim() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Failed to call AI: " + message }, { status: 500 });
  }
}
