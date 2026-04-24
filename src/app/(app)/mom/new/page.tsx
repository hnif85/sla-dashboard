"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

function MOMFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prospectId = searchParams.get("prospectId");

  const [form, setForm] = useState({
    title: "",
    tanggal: new Date().toISOString().split("T")[0],
    prospectId: prospectId || "",
    participants: "",
    agenda: "",
    discussion: "",
    decisions: "",
    actionItems: "",
    nextMeeting: "",
  });
  const [prospects, setProspects] = useState<Array<{ id: string; namaProspek: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/pipeline").then((r) => r.json()).then(setProspects);
  }, []);

  const fc = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/mom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    if (!res.ok) { setError("Gagal menyimpan MOM"); return; }
    const data = await res.json();
    router.push(`/mom/${data.id}`);
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/mom" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-gray-900">Buat MOM Baru</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul MOM *</label>
            <input required value={form.title} onChange={(e) => fc("title", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Meeting Negosiasi - PT Telkom" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Meeting</label>
            <input type="date" value={form.tanggal} onChange={(e) => fc("tanggal", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Terkait Prospek</label>
            <select value={form.prospectId} onChange={(e) => fc("prospectId", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">- Tidak terkait -</option>
              {prospects.map((p) => <option key={p.id} value={p.id}>{p.namaProspek}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Peserta (pisah dengan koma)</label>
            <input value={form.participants} onChange={(e) => fc("participants", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Budi Santoso, Ibu Ratna, Pak Bambang" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Agenda</label>
          <textarea value={form.agenda} onChange={(e) => fc("agenda", e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="1. Review proposal\n2. Diskusi harga\n3. Next steps" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Diskusi & Pembahasan</label>
          <textarea value={form.discussion} onChange={(e) => fc("discussion", e.target.value)} rows={4}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Detail pembahasan dalam meeting..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Keputusan yang Disepakati</label>
          <textarea value={form.decisions} onChange={(e) => fc("decisions", e.target.value)} rows={3}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="- Setuju lanjut ke tahap negosiasi harga\n- Revisi proposal dikirim Jumat" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Action Items (PIC & Deadline)</label>
          <textarea value={form.actionItems} onChange={(e) => fc("actionItems", e.target.value)} rows={3}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="- Budi: Revisi proposal → Jumat 26 Apr\n- Ibu Ratna: Approval internal → Senin 29 Apr" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Next Meeting (opsional)</label>
          <input type="date" value={form.nextMeeting} onChange={(e) => fc("nextMeeting", e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

        <div className="flex gap-3 pt-2">
          <Link href="/mom" className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 text-center">Batal</Link>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-xl text-sm font-semibold disabled:opacity-60">
            {saving ? "Menyimpan..." : "Simpan MOM"}
          </button>
        </div>
      </form>
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
