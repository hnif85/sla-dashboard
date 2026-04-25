"use client";
import { useEffect, useState } from "react";
import { Plus, X, Search, ExternalLink, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

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
  prospect?: { id: string; namaProspek: string };
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
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const prospectIdFromQuery = searchParams?.get("prospectId") || "";

  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [dismissedProspectId, setDismissedProspectId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTipe, setFilterTipe] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDeleteActivity = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Yakin hapus aktivitas ini?")) return;
    setDeletingId(id);
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (selectedActivity?.id === id) setSelectedActivity(null);
    fetchActivities(prospectIdFromQuery || undefined);
  };

  const fc = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const effectiveProspectId = form.prospectId || prospectIdFromQuery;
  const selectedProspect = prospects.find((p) => p.id === effectiveProspectId);
  const modalOpen = showModal || (!!prospectIdFromQuery && dismissedProspectId !== prospectIdFromQuery);

  const filtered = (activities ?? []).filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (a.prospect?.namaProspek || a.namaProspek || "").toLowerCase().includes(q) ||
      a.sales.name.toLowerCase().includes(q) ||
      (a.topikHasil || "").toLowerCase().includes(q);
    const matchTipe = !filterTipe || a.tipeAktivitas === filterTipe;
    return matchSearch && matchTipe;
  });

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">
            {search || filterTipe
              ? `${filtered.length} dari ${activities?.length ?? 0} aktivitas`
              : `${activities?.length ?? 0} aktivitas`}
          </p>
        </div>
        <button
          onClick={() => {
            setForm(EMPTY_FORM);
            setShowModal(true);
            setDismissedProspectId("");
            if (prospectIdFromQuery) handleProspectChange(prospectIdFromQuery);
          }}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-sm"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Catat Aktivitas</span>
          <span className="sm:hidden">Catat</span>
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 p-3 md:p-4 space-y-2 md:space-y-0 md:flex md:items-center md:gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Cari prospek atau sales..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none min-w-0 text-gray-900 bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600 shrink-0">
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={filterTipe}
          onChange={(e) => setFilterTipe(e.target.value)}
          className="w-full md:w-auto text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none text-gray-900 bg-white"
        >
          <option value="">Semua Tipe</option>
          {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {activities === null ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Tanggal</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Sales</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Tipe</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Prospek</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Topik / Hasil</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Next Stage</th>
                  {user?.role === "admin" && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedActivity(a)}
                    className="border-b border-gray-50 hover:bg-yellow-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(a.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{a.sales.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">{a.tipeAktivitas}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{a.prospect?.namaProspek || a.namaProspek || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{a.topikHasil || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="text-xs">{a.nextStage || "-"}</span>
                    </td>
                    {user?.role === "admin" && (
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={(e) => handleDeleteActivity(e, a.id)}
                          disabled={deletingId === a.id}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                          title="Hapus Aktivitas"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={user?.role === "admin" ? 7 : 6} className="text-center py-12 text-gray-400">
                    {search || filterTipe ? "Tidak ada aktivitas yang cocok" : "Belum ada aktivitas"}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
                {search || filterTipe ? "Tidak ada aktivitas yang cocok" : "Belum ada aktivitas"}
              </div>
            )}
            {filtered.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelectedActivity(a)}
                className="relative group bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{a.tipeAktivitas}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(a.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <div className="font-semibold text-gray-900 text-sm mb-0.5 pr-7">{a.prospect?.namaProspek || a.namaProspek || "-"}</div>
                <div className="text-xs text-gray-400 mb-2">{a.sales.name}</div>
                {a.topikHasil && <p className="text-sm text-gray-600 leading-relaxed mb-2 line-clamp-2">{a.topikHasil}</p>}
                {a.nextStage && (
                  <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{a.nextStage}</span>
                )}
                {user?.role === "admin" && (
                  <button
                    onClick={(e) => handleDeleteActivity(e, a.id)}
                    disabled={deletingId === a.id}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                    title="Hapus Aktivitas"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setSelectedActivity(null)}>
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <span className="inline-block text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium mb-1.5">
                  {selectedActivity.tipeAktivitas}
                </span>
                <div className="text-sm text-gray-500">
                  {new Date(selectedActivity.tanggal).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>
              <button onClick={() => setSelectedActivity(null)} className="text-gray-400 hover:text-gray-600 mt-1">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Prospek */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-0.5">Prospek</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {selectedActivity.prospect?.namaProspek || selectedActivity.namaProspek || "-"}
                  </div>
                </div>
                {selectedActivity.prospect?.id && (
                  <Link
                    href={`/pipeline/${selectedActivity.prospect.id}`}
                    className="flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-700 font-medium shrink-0 mt-4"
                    onClick={() => setSelectedActivity(null)}
                  >
                    <ExternalLink size={12} />
                    Lihat Pipeline
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Sales</div>
                  <div className="text-sm text-gray-900">{selectedActivity.sales.name}</div>
                </div>
                {selectedActivity.pic && (
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">PIC yang Ditemui</div>
                    <div className="text-sm text-gray-900">{selectedActivity.pic}</div>
                  </div>
                )}
              </div>

              {selectedActivity.topikHasil && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Topik / Hasil</div>
                  <div className="text-sm text-gray-800 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">
                    {selectedActivity.topikHasil}
                  </div>
                </div>
              )}

              {selectedActivity.catatan && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Catatan</div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">
                    {selectedActivity.catatan}
                  </div>
                </div>
              )}

              {selectedActivity.nextStage && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Next Stage</div>
                  <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                    {selectedActivity.nextStage}
                  </span>
                </div>
              )}

              {selectedActivity.linkMOM && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">MOM</div>
                  {selectedActivity.linkMOM.startsWith("/") ? (
                    <Link
                      href={selectedActivity.linkMOM}
                      className="flex items-center gap-1.5 text-sm text-yellow-700 hover:text-yellow-800 font-medium"
                      onClick={() => setSelectedActivity(null)}
                    >
                      <ExternalLink size={13} />
                      Lihat Minutes of Meeting
                    </Link>
                  ) : (
                    <a
                      href={selectedActivity.linkMOM}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-sm text-yellow-700 hover:text-yellow-800 font-medium"
                    >
                      <ExternalLink size={13} />
                      Lihat MOM
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex gap-2">
              {user?.role === "admin" && (
                <button
                  onClick={(e) => handleDeleteActivity(e, selectedActivity.id)}
                  disabled={deletingId === selectedActivity.id}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl font-medium disabled:opacity-50 transition-colors"
                >
                  <Trash2 size={13} />
                  Hapus
                </button>
              )}
              <button
                onClick={() => setSelectedActivity(null)}
                className="flex-1 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
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
