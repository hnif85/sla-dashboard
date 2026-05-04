"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Printer, Calendar, Activity, Users, ArrowRightLeft,
  CheckCircle2, ChevronLeft, ChevronRight, Trophy,
  FileText, Sparkles, Copy, Check, ChevronDown, ChevronUp,
  Loader2,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */
interface ActivityItem {
  id: string;
  tipeAktivitas: string;
  namaProspek: string;
  topikHasil: string;
  tanggal: string;
  sales: { name: string };
  prospect: { id: string; namaProspek: string } | null;
}

interface ProspectItem {
  id: string;
  namaProspek: string;
  channel: string;
  stage: string;
  estUmkmReach: number;
  probability: number;
  createdAt: string;
  sales: { name: string };
}

interface StageChangeItem {
  id: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  notes: string | null;
  changedBy: { name: string } | null;
  prospect: { id: string; namaProspek: string } | null;
}

interface MomItem {
  id: string;
  title: string;
  tanggal: string;
  participants: string | null;
  decisions: string | null;
  actionItems: string | null;
  sales: { name: string };
  prospect: { id: string; namaProspek: string } | null;
}

interface WipData {
  period: { from: string; to: string };
  summary: {
    totalActivities: number;
    newProspects: number;
    stageChanges: number;
    closedWon: number;
    totalMoms: number;
  };
  activitiesMatrix: Record<string, Record<string, number>>;
  activities: ActivityItem[];
  newProspects: ProspectItem[];
  stageChanges: StageChangeItem[];
  closedWon: StageChangeItem[];
  moms: MomItem[];
}

/* ─── Constants ──────────────────────────────────────────────── */
const ACTIVITY_TYPES = [
  "Email", "WA/Call", "Meeting Online", "Meeting Offline",
  "Presentasi", "Demo", "Negosiasi", "Follow Up", "Lainnya",
];

type PeriodMode = "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom";

/* ─── Date helpers ───────────────────────────────────────────── */
function toISO(d: Date) { return d.toISOString().split("T")[0]; }

function getWeekBounds(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = (day === 0 ? -6 : 1 - day) + offset * 7;
  const mon = new Date(now); mon.setDate(now.getDate() + diffToMon); mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { from: toISO(mon), to: toISO(sun) };
}

function getMonthBounds(offset = 0) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + offset;
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  return { from: toISO(first), to: toISO(last) };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatRange(from: string, to: string) {
  const f = new Date(from), t = new Date(to);
  const optFull: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const optShort: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  if (f.getFullYear() !== t.getFullYear())
    return `${f.toLocaleDateString("id-ID", optFull)} – ${t.toLocaleDateString("id-ID", optFull)}`;
  if (f.getMonth() === t.getMonth())
    return `${f.getDate()}–${t.toLocaleDateString("id-ID", optFull)}`;
  return `${f.toLocaleDateString("id-ID", optShort)} – ${t.toLocaleDateString("id-ID", optFull)}`;
}

