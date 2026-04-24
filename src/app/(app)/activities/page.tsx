"use client";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

interface Activity {
  id: string;
  tanggal: string;
  tipeAktivitas: string;
  namaProspek: string;
  pic: string;
  topikHasil: string;
  nextStage: string;
  catatan: string;
  linkMOM: string;
  sales: { name: string };
  prospect?: { namaProspek: string };
}

interface Prospect {
  id: string;
  namaProspek: string;
  stage: string;
  kontakPIC: string;
  sales: { name: string };
}

const ACTIVITY_TYPES = [
  "Email", "WA/Call", "Meeting Online", "Meeting Offline",
  "Presentasi", "Demo", "Negosiasi", "Follow Up", "Lainnya",
];

const STAGES = [
  "1. Lead/Prospek", "2. Outreach (Email/WA)", "3. Follow Up / Kit",
  "4. Meeting Discovery", "5. Demo/Presentasi", "6. Proposal Formal",
  "7. Negosiasi", "8. Closed Won", "9. Closed Lost",
];

const EMPTY_FORM = {
  tipeAktivitas: "",
  prospectId: "",
  pic: "",
  topikHasil: "",
  nextStage: "",
  catatan: "",
  linkMOM: "",
  tanggal: new Date().toISOString().split("T")[0],
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/activities").then((r) => r.json()).then(setActivities).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetch("/api/pipeline").then((r) => r.json()).then(setProspects);
  }, []);

  // Auto-fill PIC when prospect selected
  const handleProspectChange = (prospectId: string) => {
    const p = prospects.find((x) => x.id === prospectId);
    setForm((f) => ({
      ...f,
      prospectId,
      pic: p?.kontakPIC || f.pic,
      nextStage: p?.stage || f.nextStage,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const selected = prospects.find((p) => p.id === form.prospectId);
    await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        namaProspek: selected?.namaProspek || "",
      }),
    });
    setSaving(false);
    setShowModal(false);
    setForm(EMPTY_FORM);
    load();
  };

  const fc = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const selectedProspect = prospects.find((p) => p.id === form.prospectId);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-500 text-sm mt-0.5">Rekap aktivitas harian sales · {activities.length} aktivitas</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-4 py-2.5 rounded-xl text-sm"
        >
          <Plus size={16} /> Catat Aktivitas
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" /></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Tanggal</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Sales</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Tipe</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Prospek</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Topik / Hasil</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Next Stage</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(a.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.sales.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">{a.tipeAktivitas}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {a.prospect?.namaProspek || a.namaProspek || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{a.topikHasil || "-"}</td>
                  <td className="px-4 py-3">
                    {a.nextStage && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{a.nextStage}</span>
                    )}
                  </td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Belum ada aktivitas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h2 className="font-bold text-gray-900">Catat Aktivitas</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => fc("tanggal", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Aktivitas *</label>
                <select
                  required
                  value={form.tipeAktivitas}
                  onChange={(e) => fc("tipeAktivitas", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Pilih Tipe</option>
                  {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prospek *</label>
                <select
                  required
                  value={form.prospectId}
                  onChange={(e) => handleProspectChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">— Pilih Prospek —</option>
                  {prospects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.namaProspek} · {p.sales.name}
                    </option>
                  ))}
                </select>
                {selectedProspect && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{selectedProspect.stage}</span>
                    <span>Sales: {selectedProspect.sales.name}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIC yang Ditemui</label>
                <input
                  value={form.pic}
                  onChange={(e) => fc("pic", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Nama kontak yang ditemui"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topik / Hasil Singkat</label>
                <textarea
                  value={form.topikHasil}
                  onChange={(e) => fc("topikHasil", e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Ringkasan hasil aktivitas..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Stage Pasca Aktivitas</label>
                <select
                  value={form.nextStage}
                  onChange={(e) => fc("nextStage", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">— Pilih Stage —</option>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Tambahan</label>
                <textarea
                  value={form.catatan}
                  onChange={(e) => fc("catatan", e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Catatan tambahan..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link MOM</label>
                <input
                  value={form.linkMOM}
                  onChange={(e) => fc("linkMOM", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-xl text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
