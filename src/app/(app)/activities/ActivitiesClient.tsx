"use client";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useSearchParams } from "next/navigation";

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
  "Email",
  "WA/Call",
  "Meeting Online",
  "Meeting Offline",
  "Presentasi",
  "Demo",
  "Negosiasi",
  "Follow Up",
  "Lainnya",
];

const STAGES = [
  "1. Lead/Prospek",
  "2. Outreach (Email/WA)",
  "3. Follow Up / Kit",
  "4. Meeting Discovery",
  "5. Demo/Presentasi",
  "6. Proposal Formal",
  "7. Negosiasi",
  "8. Pilot (opsional)",
  "9. Deal/Closed Won",
  "0. Closed Lost",
];

const EMPTY_FORM = {
  tipeAktivitas: "",
  prospectId: "",
  pic: "",
  topikHasil: "",
  nextStage: "",
  catatan: "",
  linkMOM: "",
  createMom: false,
  momTitle: "",
  momParticipants: "",
  momAgenda: "",
  momDiscussion: "",
  momDecisions: "",
  momActionItems: "",
  momNextMeeting: "",
  tanggal: new Date().toISOString().split("T")[0],
};

export default function ActivitiesClient() {
  const searchParams = useSearchParams();
  const prospectIdFromQuery = searchParams?.get("prospectId") || "";

  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [dismissedProspectId, setDismissedProspectId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchActivities = (prospectId?: string) => {
    const url = prospectId ? `/api/activities?prospectId=${encodeURIComponent(prospectId)}` : "/api/activities";
    return fetch(url)
      .then((r) => r.json())
      .then((data) => setActivities(data));
  };

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

  useEffect(() => {
    fetchActivities(prospectIdFromQuery || undefined);
  }, [prospectIdFromQuery]);

  useEffect(() => {
    fetch("/api/pipeline")
      .then((r) => r.json())
      .then(setProspects);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const effectiveProspectId = form.prospectId || prospectIdFromQuery;
    const selected = prospects.find((p) => p.id === effectiveProspectId);
    await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        prospectId: effectiveProspectId,
        pic: form.pic || selected?.kontakPIC || "",
        nextStage: form.nextStage || selected?.stage || "",
        namaProspek: selected?.namaProspek || "",
        mom: form.createMom
          ? {
              title: form.momTitle,
              participants: form.momParticipants,
              agenda: form.momAgenda,
              discussion: form.momDiscussion,
              decisions: form.momDecisions,
              actionItems: form.momActionItems,
              nextMeeting: form.momNextMeeting,
            }
          : undefined,
      }),
    });
    setSaving(false);
    setShowModal(false);
    setDismissedProspectId(prospectIdFromQuery);
    setForm(prospectIdFromQuery ? { ...EMPTY_FORM, prospectId: prospectIdFromQuery } : EMPTY_FORM);
    fetchActivities(prospectIdFromQuery || undefined);
  };

  const fc = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const effectiveProspectId = form.prospectId || prospectIdFromQuery;
  const selectedProspect = prospects.find((p) => p.id === effectiveProspectId);
  const modalOpen = showModal || (!!prospectIdFromQuery && dismissedProspectId !== prospectIdFromQuery);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-500 text-sm mt-0.5">Rekap aktivitas harian sales Â· {activities?.length ?? 0} aktivitas</p>
        </div>
        <button
          onClick={() => {
            setForm(EMPTY_FORM);
            setShowModal(true);
            setDismissedProspectId("");
            if (prospectIdFromQuery) handleProspectChange(prospectIdFromQuery);
          }}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-4 py-2.5 rounded-xl text-sm"
        >
          <Plus size={16} /> Catat Aktivitas
        </button>
      </div>

      {activities === null ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
        </div>
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
                  <td className="px-4 py-3 text-gray-700 font-medium">{a.prospect?.namaProspek || a.namaProspek || "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{a.topikHasil || "-"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>{a.nextStage || "-"}</span>
                      {a.linkMOM && (
                        <a
                          href={a.linkMOM}
                          className="text-xs text-yellow-700 hover:text-yellow-800 underline underline-offset-2"
                        >
                          MOM
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    Belum ada aktivitas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="font-semibold text-gray-900">Catat Aktivitas</div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setDismissedProspectId(prospectIdFromQuery);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal *</label>
                  <input
                    type="date"
                    required
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
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prospek *</label>
                  <select
                    required
                    value={effectiveProspectId}
                    onChange={(e) => handleProspectChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="">â€” Pilih Prospek â€”</option>
                    {prospects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.namaProspek} Â· {p.sales.name}
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
                    rows={2}
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
                    <option value="">â€” Pilih Stage â€”</option>
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
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

                {!form.createMom && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link MOM</label>
                    <input
                      value={form.linkMOM}
                      onChange={(e) => fc("linkMOM", e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="https://..."
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!form.createMom}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm((f) => {
                          if (!checked) return { ...f, createMom: false };
                          const autoTitle =
                            f.momTitle ||
                            (selectedProspect
                              ? `MOM - ${selectedProspect.namaProspek}`
                              : f.tipeAktivitas
                                ? `MOM - ${f.tipeAktivitas}`
                                : "MOM");
                          return { ...f, createMom: true, momTitle: autoTitle };
                        });
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
                    />
                    Buat MOM sekalian
                  </label>
                  <div className="text-xs text-gray-400 mt-1">
                    Jika dicentang, link MOM akan dibuat otomatis (field Link MOM disembunyikan).
                  </div>
                </div>

                {form.createMom && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Judul MOM *</label>
                      <input
                        required
                        value={form.momTitle}
                        onChange={(e) => fc("momTitle", e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="Meeting - Update Progress - ..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Peserta (pisah dengan koma)</label>
                      <input
                        value={form.momParticipants}
                        onChange={(e) => fc("momParticipants", e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="Budi, Ibu Ratna, Pak Bambang"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Agenda</label>
                      <textarea
                        value={form.momAgenda}
                        onChange={(e) => fc("momAgenda", e.target.value)}
                        rows={2}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="Poin agenda meeting..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Diskusi</label>
                      <textarea
                        value={form.momDiscussion}
                        onChange={(e) => fc("momDiscussion", e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="Ringkasan diskusi..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Keputusan</label>
                      <textarea
                        value={form.momDecisions}
                        onChange={(e) => fc("momDecisions", e.target.value)}
                        rows={2}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="Keputusan yang disepakati..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Action Items</label>
                      <textarea
                        value={form.momActionItems}
                        onChange={(e) => fc("momActionItems", e.target.value)}
                        rows={2}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="PIC dan deadline..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Next Meeting (opsional)</label>
                      <input
                        type="date"
                        value={form.momNextMeeting}
                        onChange={(e) => fc("momNextMeeting", e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-gray-100 bg-white">
                <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setDismissedProspectId(prospectIdFromQuery);
                  }}
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