/* ─── Reusable section wrapper ───────────────────────────────── */
function Section({ icon: Icon, iconCls, title, count, countLabel, accent, children }: {
  icon: React.ElementType; iconCls: string; title: string;
  count: number; countLabel: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden ${accent ?? "border-gray-100"}`}>
      <div className={`flex items-center gap-2 px-5 py-4 border-b ${accent ? accent.replace("border-", "border-b-").replace("100", "100 bg-") + "50" : "border-gray-100"}`}>
        <Icon size={16} className={iconCls} />
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <span className="ml-auto text-xs text-gray-400">{count} {countLabel}</span>
      </div>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="py-10 text-center text-sm text-gray-400">{label}</div>;
}

/* ─── AI Resume Panel ────────────────────────────────────────── */
function ResumePanel({ data }: { data: WipData }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resume, setResume] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setOpen(true);
    try {
      const res = await fetch("/api/wip-report/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal generate resume");
      setResume(json.resume);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const copyText = () => {
    if (!resume) return;
    navigator.clipboard.writeText(resume).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-yellow-200 overflow-hidden print:hidden">
      {/* Trigger row */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="p-2 rounded-xl bg-yellow-50 shrink-0">
          <Sparkles size={16} className="text-yellow-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm">Resume AI</div>
          <div className="text-xs text-gray-400">Narasi otomatis dari seluruh data periode ini</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-gray-900 font-semibold px-3 py-1.5 rounded-lg text-sm transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {resume ? "Regenerate" : "Buat Resume"}
          </button>
          {resume && (
            <button onClick={() => setOpen((o) => !o)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Resume content */}
      {open && (
        <div className="border-t border-yellow-100 bg-yellow-50/40">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 size={18} className="animate-spin text-yellow-500" />
              AI sedang merangkum data…
            </div>
          )}

          {error && !loading && (
            <div className="px-5 py-4 text-sm text-red-600 bg-red-50 border-t border-red-100">
              ⚠ {error}
            </div>
          )}

          {resume && !loading && (
            <>
              <div className="flex items-center justify-end gap-2 px-5 pt-3">
                <button
                  onClick={copyText}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                >
                  {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                  {copied ? "Tersalin!" : "Salin teks"}
                </button>
              </div>
              <div
                ref={textRef}
                className="px-5 py-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
              >
                {resume}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function WipReportPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<PeriodMode>("thisWeek");
  const [customFrom, setCustomFrom] = useState(toISO(new Date()));
  const [customTo, setCustomTo] = useState(toISO(new Date()));
  const [data, setData] = useState<WipData | null>(null);
  const [loading, setLoading] = useState(false);

  const bounds = useCallback((): { from: string; to: string } => {
    if (mode === "thisWeek")  return getWeekBounds(0);
    if (mode === "lastWeek")  return getWeekBounds(-1);
    if (mode === "thisMonth") return getMonthBounds(0);
    if (mode === "lastMonth") return getMonthBounds(-1);
    return { from: customFrom, to: customTo };
  }, [mode, customFrom, customTo]);

  useEffect(() => {
    const { from, to } = bounds();
    setLoading(true);
    setData(null);
    fetch(`/api/wip-report?dateFrom=${from}&dateTo=${to}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [bounds]);

  const { from, to } = bounds();
  const periodLabel = formatRange(from, to);

  const QUICK: { label: string; mode: PeriodMode }[] = [
    { label: "Minggu Ini",  mode: "thisWeek" },
    { label: "Minggu Lalu", mode: "lastWeek" },
    { label: "Bulan Ini",   mode: "thisMonth" },
    { label: "Bulan Lalu",  mode: "lastMonth" },
  ];

  const salesList = data
    ? Object.entries(data.activitiesMatrix).sort((a, b) => {
        const ta = Object.values(a[1]).reduce((s, x) => s + x, 0);
        const tb = Object.values(b[1]).reduce((s, x) => s + x, 0);
        return tb - ta;
      })
    : [];

  const activeTypes = data
    ? ACTIVITY_TYPES.filter((t) => salesList.some(([, c]) => (c[t] || 0) > 0))
    : [];

  const movements = data?.stageChanges.filter((h) => h.newValue !== "9. Deal/Closed Won") ?? [];

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* ── Screen header ──────────────────────── */}
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">WIP Report</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">Ringkasan progress kerja per periode</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-sm transition-colors shrink-0"
        >
          <Printer size={15} />
          <span className="hidden sm:inline">Cetak / PDF</span>
        </button>
      </div>

      {/* ── Period selector ────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={15} className="text-gray-400 shrink-0" />
          <span className="text-sm text-gray-500 mr-1">Periode:</span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q.mode}
                onClick={() => setMode(q.mode)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  mode === q.mode ? "bg-yellow-400 text-gray-900" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {q.label}
              </button>
            ))}
            <button
              onClick={() => setMode("custom")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                mode === "custom" ? "bg-yellow-400 text-gray-900" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Kustom
            </button>
          </div>
        </div>
        {mode === "custom" && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Dari</span>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-yellow-400" />
            <span className="text-xs text-gray-500">s/d</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
        </div>
      )}

      {!loading && data && (
        <>
          {/* ── Print-only header ────────────────── */}
          <div className="hidden print:block mb-2">
            <div className="text-2xl font-bold text-gray-900">WIP Report — MWX Partnership</div>
            <div className="text-base text-gray-600 mt-0.5">{periodLabel}</div>
            {user && (
              <div className="text-sm text-gray-400 mt-0.5">
                Dibuat oleh {user.name} · {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            )}
            <hr className="mt-4 border-gray-200" />
          </div>

          {/* ── Period label (screen) ─────────────── */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 print:hidden -mt-1">
            <ChevronLeft size={14} />
            <span className="font-semibold text-gray-700">{periodLabel}</span>
            <ChevronRight size={14} />
          </div>

          {/* ══ 1. Summary cards ══════════════════════ */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {([
              { label: "Aktivitas",       value: data.summary.totalActivities, icon: Activity,       color: "bg-blue-500" },
              { label: "Prospek Baru",    value: data.summary.newProspects,    icon: Users,          color: "bg-purple-500" },
              { label: "Pergerakan Stage",value: data.summary.stageChanges,    icon: ArrowRightLeft, color: "bg-orange-500" },
              { label: "MOM",             value: data.summary.totalMoms,       icon: FileText,       color: "bg-indigo-500" },
              { label: "Closed Won",      value: data.summary.closedWon,       icon: CheckCircle2,   color: "bg-green-500" },
            ] as const).map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${color}`}>
                  <Icon size={16} className="text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-400 leading-tight mt-0.5">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ══ AI Resume ═════════════════════════════ */}
          <ResumePanel data={data} />

          {/* ══ 2. Aktivitas per Sales ════════════════ */}
          <Section icon={Activity} iconCls="text-blue-500" title="Rekap Aktivitas per Sales"
            count={data.summary.totalActivities} countLabel="aktivitas">
            {salesList.length === 0 ? (
              <Empty label="Tidak ada aktivitas di periode ini" />
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-gray-600 font-semibold">Sales</th>
                        {activeTypes.map((t) => (
                          <th key={t} className="text-center px-3 py-3 text-gray-500 font-semibold text-xs whitespace-nowrap">{t}</th>
                        ))}
                        <th className="text-center px-4 py-3 text-gray-900 font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesList.map(([name, counts]) => {
                        const total = Object.values(counts).reduce((s, x) => s + x, 0);
                        return (
                          <tr key={name} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold text-gray-900">{name}</td>
                            {activeTypes.map((t) => (
                              <td key={t} className="px-3 py-3 text-center">
                                {counts[t] ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-50 text-yellow-700 font-bold text-sm">
                                    {counts[t]}
                                  </span>
                                ) : <span className="text-gray-200">—</span>}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white font-bold text-sm">
                                {total}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</td>
                        {activeTypes.map((t) => {
                          const sum = salesList.reduce((s, [, c]) => s + (c[t] || 0), 0);
                          return <td key={t} className="px-3 py-3 text-center text-sm font-bold text-gray-700">{sum || "—"}</td>;
                        })}
                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                          {salesList.reduce((s, [, c]) => s + Object.values(c).reduce((a, b) => a + b, 0), 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="md:hidden divide-y divide-gray-50">
                  {salesList.map(([name, counts], i) => {
                    const total = Object.values(counts).reduce((s, x) => s + x, 0);
                    const hasTypes = Object.entries(counts).filter(([, v]) => v > 0);
                    return (
                      <div key={name} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              i === 0 ? "bg-yellow-400 text-gray-900" : i === 1 ? "bg-gray-300 text-gray-800" : i === 2 ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-600"
                            }`}>{i + 1}</div>
                            <span className="font-semibold text-gray-900">{name}</span>
                          </div>
                          <span className="font-bold text-gray-900">{total} <span className="text-xs font-normal text-gray-400">aktivitas</span></span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {hasTypes.map(([type, count]) => (
                            <span key={type} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-full font-medium">
                              {type} <strong>{count}×</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Section>

          {/* ══ 3. Prospek Baru ══════════════════════ */}
          <Section icon={Users} iconCls="text-purple-500" title="Prospek Baru"
            count={data.newProspects.length} countLabel="prospek">
            {data.newProspects.length === 0 ? (
              <Empty label="Tidak ada prospek baru di periode ini" />
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-gray-600 font-semibold">Nama Prospek</th>
                        {user?.role === "admin" && <th className="text-left px-4 py-3 text-gray-600 font-semibold">Sales</th>}
                        <th className="text-left px-4 py-3 text-gray-600 font-semibold">Channel</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-semibold">Stage Saat Ini</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-semibold">Est. UMKM</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-semibold">Prob.</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-semibold">Tgl Masuk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.newProspects.map((p) => (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{p.namaProspek}</td>
                          {user?.role === "admin" && <td className="px-4 py-3 text-gray-600">{p.sales.name}</td>}
                          <td className="px-4 py-3 text-gray-500">{p.channel || "—"}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">{p.stage}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-700">
                            {p.estUmkmReach ? p.estUmkmReach.toLocaleString("id-ID") : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">
                            {p.probability != null ? `${(p.probability * 100).toFixed(0)}%` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400 text-xs whitespace-nowrap">
                            {formatDate(p.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden divide-y divide-gray-50">
                  {data.newProspects.map((p) => (
                    <div key={p.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-gray-900">{p.namaProspek}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{p.channel || "—"} · {p.sales.name}</div>
                        </div>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full shrink-0 font-medium">{p.stage}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        <span>Est. UMKM: <strong className="text-gray-700">{p.estUmkmReach ? p.estUmkmReach.toLocaleString("id-ID") : "—"}</strong></span>
                        <span>Prob: <strong className="text-gray-700">{p.probability != null ? `${(p.probability * 100).toFixed(0)}%` : "—"}</strong></span>
                        <span className="ml-auto text-gray-400">{formatDate(p.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Section>

          {/* ══ 4. Pergerakan Pipeline ════════════════ */}
          <Section icon={ArrowRightLeft} iconCls="text-orange-500" title="Pergerakan Pipeline"
            count={movements.length} countLabel="perubahan">
            {movements.length === 0 ? (
              <Empty label="Tidak ada pergerakan pipeline di periode ini" />
            ) : (
              <div className="divide-y divide-gray-50">
                {movements.map((h) => (
                  <div key={h.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">{h.prospect?.namaProspek || "—"}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{h.oldValue || "—"}</span>
                        <ArrowRightLeft size={10} className="text-gray-400 shrink-0" />
                        <span className="text-xs text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full font-medium">{h.newValue || "—"}</span>
                      </div>
                      {h.notes && <div className="text-xs text-gray-400 mt-1 truncate">{h.notes}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-gray-400 whitespace-nowrap">{formatDate(h.changedAt)}</div>
                      {h.changedBy && <div className="text-xs text-gray-500 mt-0.5">{h.changedBy.name}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ══ 5. Minutes of Meeting ═════════════════ */}
          <Section icon={FileText} iconCls="text-indigo-500" title="Minutes of Meeting"
            count={data.moms.length} countLabel="MOM">
            {data.moms.length === 0 ? (
              <Empty label="Tidak ada MOM di periode ini" />
            ) : (
              <div className="divide-y divide-gray-50">
                {data.moms.map((m) => (
                  <div key={m.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{m.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {m.prospect?.namaProspek && <span className="mr-2">📎 {m.prospect.namaProspek}</span>}
                          {user?.role === "admin" && <span className="mr-2">👤 {m.sales.name}</span>}
                          {m.participants && <span>🧑‍🤝‍🧑 {m.participants}</span>}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 whitespace-nowrap shrink-0">{formatDate(m.tanggal)}</div>
                    </div>
                    {(m.decisions || m.actionItems) && (
                      <div className="mt-2 space-y-1.5">
                        {m.decisions && (
                          <div className="text-xs bg-blue-50 text-blue-800 rounded-lg px-3 py-2">
                            <span className="font-semibold">Keputusan:</span> {m.decisions}
                          </div>
                        )}
                        {m.actionItems && (
                          <div className="text-xs bg-yellow-50 text-yellow-800 rounded-lg px-3 py-2">
                            <span className="font-semibold">Action Items:</span> {m.actionItems}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ══ 6. Closed Won ═════════════════════════ */}
          <div className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-green-100 bg-green-50">
              <Trophy size={16} className="text-green-600" />
              <h2 className="font-semibold text-green-800">Closed Won Periode Ini</h2>
              <span className="ml-auto text-xs font-medium text-green-600">{data.closedWon.length} deal</span>
            </div>
            {data.closedWon.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">Belum ada deal yang closed di periode ini</div>
            ) : (
              <div className="divide-y divide-green-50">
                {data.closedWon.map((h) => (
                  <div key={h.id} className="px-5 py-3.5 flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{h.prospect?.namaProspek || "—"}</div>
                      {h.notes && <div className="text-xs text-gray-400 mt-0.5 truncate">{h.notes}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-gray-400 whitespace-nowrap">{formatDate(h.changedAt)}</div>
                      {h.changedBy && <div className="text-xs font-semibold text-green-600 mt-0.5">{h.changedBy.name}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
