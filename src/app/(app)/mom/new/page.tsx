"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Sparkles, Loader2, ChevronRight, CheckCircle2, RefreshCw } from "lucide-react";
import Link from "next/link";

const STAGES = [
  "1. Lead/Prospek", "2. Outreach (Email/WA)", "3. Follow Up / Kit",
  "4. Meeting Discovery", "5. Demo/Presentasi", "6. Proposal Formal",
  "7. Negosiasi", "8. Pilot (opsional)", "9. Deal/Closed Won", "0. Closed Lost",
];
const ACTIVITY_TYPES = [
  "Email", "WA/Call", "Meeting Online", "Meeting Offline",
  "Presentasi", "Demo", "Negosiasi", "Follow Up", "Lainnya",
];

interface Prospect {
  id: string;
  namaProspek: string;
  stage: string;
  sales: { name: string };
}

interface AIDraft {
  mom: {
    title: string;
    agenda: string;
    discussion: string;
    decisions: string;
    actionItems: string;
    nextMeeting: string | null;
  };
  pipeline: {
    suggestedStage: string;
    probability: number;
    nextAction: string;
    statusUpdate: string;
  };
  activity: {
    tipeAktivitas: string;
    topikHasil: string;
    nextStage: string;
    catatan: string;
  };
}

function MOMFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultProspectId = searchParams.get("prospectId") || "";

  const [step, setStep] = useState<"input" | "review">("input");
  const [prospects, setProspects] = useState<Prospect[]>([]);

  // Step 1 state
  const [rawNotes, setRawNotes] = useState("");
  const [selectedProspectId, setSelectedProspectId] = useState(defaultProspectId);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [participants, setParticipants] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  // Step 2 state — editable draft
  const [draft, setDraft] = useState<AIDraft | null>(null);
  const [applyPipeline, setApplyPipeline] = useState(true);
  const [applyActivity, setApplyActivity] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/pipeline").then((r) => r.json()).then(setProspects);
  }, []);

  const selectedProspect = prospects.find((p) => p.id === selectedProspectId);

  const handleGenerate = async () => {
    if (!rawNotes.trim()) { setGenError("Isi catatan meeting terlebih dahulu"); return; }
    setGenerating(true);
    setGenError("");

    const res = await fetch("/api/mom/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawNotes,
        prospectName: selectedProspect?.namaProspek || "",
        currentStage: selectedProspect?.stage || "",
      }),
    });

    setGenerating(false);
    const resData = await res.json();
    if (!res.ok) {
      console.error("Generate error:", resData);
      setGenError(resData.error || "Gagal generate draft");
      return;
    }
    const { draft: aiDraft } = resData;
    setDraft(aiDraft);
    setStep("review");
  };

  const updateDraftMom = (key: string, val: string) =>
    setDraft((d) => d ? { ...d, mom: { ...d.mom, [key]: val } } : d);

  const updateDraftPipeline = (key: string, val: string | number) =>
    setDraft((d) => d ? { ...d, pipeline: { ...d.pipeline, [key]: val } } : d);

  const updateDraftActivity = (key: string, val: string) =>
    setDraft((d) => d ? { ...d, activity: { ...d.activity, [key]: val } } : d);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setSaveError("");

    try {
      // 1. Save MOM
      const momRes = await fetch("/api/mom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.mom.title,
          tanggal,
          prospectId: selectedProspectId || null,
          participants,
          agenda: draft.mom.agenda,
          discussion: draft.mom.discussion,
          decisions: draft.mom.decisions,
          actionItems: draft.mom.actionItems,
          nextMeeting: draft.mom.nextMeeting || null,
        }),
      });
      if (!momRes.ok) throw new Error("Gagal menyimpan MOM");
      const momData = await momRes.json();

      // 2. Update pipeline stage (if toggled + prospect selected)
      if (applyPipeline && selectedProspectId) {
        await fetch(`/api/pipeline/${selectedProspectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: draft.pipeline.suggestedStage,
            probability: draft.pipeline.probability,
            nextAction: draft.pipeline.nextAction,
          }),
        });
      }

      // 3. Create activity log (if toggled + prospect selected)
      if (applyActivity && selectedProspectId) {
        await fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prospectId: selectedProspectId,
            namaProspek: selectedProspect?.namaProspek || "",
            tanggal,
            tipeAktivitas: draft.activity.tipeAktivitas,
            topikHasil: draft.activity.topikHasil,
            nextStage: draft.activity.nextStage,
            catatan: draft.activity.catatan,
            linkMOM: `/mom/${momData.id}`,
          }),
        });
      }

      router.push(`/mom/${momData.id}`);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Terjadi error");
      setSaving(false);
    }
  };

  // ─── Step 1: Input ───────────────────────────────────────────────
  if (step === "input") {
    return (
      <div className="p-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/mom" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Buat MOM dengan AI</h1>
            <p className="text-sm text-gray-500 mt-0.5">Paste catatan meeting mentah → AI akan strukturkan otomatis</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          {/* Prospect & Tanggal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Prospek Terkait</label>
              <select
                value={selectedProspectId}
                onChange={(e) => setSelectedProspectId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white"
              >
                <option value="">— Pilih Prospek —</option>
                {prospects.map((p) => (
                  <option key={p.id} value={p.id}>{p.namaProspek}</option>
                ))}
              </select>
              {selectedProspect && (
                <p className="text-xs text-gray-500 mt-1">
                  Stage: <span className="text-blue-600 font-medium">{selectedProspect.stage}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Meeting</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Peserta (opsional)</label>
              <input
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white"
                placeholder="Budi Santoso, Ibu Ratna, Pak Bambang"
              />
            </div>
          </div>

          {/* Raw Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catatan Meeting Mentah <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              rows={12}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white font-mono"
              placeholder={`Contoh:\nMeeting dengan SMESCO tgl 22 Apr\nHadir: Pak Ade, Tim Sales MWX\n\n- Diskusi webinar series 2x seminggu\n- Harga Rp 150-170rb per peserta\n- Dirut SMESCO minta review dashboard langsung\n- Whitelabel butuh proposal teknis\n\nNext: kirim proposal teknis minggu ini\nMeeting lanjutan: 29 Apr`}
            />
            <p className="text-xs text-gray-400 mt-1">
              {rawNotes.length} karakter · Tidak perlu format tertentu, tulis bebas
            </p>
          </div>

          {genError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{genError}</div>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/mom" className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 text-center">
              Batal
            </Link>
            <button
              onClick={handleGenerate}
              disabled={generating || !rawNotes.trim()}
              className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-gray-900 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              {generating ? (
                <><Loader2 size={16} className="animate-spin" /> AI sedang memproses...</>
              ) : (
                <><Sparkles size={16} /> Generate Draft dengan AI</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 2: Review & Edit Draft ─────────────────────────────────
  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => setStep("input")} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Draft AI</h1>
          <p className="text-sm text-gray-500 mt-0.5">Edit sesuai kebutuhan, lalu simpan semua sekaligus</p>
        </div>
        <button
          onClick={() => setStep("input")}
          className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5"
        >
          <RefreshCw size={12} /> Generate ulang
        </button>
      </div>

      {/* Progress breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <span className="text-gray-400">Catatan mentah</span>
        <ChevronRight size={12} />
        <span className="text-yellow-600 font-semibold">Review draft</span>
        <ChevronRight size={12} />
        <span>Tersimpan</span>
      </div>

      {draft && (
        <div className="space-y-5">
          {/* ── MOM Section ─────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50">
              <CheckCircle2 size={16} className="text-green-500" />
              <h2 className="font-semibold text-gray-900">Minutes of Meeting</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Judul</label>
                <input
                  value={draft.mom.title}
                  onChange={(e) => updateDraftMom("title", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Tanggal</label>
                  <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Next Meeting</label>
                  <input type="date" value={draft.mom.nextMeeting || ""}
                    onChange={(e) => updateDraftMom("nextMeeting", e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Peserta</label>
                <input value={participants} onChange={(e) => setParticipants(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Agenda</label>
                <textarea value={draft.mom.agenda} onChange={(e) => updateDraftMom("agenda", e.target.value)} rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Diskusi & Pembahasan</label>
                <textarea value={draft.mom.discussion} onChange={(e) => updateDraftMom("discussion", e.target.value)} rows={4}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Keputusan Disepakati</label>
                <textarea value={draft.mom.decisions} onChange={(e) => updateDraftMom("decisions", e.target.value)} rows={3}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Action Items</label>
                <textarea value={draft.mom.actionItems} onChange={(e) => updateDraftMom("actionItems", e.target.value)} rows={3}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" />
              </div>
            </div>
          </div>

          {/* ── Pipeline Update ──────────────────────────────── */}
          {selectedProspectId && (
            <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-colors ${applyPipeline ? "border-blue-200" : "border-gray-100"}`}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer ${applyPipeline ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}
                    onClick={() => setApplyPipeline(!applyPipeline)}>
                    {applyPipeline && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <h2 className="font-semibold text-gray-900">Update Pipeline Stage</h2>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${applyPipeline ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                  {applyPipeline ? "Akan diupdate" : "Skip"}
                </span>
              </div>
              {applyPipeline && (
                <div className="p-6 space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
                    <span className="font-medium">AI Insight:</span> {draft.pipeline.statusUpdate}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Stage Baru</label>
                      <select value={draft.pipeline.suggestedStage}
                        onChange={(e) => updateDraftPipeline("suggestedStage", e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white">
                        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                        Probability ({Math.round(draft.pipeline.probability * 100)}%)
                      </label>
                      <input type="range" min="0" max="100" step="5"
                        value={Math.round(draft.pipeline.probability * 100)}
                        onChange={(e) => updateDraftPipeline("probability", parseInt(e.target.value) / 100)}
                        className="w-full mt-2 accent-yellow-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Next Action</label>
                    <input value={draft.pipeline.nextAction}
                      onChange={(e) => updateDraftPipeline("nextAction", e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Activity Log ─────────────────────────────────── */}
          {selectedProspectId && (
            <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-colors ${applyActivity ? "border-purple-200" : "border-gray-100"}`}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer ${applyActivity ? "border-purple-500 bg-purple-500" : "border-gray-300"}`}
                    onClick={() => setApplyActivity(!applyActivity)}>
                    {applyActivity && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <h2 className="font-semibold text-gray-900">Tambah ke Activity Log</h2>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${applyActivity ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
                  {applyActivity ? "Akan dicatat" : "Skip"}
                </span>
              </div>
              {applyActivity && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Tipe Aktivitas</label>
                      <select value={draft.activity.tipeAktivitas}
                        onChange={(e) => updateDraftActivity("tipeAktivitas", e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white">
                        {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Next Stage</label>
                      <select value={draft.activity.nextStage}
                        onChange={(e) => updateDraftActivity("nextStage", e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white">
                        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Topik / Hasil Singkat</label>
                    <textarea value={draft.activity.topikHasil}
                      onChange={(e) => updateDraftActivity("topikHasil", e.target.value)} rows={2}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Catatan</label>
                    <textarea value={draft.activity.catatan}
                      onChange={(e) => updateDraftActivity("catatan", e.target.value)} rows={2}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" />
                  </div>
                </div>
              )}
            </div>
          )}

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{saveError}</div>
          )}

          {/* Save button */}
          <div className="flex gap-3 pb-8">
            <button onClick={() => setStep("input")}
              className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              Kembali Edit
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-2 w-full py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-gray-900 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
              {saving ? (
                <><Loader2 size={16} className="animate-spin" /> Menyimpan...</>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Simpan MOM{applyPipeline && selectedProspectId ? " + Pipeline" : ""}{applyActivity && selectedProspectId ? " + Activity" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewMOMPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Memuat...</div>}>
      <MOMFormInner />
    </Suspense>
  );
}
