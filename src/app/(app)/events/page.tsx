"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Search, Megaphone, MapPin, Monitor, Users,
  FileText, Pencil, Trash2, X, Loader2, ChevronRight,
  CalendarDays, Package, UserCheck, GripVertical,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */
interface ProspectOption {
  id: string;
  namaProspek: string;
  stage: string;
  sales: { name: string };
}

interface TrainerUser {
  id: string;
  name: string;
  email: string;
  region: string | null;
}

interface TrainerRow {
  id?: string;       // EventTrainer record id (present when loaded from DB)
  trainerId: string;
  topik: string;
}

interface EventTrainerItem {
  id: string;
  trainerId: string;
  topik: string | null;
  order: number;
  trainer: { id: string; name: string; email: string; region: string | null };
}

interface EventItem {
  id: string;
  namaEvent: string;
  tanggal: string;
  lokasiType: string;
  lokasiDetail: string | null;
  salesId: string;
  prospectId: string | null;
  target: string | null;
  jumlahPeserta: number | null;
  jumlahAplikasi: number | null;
  resume: string | null;
  sales: { id: string; name: string };
  prospect: { id: string; namaProspek: string; stage: string } | null;
  trainers: EventTrainerItem[];
}

type FormState = {
  namaEvent: string;
  tanggal: string;
  lokasiType: "online" | "offline";
  lokasiDetail: string;
  prospectId: string;
  target: string;
  jumlahPeserta: string;
  jumlahAplikasi: string;
  resume: string;
  salesId: string;
  trainers: TrainerRow[];
};

const EMPTY_TRAINER: TrainerRow = { trainerId: "", topik: "" };

const EMPTY_FORM: FormState = {
  namaEvent: "", tanggal: "", lokasiType: "online", lokasiDetail: "",
  prospectId: "", target: "", jumlahPeserta: "", jumlahAplikasi: "",
  resume: "", salesId: "", trainers: [],
};

