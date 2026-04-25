"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  Plus, X, CalendarDays, CheckCircle2, Clock,
  Edit2, Trash2, Activity, ChevronRight, Sparkles,
} from "lucide-react";
import Link from "next/link";

/* ─── Types ────────────────────────────────────────────────── */
interface Task {
  id: string;
  judul: string;
  tipeAktivitas: string;
  tanggalRencana: string;
  catatan: string | null;
  status: string;
  activityId: string | null;
  sales: { id: string; name: string };
  prospect: { id: string; namaProspek: string } | null;
  activity: { id: string } | null;
}

interface Prospect {
  id: string;
  namaProspek: string;
  stage: string;
  sales: { name: string };
}

interface SalesUser {
  id: string;
  name: string;
}

/* ─── Constants ─────────────────────────────────────────────── */
const ACTIVITY_TYPES = [
  "Email", "WA/Call", "Meeting Online", "Meeting Offline",
  "Presentasi", "Demo", "Negosiasi", "Follow Up", "Lainnya",
];

const EMPTY_FORM = {
  judul: "", tipeAktivitas: "Follow Up", tanggalRencana: "", catatan: "", prospectId: "", salesId: "",
};


/* ─── Status helpers ────────────────────────────────────────── */
function getTaskStatus(task: Task) {
  if (task.status === "done") return "done";
  if (task.status === "cancelled") return "cancelled";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const rencana = new Date(task.tanggalRencana); rencana.setHours(0, 0, 0, 0);
  if (rencana < today) return "overdue";
  if (rencana.getTime() === today.getTime()) return "today";
  return "upcoming";
}

const STATUS_BADGE: Record<string, string> = {
  overdue:  "bg-red-100 text-red-700 border-red-200",
  today:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  upcoming: "bg-blue-100 text-blue-700 border-blue-200",
  done:     "bg-green-100 text-green-700 border-green-200",
  cancelled:"bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_LABEL: Record<string, string> = {
  overdue: "Terlambat", today: "Hari Ini", upcoming: "Akan Datang",
  done: "Selesai", cancelled: "Dibatalkan",
};

function toISO(d: Date) { return d.toISOString().split("T")[0]; }

