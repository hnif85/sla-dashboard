"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

interface MOMData {
  title: string;
  tanggal: string;
  participants: string;
  agenda: string;
  discussion: string;
  decisions: string;
  actionItems: string;
  nextMeeting: string;
}

export default function EditMOMPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [form, setForm] = useState<MOMData>({
    title: "", tanggal: "", participants: "",
    agenda: "", discussion: "", decisions: "",
    actionItems: "", nextMeeting: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/mom/${id}`).then((r) => r.json()).then((data) => {
      setForm({
        title: data.title || "",
        tanggal: data.tanggal ? (() => { const d = new Date(data.tanggal); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })() : "",
        participants: data.participants || "",
        agenda: data.agenda || "",
        discussion: data.discussion || "",
        decisions: data.decisions || "",
        actionItems: data.actionItems || "",
        nextMeeting: data.nextMeeting ? (() => { const d = new Date(data.nextMeeting); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })() : "",
      });
      setLoading(false);
    });
  }, [id]);

  const fc = (k: keyof MOMData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/mom/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { setError("Gagal menyimpan"); return; }
    router.push(`/mom/${id}`);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
    </div>
  );

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/mom/${id}`} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit MOM</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul MOM *</label>
            <input required value={form.title} onChange={(e) => fc("title", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
            <input type="date" value={form.tanggal} onChange={(e) => fc("tanggal", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Meeting</label>
            <input type="date" value={form.nextMeeting} onChange={(e) => fc("nextMeeting", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Peserta</label>
            <input value={form.participants} onChange={(e) => fc("participants", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
        </div>
        {(["agenda", "discussion", "decisions", "actionItems"] as const).map((key) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
              {key === "actionItems" ? "Action Items" : key === "discussion" ? "Diskusi" : key === "decisions" ? "Keputusan" : "Agenda"}
            </label>
            <textarea value={form[key]} onChange={(e) => fc(key, e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
        ))}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
        <div className="flex gap-3 pt-2">
          <Link href={`/mom/${id}`} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 text-center">Batal</Link>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
            <Save size={14} /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
