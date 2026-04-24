import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

const AI_URL = process.env.AI_API_URL!;
const AI_KEY = process.env.AI_API_KEY!;

const SYSTEM_PROMPT = `Kamu adalah asisten notulen meeting profesional untuk tim sales partnership MWX — perusahaan AI tools untuk UMKM Indonesia.

Tugasmu: ubah catatan meeting mentah menjadi output terstruktur JSON.

Gunakan PERSIS struktur berikut (tidak boleh ada field tambahan):
{
  "mom": {
    "title": "judul singkat meeting (contoh: Meeting Negosiasi - SMESCO)",
    "agenda": "poin-poin agenda yang dibahas",
    "discussion": "ringkasan diskusi dan poin-poin utama yang dibahas",
    "decisions": "keputusan-keputusan yang disepakati dalam meeting",
    "actionItems": "action items format: - [PIC]: [tugas] → [deadline]",
    "nextMeeting": "tanggal meeting berikutnya format YYYY-MM-DD, atau null jika tidak ada"
  },
  "pipeline": {
    "suggestedStage": "HARUS salah satu persis dari: 1. Lead/Prospek | 2. Outreach (Email/WA) | 3. Follow Up / Kit | 4. Meeting Discovery | 5. Demo/Presentasi | 6. Proposal Formal | 7. Negosiasi | 8. Pilot (opsional) | 9. Deal/Closed Won | 0. Closed Lost",
    "probability": 0.5,
    "nextAction": "next action konkret yang harus dilakukan sales",
    "statusUpdate": "ringkasan singkat kenapa stage ini yang disarankan"
  },
  "activity": {
    "tipeAktivitas": "HARUS salah satu persis dari: Email | WA/Call | Meeting Online | Meeting Offline | Presentasi | Demo | Negosiasi | Follow Up | Lainnya",
    "topikHasil": "ringkasan hasil aktivitas (max 150 karakter)",
    "nextStage": "stage berikutnya yang sama dengan pipeline.suggestedStage",
    "catatan": "catatan tambahan yang relevan"
  }
}`;

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rawNotes, prospectName, currentStage } = await req.json();
  if (!rawNotes?.trim()) return NextResponse.json({ error: "Raw notes diperlukan" }, { status: 400 });

  const userContent = `Tolong buat MOM dari catatan meeting berikut:

Prospek: ${prospectName || "tidak disebutkan"}
Stage saat ini: ${currentStage || "tidak diketahui"}

Catatan meeting:
${rawNotes}

Berikan output dalam format JSON yang diminta.`;

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
        temperature: 0.4,
        top_p: 1,
        response_format: { type: "json_object" },
        debug: false,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return NextResponse.json({ error: "AI API error: " + errText }, { status: 502 });
    }

    const aiData = await aiRes.json();
    const rawContent = aiData?.data?.content;

    let parsed;
    try {
      if (typeof rawContent === "object" && rawContent !== null) {
        parsed = rawContent;
      } else if (typeof rawContent === "string") {
        // Strip markdown code fences if present: ```json ... ``` or ``` ... ```
        const stripped = rawContent
          .trim()
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        parsed = JSON.parse(stripped);
      } else {
        throw new Error("Unexpected content type: " + typeof rawContent);
      }
    } catch (parseErr) {
      console.error("AI parse error:", parseErr, "\nRaw content:", rawContent);
      return NextResponse.json(
        { error: "AI returned invalid JSON", raw: String(rawContent).slice(0, 500) },
        { status: 502 }
      );
    }

    // Validate top-level keys exist
    if (!parsed.mom || !parsed.pipeline || !parsed.activity) {
      console.error("AI response missing required keys:", Object.keys(parsed));
      return NextResponse.json(
        { error: "AI response structure tidak lengkap, coba generate ulang", raw: JSON.stringify(parsed).slice(0, 500) },
        { status: 502 }
      );
    }

    return NextResponse.json({
      draft: parsed,
      usage: aiData?.data?.usage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Failed to call AI: " + message }, { status: 500 });
  }
}