/* ─── Helpers ────────────────────────────────────────────────── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function toInputDate(iso: string) {
  return iso.split("T")[0];
}

/* ─── Modal ──────────────────────────────────────────────────── */
function EventModal({
  initial, prospects, users, onClose, onSaved, userRole,
}: {
  initial?: EventItem | null;
  prospects: ProspectOption[];
  users: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (ev: EventItem) => void;
  userRole: string;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          namaEvent: initial.namaEvent,
          tanggal: toInputDate(initial.tanggal),
          lokasiType: initial.lokasiType as "online" | "offline",
          lokasiDetail: initial.lokasiDetail ?? "",
          prospectId: initial.prospectId ?? "",
          target: initial.target ?? "",
          jumlahPeserta: initial.jumlahPeserta != null ? String(initial.jumlahPeserta) : "",
          jumlahAplikasi: initial.jumlahAplikasi != null ? String(initial.jumlahAplikasi) : "",
          resume: initial.resume ?? "",
          salesId: initial.sales.id,
          trainers: initial.trainers.map((t) => ({
            id: t.id,
            trainerId: t.trainerId,
            topik: t.topik ?? "",
          })),
        }
      : EMPTY_FORM
  );

  const [trainerUsers, setTrainerUsers] = useState<TrainerUser[]>([]);

  useEffect(() => {
    fetch("/api/trainers")
      .then((r) => r.json())
      .then((data) => setTrainerUsers(Array.isArray(data) ? data : []));
  }, []);

  const addTrainer = () =>
    setForm((f) => ({ ...f, trainers: [...f.trainers, { ...EMPTY_TRAINER }] }));

  const removeTrainer = (i: number) =>
    setForm((f) => ({ ...f, trainers: f.trainers.filter((_, idx) => idx !== i) }));

  const setTrainer = (i: number, key: keyof TrainerRow, val: string) =>
    setForm((f) => ({
      ...f,
      trainers: f.trainers.map((t, idx) => (idx === i ? { ...t, [key]: val } : t)),
    }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.namaEvent.trim()) { setError("Nama event wajib diisi"); return; }
    if (!form.tanggal) { setError("Tanggal event wajib diisi"); return; }
    setSaving(true);
    setError(null);
    try {
      const method = initial ? "PUT" : "POST";
      const url = initial ? `/api/events/${initial.id}` : "/api/events";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaEvent: form.namaEvent.trim(),
          tanggal: form.tanggal,
          lokasiType: form.lokasiType,
          lokasiDetail: form.lokasiDetail.trim() || null,
          prospectId: form.prospectId || null,
          target: form.target.trim() || null,
          jumlahPeserta: form.jumlahPeserta !== "" ? Number(form.jumlahPeserta) : null,
          jumlahAplikasi: form.jumlahAplikasi !== "" ? Number(form.jumlahAplikasi) : null,
          resume: form.resume.trim() || null,
          trainers: form.trainers.filter((t) => t.trainerId),
          ...(userRole === "admin" && form.salesId ? { salesId: form.salesId } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan");
      onSaved(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-yellow-400 bg-white text-gray-900";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-yellow-500" />
            <span className="font-bold text-gray-900">{initial ? "Edit Event" : "Tambah Event"}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Nama Event */}
          <div>
            <label className={labelCls}>Nama Event</label>
            <input
              type="text"
              placeholder="Nama event..."
              value={form.namaEvent}
              onChange={(e) => set("namaEvent", e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Tanggal + Lokasi Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tanggal Event</label>
              <input
                type="date"
                value={form.tanggal}
                onChange={(e) => set("tanggal", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Tipe Lokasi</label>
              <div className="flex gap-2 mt-0.5">
                {(["online", "offline"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("lokasiType", t)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      form.lokasiType === t
                        ? "bg-yellow-400 border-yellow-400 text-gray-900"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {t === "online" ? <Monitor size={14} /> : <MapPin size={14} />}
                    {t === "online" ? "Online" : "Offline"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lokasi Detail */}
          <div>
            <label className={labelCls}>
              {form.lokasiType === "online" ? "Link / URL Meeting" : "Alamat Lokasi"}
            </label>
            <input
              type="text"
              placeholder={form.lokasiType === "online" ? "https://meet.google.com/..." : "Nama gedung, jalan, kota..."}
              value={form.lokasiDetail}
              onChange={(e) => set("lokasiDetail", e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Partner (Pipeline) */}
          <div>
            <label className={labelCls}>Partner (Pipeline)</label>
            <select
              value={form.prospectId}
              onChange={(e) => set("prospectId", e.target.value)}
              className={inputCls}
            >
              <option value="">— Tidak terkait prospek —</option>
              {prospects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.namaProspek} · {p.stage}{userRole === "admin" ? ` (${p.sales.name})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Sales (admin only) */}
          {userRole === "admin" && (
            <div>
              <label className={labelCls}>Sales PIC</label>
              <select value={form.salesId} onChange={(e) => set("salesId", e.target.value)} className={inputCls}>
                <option value="">— Pilih sales —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Target */}
          <div>
            <label className={labelCls}>Target</label>
            <textarea
              placeholder="Target peserta, tujuan event, dsb..."
              value={form.target}
              onChange={(e) => set("target", e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Trainers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + " mb-0"}>Trainer / Pembicara</label>
              <button
                type="button"
                onClick={addTrainer}
                className="flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-700 font-semibold"
              >
                <Plus size={12} /> Tambah Trainer
              </button>
            </div>

            {form.trainers.length === 0 ? (
              <button
                type="button"
                onClick={addTrainer}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-yellow-300 hover:text-yellow-600 transition-colors flex items-center justify-center gap-1.5"
              >
                <UserCheck size={14} /> Tambah trainer pertama
              </button>
            ) : (
              <div className="space-y-2">
                {form.trainers.map((t, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <GripVertical size={14} className="text-gray-300 shrink-0" />
                      <span className="text-xs font-semibold text-gray-400 w-4 shrink-0">{i + 1}</span>
                      <select
                        value={t.trainerId}
                        onChange={(e) => setTrainer(i, "trainerId", e.target.value)}
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-yellow-400 bg-white text-gray-900"
                      >
                        <option value="">— Pilih trainer —</option>
                        {trainerUsers.map((tu) => (
                          <option key={tu.id} value={tu.id}>
                            {tu.name}{tu.region ? ` · ${tu.region}` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeTrainer(i)}
                        className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="pl-10">
                      <input
                        type="text"
                        placeholder="Topik / materi"
                        value={t.topik}
                        onChange={(e) => setTrainer(i, "topik", e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-yellow-400 bg-white text-gray-900"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hasil / Result */}
          <div>
            <label className={labelCls}>Hasil Event</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Jumlah Peserta</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.jumlahPeserta}
                  onChange={(e) => set("jumlahPeserta", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Aplikasi Diberikan</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.jumlahAplikasi}
                  onChange={(e) => set("jumlahAplikasi", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Resume */}
          <div>
            <label className={labelCls}>Resume / Catatan</label>
            <textarea
              placeholder="Ringkasan hasil, highlight, atau catatan penting..."
              value={form.resume}
              onChange={(e) => set("resume", e.target.value)}
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-sm font-bold text-gray-900 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {saving ? "Menyimpan..." : initial ? "Simpan Perubahan" : "Tambah Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Detail Drawer ──────────────────────────────────────────── */
function EventDetail({ event, onClose, onEdit, onDelete, userRole }: {
  event: EventItem;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  userRole: string;
}) {
  const canEdit = userRole !== "trainer";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-yellow-500" />
            <span className="font-bold text-gray-900 truncate">{event.namaEvent}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><CalendarDays size={11} /> Tanggal</div>
              <div className="text-sm font-semibold text-gray-900">{formatDate(event.tanggal)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                {event.lokasiType === "online" ? <Monitor size={11} /> : <MapPin size={11} />} Lokasi
              </div>
              <div className="text-sm font-semibold text-gray-900 capitalize">{event.lokasiType}</div>
              {event.lokasiDetail && (
                <div className="text-xs text-gray-500 mt-0.5 truncate">{event.lokasiDetail}</div>
              )}
            </div>
          </div>

          {/* Partner */}
          {event.prospect && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div className="text-xs text-blue-500 font-semibold mb-1">Partner Pipeline</div>
              <div className="text-sm font-semibold text-gray-900">{event.prospect.namaProspek}</div>
              <div className="text-xs text-blue-600 mt-0.5">{event.prospect.stage}</div>
            </div>
          )}

          {/* Target */}
          {event.target && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Target</div>
              <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{event.target}</div>
            </div>
          )}

          {/* Trainers */}
          {event.trainers.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <UserCheck size={11} /> Trainer / Pembicara
              </div>
              <div className="space-y-2">
                {event.trainers.map((t, i) => (
                  <div key={t.id} className="flex items-start gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                    <div className="w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{t.trainer.name}</div>
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        {t.trainer.region && (
                          <span className="text-xs text-gray-500">{t.trainer.region}</span>
                        )}
                        {t.trainer.region && t.topik && (
                          <span className="text-gray-300 text-xs">·</span>
                        )}
                        {t.topik && (
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                            {t.topik}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Hasil Event</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <Users size={16} className="text-green-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-700">
                  {event.jumlahPeserta != null ? event.jumlahPeserta.toLocaleString("id-ID") : "—"}
                </div>
                <div className="text-xs text-green-600">Peserta</div>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                <Package size={16} className="text-purple-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-purple-700">
                  {event.jumlahAplikasi != null ? event.jumlahAplikasi.toLocaleString("id-ID") : "—"}
                </div>
                <div className="text-xs text-purple-600">Aplikasi</div>
              </div>
            </div>
          </div>

          {/* Resume */}
          {event.resume && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <FileText size={11} /> Resume
              </div>
              <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                {event.resume}
              </div>
            </div>
          )}

          {/* Sales */}
          <div className="text-xs text-gray-400">
            Diinput oleh {event.sales.name}
          </div>
        </div>

        {canEdit && (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} /> Hapus
            </button>
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-sm font-bold text-gray-900 transition-colors"
            >
              <Pencil size={14} /> Edit Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [prospects, setProspects] = useState<ProspectOption[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSales, setFilterSales] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<EventItem | null>(null);
  const [detailTarget, setDetailTarget] = useState<EventItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isTrainer = user?.role === "trainer";

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/events")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Failed to load events (${r.status})`);
        }
        return r.json();
      })
      .then((data) => { setEvents(Array.isArray(data) ? data : []); })
      .catch((error) => {
        console.error(error);
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    if (!isTrainer) {
      fetch("/api/pipeline")
        .then((r) => r.json())
        .then((data) => setProspects(Array.isArray(data) ? data : []));
    }
    if (user?.role === "admin") {
      fetch("/api/admin/users")
        .then((r) => r.json())
        .then((data) => setUsers(Array.isArray(data) ? data.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })) : []));
    }
  }, [load, user?.role, isTrainer]);

  const filtered = events.filter((ev) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      ev.namaEvent.toLowerCase().includes(q) ||
      ev.prospect?.namaProspek.toLowerCase().includes(q) ||
      ev.lokasiDetail?.toLowerCase().includes(q) ||
      ev.trainers.some((t) => t.trainer.name.toLowerCase().includes(q));
    const matchSales = !filterSales || ev.sales.name === filterSales;
    return matchSearch && matchSales;
  });

  const salesList = [...new Set(events.map((e) => e.sales.name))].sort();

  // Aggregate stats
  const totalPeserta = events.reduce((s, e) => s + (e.jumlahPeserta ?? 0), 0);
  const totalAplikasi = events.reduce((s, e) => s + (e.jumlahAplikasi ?? 0), 0);

  const handleSaved = (ev: EventItem) => {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === ev.id);
      return idx >= 0 ? prev.map((e, i) => (i === idx ? ev : e)) : [ev, ...prev];
    });
    setShowModal(false);
    setEditTarget(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus event ini?")) return;
    setDeletingId(id);
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setDetailTarget(null);
    setDeletingId(null);
  };

  const openEdit = (ev: EventItem) => {
    setDetailTarget(null);
    setEditTarget(ev);
    setShowModal(true);
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            {isTrainer ? "Events Saya" : "Events"}
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">{filtered.length} dari {events.length} event</p>
        </div>
        {!isTrainer && (
          <button
            onClick={() => { setEditTarget(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-sm transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Tambah Event</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Event", value: events.length, icon: Megaphone, color: "bg-yellow-500" },
          { label: "Total Peserta", value: totalPeserta.toLocaleString("id-ID"), icon: Users, color: "bg-green-500" },
          { label: "Total Aplikasi", value: totalAplikasi.toLocaleString("id-ID"), icon: Package, color: "bg-purple-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className={`p-2 md:p-2.5 rounded-xl shrink-0 ${color}`}>
              <Icon size={16} className="text-white" />
            </div>
            <div>
              <div className="text-lg md:text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-400 leading-tight">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Cari nama event, partner, atau trainer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none text-gray-900 bg-white min-w-0"
          />
        </div>
        {user?.role === "admin" && (
          <select
            value={filterSales}
            onChange={(e) => setFilterSales(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none text-gray-900 bg-white"
          >
            <option value="">Semua Sales</option>
            {salesList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {loading ? (
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
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Event</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Tanggal</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Lokasi</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Partner</th>
                  {user?.role === "admin" && <th className="text-left px-4 py-3 text-gray-600 font-semibold">Sales</th>}
                  <th className="text-center px-4 py-3 text-gray-600 font-semibold">Peserta</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-semibold">Aplikasi</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((ev) => (
                  <tr
                    key={ev.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${deletingId === ev.id ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{ev.namaEvent}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {ev.trainers.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-indigo-600">
                            <UserCheck size={11} />
                            {ev.trainers.map((t) => t.trainer.name).join(", ")}
                          </span>
                        )}
                        {ev.resume && (
                          <span className="text-xs text-gray-400 truncate max-w-[160px]">{ev.resume}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(ev.tanggal)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                        ev.lokasiType === "online"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-orange-50 text-orange-700"
                      }`}>
                        {ev.lokasiType === "online" ? <Monitor size={11} /> : <MapPin size={11} />}
                        {ev.lokasiType === "online" ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ev.prospect ? (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {ev.prospect.namaProspek}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    {user?.role === "admin" && (
                      <td className="px-4 py-3 text-gray-600">{ev.sales.name}</td>
                    )}
                    <td className="px-4 py-3 text-center">
                      {ev.jumlahPeserta != null
                        ? <span className="font-semibold text-green-700">{ev.jumlahPeserta.toLocaleString("id-ID")}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ev.jumlahAplikasi != null
                        ? <span className="font-semibold text-purple-700">{ev.jumlahAplikasi.toLocaleString("id-ID")}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailTarget(ev)}
                        className="flex items-center gap-1 text-yellow-600 hover:text-yellow-700 font-medium text-xs"
                      >
                        Detail <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={user?.role === "admin" ? 8 : 7} className="text-center py-12 text-gray-400">
                      Tidak ada event ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 py-12 text-center text-sm text-gray-400">
                Tidak ada event ditemukan
              </div>
            )}
            {filtered.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setDetailTarget(ev)}
                className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 active:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{ev.namaEvent}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{formatDate(ev.tanggal)} · {ev.sales.name}</div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                    ev.lokasiType === "online" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"
                  }`}>
                    {ev.lokasiType === "online" ? <Monitor size={10} /> : <MapPin size={10} />}
                    {ev.lokasiType === "online" ? "Online" : "Offline"}
                  </span>
                </div>
                {(ev.prospect || ev.trainers.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {ev.prospect && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {ev.prospect.namaProspek}
                      </span>
                    )}
                    {ev.trainers.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                        <UserCheck size={10} /> {ev.trainers.map((t) => t.trainer.name).join(", ")}
                      </span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-green-50 rounded-lg py-1.5">
                    <div className="text-xs text-gray-400">Peserta</div>
                    <div className="text-sm font-bold text-green-700">
                      {ev.jumlahPeserta != null ? ev.jumlahPeserta.toLocaleString("id-ID") : "—"}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg py-1.5">
                    <div className="text-xs text-gray-400">Aplikasi</div>
                    <div className="text-sm font-bold text-purple-700">
                      {ev.jumlahAplikasi != null ? ev.jumlahAplikasi.toLocaleString("id-ID") : "—"}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <EventModal
          initial={editTarget}
          prospects={prospects}
          users={users}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSaved={handleSaved}
          userRole={user?.role ?? "sales"}
        />
      )}

      {/* Detail Drawer */}
      {detailTarget && (
        <EventDetail
          event={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={() => openEdit(detailTarget)}
          onDelete={() => handleDelete(detailTarget.id)}
          userRole={user?.role ?? "sales"}
        />
      )}
    </div>
  );
}