function getFilterBounds(period: string) {
  const now = new Date();
  if (period === "today") return { from: toISO(now), to: toISO(now) };
  if (period === "week") {
    const day = now.getDay(); const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(now); mon.setDate(now.getDate() + diff);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { from: toISO(mon), to: toISO(sun) };
  }
  if (period === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toISO(first), to: toISO(last) };
  }
  return { from: "", to: "" };
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function PlansPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active"); // active=planned+overdue
  const [filterSales, setFilterSales] = useState("");

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Mark done modal
  const [doneTask, setDoneTask] = useState<Task | null>(null);
  const [savingDone, setSavingDone] = useState(false);

  const fetchTasks = useCallback(() => {
    const { from, to } = getFilterBounds(period);
    const params = new URLSearchParams();
    if (from) params.set("dateFrom", from);
    if (to) params.set("dateTo", to);
    if (filterSales) params.set("salesId", filterSales);

    fetch(`/api/tasks?${params}`)
      .then(async (r) => {
        if (!r.ok) return [];
        const data = await r.json().catch(() => []);
        return Array.isArray(data) ? data : [];
      })
      .then(setTasks)
      .finally(() => setLoading(false));
  }, [period, filterSales]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    fetch("/api/pipeline")
      .then(async (r) => { const d = r.ok ? await r.json().catch(() => []) : []; return Array.isArray(d) ? d : []; })
      .then(setProspects);
    if (user?.role === "admin") {
      fetch("/api/admin/users")
        .then(async (r) => { const d = r.ok ? await r.json().catch(() => []) : []; return Array.isArray(d) ? d : []; })
        .then(setSalesUsers);
    }
  }, [user]);

  // Filter client-side by status
  const filtered = tasks.filter((t) => {
    const s = getTaskStatus(t);
    if (filterStatus === "active") return s === "overdue" || s === "today" || s === "upcoming";
    if (filterStatus === "done") return s === "done";
    if (filterStatus === "overdue") return s === "overdue";
    return true; // "all"
  });

  const openAdd = () => {
    setEditingTask(null);
    setForm({ ...EMPTY_FORM, tanggalRencana: toISO(new Date()), salesId: user?.userId || "" });
    setShowModal(true);
  };

  const openEdit = (t: Task) => {
    setEditingTask(t);
    setForm({
      judul: t.judul,
      tipeAktivitas: t.tipeAktivitas,
      tanggalRencana: toISO(new Date(t.tanggalRencana)),
      catatan: t.catatan || "",
      prospectId: t.prospect?.id || "",
      salesId: t.sales.id,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const method = editingTask ? "PUT" : "POST";
    const url = editingTask ? `/api/tasks/${editingTask.id}` : "/api/tasks";
    await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, prospectId: form.prospectId || null }),
    });
    setSaving(false);
    setShowModal(false);
    fetchTasks();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus rencana ini?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    fetchTasks();
  };

  // Mark done flow
  const openDone = (t: Task) => setDoneTask(t);

  const markDoneOnly = async () => {
    if (!doneTask) return;
    setSavingDone(true);
    await fetch(`/api/tasks/${doneTask.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    setSavingDone(false);
    setDoneTask(null);
    fetchTasks();
  };

  const goToMOM = () => {
    if (!doneTask) return;
    const params = new URLSearchParams({ taskId: doneTask.id });
    if (doneTask.prospect?.id) params.set("prospectId", doneTask.prospect.id);
    setDoneTask(null);
    router.push(`/mom/new?${params}`);
  };

  const pendingCount = tasks.filter((t) => {
    const s = getTaskStatus(t);
    return s === "overdue" || s === "today" || s === "upcoming";
  }).length;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Rencana Kegiatan</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">
            {pendingCount} rencana aktif · {tasks.length} total
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-sm">
          <Plus size={16} />
          <span className="hidden sm:inline">Tambah Rencana</span>
          <span className="sm:hidden">Tambah</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 p-3 md:p-4 space-y-3 md:space-y-0 md:flex md:items-center md:gap-3 md:flex-wrap">
        {/* Period buttons */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: "all", label: "Semua" },
            { key: "today", label: "Hari Ini" },
            { key: "week", label: "Minggu Ini" },
            { key: "month", label: "Bulan Ini" },
          ].map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                period === p.key ? "bg-yellow-400 text-gray-900" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 md:ml-auto">
          {/* Status filter */}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none text-gray-900 bg-white">
            <option value="active">Aktif</option>
            <option value="overdue">Terlambat</option>
            <option value="done">Selesai</option>
            <option value="all">Semua Status</option>
          </select>

          {/* Sales filter (admin only) */}
          {user?.role === "admin" && (
            <select value={filterSales} onChange={(e) => setFilterSales(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none text-gray-900 bg-white">
              <option value="">Semua Sales</option>
              {salesUsers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Tidak ada rencana ditemukan</p>
          <p className="text-sm mt-1">Klik Tambah Rencana untuk membuat rencana baru</p>
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Tanggal</th>
                  {user?.role === "admin" && <th className="text-left px-4 py-3 text-gray-600 font-semibold">Sales</th>}
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Tipe</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Prospek</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Rencana</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const st = getTaskStatus(t);
                  return (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(t.tanggalRencana).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      {user?.role === "admin" && <td className="px-4 py-3 text-gray-700">{t.sales.name}</td>}
                      <td className="px-4 py-3">
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full font-medium">{t.tipeAktivitas}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {t.prospect ? (
                          <Link href={`/pipeline/${t.prospect.id}`} className="hover:text-yellow-600 hover:underline">
                            {t.prospect.namaProspek}
                          </Link>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{t.judul}</div>
                        {t.catatan && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{t.catatan}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_BADGE[st]}`}>
                          {STATUS_LABEL[st]}
                        </span>
                        {t.activity && (
                          <Link href={`/activities`} className="ml-2 text-xs text-green-600 hover:underline flex items-center gap-0.5 inline-flex">
                            <Activity size={10} /> Aktivitas
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {t.status === "planned" && (
                            <button onClick={() => openDone(t)}
                              className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                              <CheckCircle2 size={13} /> Selesai
                            </button>
                          )}
                          <button onClick={() => openEdit(t)} className="text-gray-400 hover:text-yellow-600">
                            <Edit2 size={13} />
                          </button>
                          {(user?.role === "admin" || t.sales.id === user?.userId) && (
                            <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3">
            {filtered.map((t) => {
              const st = getTaskStatus(t);
              return (
                <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{t.judul}</div>
                      {user?.role === "admin" && <div className="text-xs text-gray-400">{t.sales.name}</div>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${STATUS_BADGE[st]}`}>
                      {STATUS_LABEL[st]}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">{t.tipeAktivitas}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(t.tanggalRencana).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {t.prospect && (
                      <Link href={`/pipeline/${t.prospect.id}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <ChevronRight size={10} />{t.prospect.namaProspek}
                      </Link>
                    )}
                  </div>

                  {t.catatan && <p className="text-xs text-gray-500 mb-3">{t.catatan}</p>}

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                    {t.status === "planned" && (
                      <button onClick={() => openDone(t)}
                        className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg font-medium">
                        <CheckCircle2 size={12} /> Tandai Selesai
                      </button>
                    )}
                    {t.activity && (
                      <Link href="/activities" className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <Activity size={12} /> Lihat Aktivitas
                      </Link>
                    )}
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => openEdit(t)} className="text-gray-400 hover:text-yellow-600 p-1">
                        <Edit2 size={14} />
                      </button>
                      {(user?.role === "admin" || t.sales.id === user?.userId) && (
                        <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 p-1">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editingTask ? "Edit Rencana" : "Tambah Rencana"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Admin: pilih sales */}
                {user?.role === "admin" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sales Penanggung Jawab</label>
                    <select required value={form.salesId} onChange={(e) => setForm((f) => ({ ...f, salesId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 bg-white text-gray-900">
                      <option value="">Pilih Sales</option>
                      {salesUsers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul / Deskripsi Rencana *</label>
                  <input required value={form.judul} onChange={(e) => setForm((f) => ({ ...f, judul: e.target.value }))}
                    placeholder="Contoh: Meeting presentasi produk dengan Ibu Ratna"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Aktivitas *</label>
                    <select required value={form.tipeAktivitas} onChange={(e) => setForm((f) => ({ ...f, tipeAktivitas: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 bg-white text-gray-900">
                      {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Rencana *</label>
                    <input required type="date" value={form.tanggalRencana}
                      onChange={(e) => setForm((f) => ({ ...f, tanggalRencana: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prospek Terkait <span className="text-gray-400 font-normal">(opsional)</span></label>
                  <select value={form.prospectId} onChange={(e) => setForm((f) => ({ ...f, prospectId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 bg-white text-gray-900">
                    <option value="">— Tanpa prospek —</option>
                    {prospects.map((p) => <option key={p.id} value={p.id}>{p.namaProspek}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan <span className="text-gray-400 font-normal">(opsional)</span></label>
                  <textarea value={form.catatan} onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))} rows={2}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-gray-900 rounded-xl text-sm font-semibold">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Mark Done Modal ── */}
      {doneTask && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Tandai Selesai</h2>
            <p className="text-sm text-gray-500 mb-1">
              <span className="font-medium text-gray-700">{doneTask.judul}</span>
            </p>
            {doneTask.prospect && (
              <p className="text-xs text-gray-400 mb-4">Prospek: {doneTask.prospect.namaProspek}</p>
            )}
            <div className="space-y-2">
              <button onClick={goToMOM}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                <Sparkles size={15} /> Buat MOM + Aktivitas via AI
              </button>
              <button onClick={markDoneOnly} disabled={savingDone}
                className="w-full py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                {savingDone ? "Menyimpan..." : "Selesaikan Saja (tanpa MOM)"}
              </button>
              <button onClick={() => setDoneTask(null)}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
