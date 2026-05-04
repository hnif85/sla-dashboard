"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, Award, Target, CheckCircle2, AlertTriangle,
  XCircle, Users, Activity, ChevronLeft, ChevronRight, Calendar,
} from "lucide-react";

/* ─── Types ────────────────────────────────────────────────── */
interface SalesPerf {
  name: string;
  closed: number;
  pipeline: number;
  total: number;
  onTrack: number;
  atRisk: number;
  overdue: number;
}

interface DashboardData {
  summary: {
    totalUmkmClosed: number;
    northstarPct: number;
    totalPipelineOpen: number;
    weightedPipeline: number;
    targetPerSales: number;
  };
  stageCount: Record<string, number>;
  slaStatus: Record<string, number>;
  salesPerformance: SalesPerf[];
}

interface ActivityRow {
  id: string;
  tipeAktivitas: string;
  sales: { name: string };
}

/* ─── Constants ─────────────────────────────────────────────── */
const RANK_COLORS = [
  "from-yellow-400 to-yellow-500 text-gray-900",
  "from-gray-300 to-gray-400 text-gray-800",
  "from-amber-600 to-amber-700 text-white",
];

const ACTIVITY_TYPES = [
  "Email", "WA/Call", "Meeting Online", "Meeting Offline",
  "Presentasi", "Demo", "Negosiasi", "Follow Up", "Lainnya",
];

/* ─── Date helpers ──────────────────────────────────────────── */
function toISO(d: Date) { return d.toISOString().split("T")[0]; }

function getWeekBounds(offset = 0) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
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

function formatRange(from: string, to: string) {
  const f = new Date(from), t = new Date(to);
  const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (f.getFullYear() !== t.getFullYear())
    return `${f.toLocaleDateString("id-ID", { ...opt, year: "numeric" })} – ${t.toLocaleDateString("id-ID", { ...opt, year: "numeric" })}`;
  return `${f.toLocaleDateString("id-ID", opt)} – ${t.toLocaleDateString("id-ID", { ...opt, year: "numeric" })}`;
}

/* ─── Activity Recap Section ────────────────────────────────── */
type PeriodMode = "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom";

function ActivityRecapSection() {
  const [mode, setMode] = useState<PeriodMode>("thisWeek");
  const [customFrom, setCustomFrom] = useState(toISO(new Date()));
  const [customTo, setCustomTo] = useState(toISO(new Date()));
  const [activities, setActivities] = useState<ActivityRow[] | null>(null);
  const [loadingAct, setLoadingAct] = useState(false);

  const bounds = useCallback((): { from: string; to: string } => {
    if (mode === "thisWeek")  return getWeekBounds(0);
    if (mode === "lastWeek")  return getWeekBounds(-1);
    if (mode === "thisMonth") return getMonthBounds(0);
    if (mode === "lastMonth") return getMonthBounds(-1);
    return { from: customFrom, to: customTo };
  }, [mode, customFrom, customTo]);

  useEffect(() => {
    const { from, to } = bounds();
    setLoadingAct(true);
    fetch(`/api/activities?dateFrom=${from}&dateTo=${to}`)
      .then((r) => r.json())
      .then(setActivities)
      .finally(() => setLoadingAct(false));
  }, [bounds]);

  const { from, to } = bounds();

  // Group: salesName → tipeAktivitas → count
  const salesMap: Record<string, Record<string, number>> = {};
  for (const a of activities ?? []) {
    if (!salesMap[a.sales.name]) salesMap[a.sales.name] = {};
    salesMap[a.sales.name][a.tipeAktivitas] = (salesMap[a.sales.name][a.tipeAktivitas] || 0) + 1;
  }
  const salesList = Object.entries(salesMap).sort((a, b) => {
    const ta = Object.values(a[1]).reduce((s, x) => s + x, 0);
    const tb = Object.values(b[1]).reduce((s, x) => s + x, 0);
    return tb - ta;
  });

  // Only show types that have at least one activity in this period
  const activeTypes = ACTIVITY_TYPES.filter((t) =>
    salesList.some(([, counts]) => (counts[t] || 0) > 0)
  );

  const QUICK: { label: string; mode: PeriodMode }[] = [
    { label: "Minggu Ini", mode: "thisWeek" },
    { label: "Minggu Lalu", mode: "lastWeek" },
    { label: "Bulan Ini", mode: "thisMonth" },
    { label: "Bulan Lalu", mode: "lastMonth" },
  ];

  return (
    <div>
      {/* Header + period selector */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-2 mr-auto">
          <Activity size={18} className="text-purple-500" />
          <h2 className="font-semibold text-gray-900">Rekap Aktivitas per Periode</h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q.mode}
              onClick={() => setMode(q.mode)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                mode === q.mode
                  ? "bg-yellow-400 text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {q.label}
            </button>
          ))}
          <button
            onClick={() => setMode("custom")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
              mode === "custom"
                ? "bg-yellow-400 text-gray-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Calendar size={11} /> Kustom
          </button>
        </div>
      </div>

      {/* Custom date range */}
      {mode === "custom" && (
        <div className="flex flex-wrap items-center gap-2 mb-3 bg-white border border-gray-200 rounded-xl p-3">
          <span className="text-xs text-gray-500">Dari</span>
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-yellow-400" />
          <span className="text-xs text-gray-500">s/d</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>
      )}

      {/* Period label */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
        <ChevronLeft size={12} />
        <span>{formatRange(from, to)}</span>
        <ChevronRight size={12} />
        <span className="ml-1">·</span>
        <span>{activities?.length ?? 0} aktivitas</span>
      </div>

      {loadingAct ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-yellow-400" />
        </div>
      ) : salesList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-12 text-center text-gray-400 text-sm">
          Tidak ada aktivitas di periode ini
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">Sales</th>
                  {activeTypes.map((t) => (
                    <th key={t} className="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap text-xs">{t}</th>
                  ))}
                  <th className="text-center px-4 py-3 text-gray-900 font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {salesList.map(([name, counts]) => {
                  const total = Object.values(counts).reduce((s, x) => s + x, 0);
                  return (
                    <tr key={name} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{name}</td>
                      {activeTypes.map((t) => (
                        <td key={t} className="px-3 py-3 text-center">
                          {counts[t] ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-50 text-yellow-700 font-bold text-sm">
                              {counts[t]}
                            </span>
                          ) : (
                            <span className="text-gray-200">—</span>
                          )}
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
              {/* Totals row */}
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</td>
                  {activeTypes.map((t) => {
                    const sum = salesList.reduce((s, [, c]) => s + (c[t] || 0), 0);
                    return (
                      <td key={t} className="px-3 py-3 text-center text-sm font-bold text-gray-700">
                        {sum || "—"}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                    {salesList.reduce((s, [, c]) => s + Object.values(c).reduce((a, b) => a + b, 0), 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3">
            {salesList.map(([name, counts], i) => {
              const total = Object.values(counts).reduce((s, x) => s + x, 0);
              const hasTypes = Object.entries(counts).filter(([, v]) => v > 0);
              return (
                <div key={name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? "bg-yellow-400 text-gray-900"
                        : i === 1 ? "bg-gray-300 text-gray-800"
                        : i === 2 ? "bg-amber-600 text-white"
                        : "bg-gray-100 text-gray-600"
                      }`}>{i + 1}</div>
                      <span className="font-semibold text-gray-900">{name}</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{total}
                      <span className="text-xs font-normal text-gray-400 ml-1">aktivitas</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {hasTypes.map(([type, count]) => (
                      <span key={type}
                        className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-1 rounded-full font-medium">
                        {type} <span className="font-bold">{count}×</span>
                      </span>
                    ))}
                  </div>
                  {/* Mini bar */}
                  {total > 0 && (
                    <div className="mt-3 flex h-1.5 rounded-full overflow-hidden gap-px">
                      {hasTypes.map(([type, count], idx) => {
                        const colors = ["bg-yellow-400","bg-blue-400","bg-green-400","bg-purple-400","bg-pink-400","bg-orange-400","bg-teal-400","bg-indigo-400","bg-red-400"];
                        return (
                          <div key={type} className={`${colors[idx % colors.length]} rounded-full`}
                            style={{ width: `${(count / total) * 100}%` }} />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function ReportsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
    </div>
  );

  if (!data) return null;

  const sorted = [...(data.salesPerformance || [])].sort((a, b) => b.total - a.total);
  const totalProspects = Object.values(data.stageCount).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Laporan</h1>
        <p className="text-gray-500 text-xs md:text-sm mt-0.5">Rekap performa pipeline & sales</p>
      </div>

      {/* ── Ringkasan Northstar ─────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-green-500" />
          <h2 className="font-semibold text-gray-900">Ringkasan Northstar</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Target Nasional", value: "100.000 UMKM", accent: "text-gray-900" },
            { label: "Total Closed Won", value: `${data.summary.totalUmkmClosed.toLocaleString("id-ID")} UMKM`, accent: "text-green-600" },
            { label: "% Tercapai", value: `${(data.summary.northstarPct * 100).toFixed(2)}%`, accent: "text-blue-600" },
            { label: "Pipeline Aktif", value: `${data.summary.totalPipelineOpen} prospek`, accent: "text-gray-900" },
            { label: "Weighted Pipeline", value: `${Math.round(data.summary.weightedPipeline).toLocaleString("id-ID")} UMKM`, accent: "text-blue-600" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">{label}</div>
              <div className={`text-base font-bold ${accent}`}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SLA + Stage ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-red-500" />
            <h2 className="font-semibold text-gray-900">SLA Health Check</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "On Track", color: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200", icon: CheckCircle2 },
              { key: "At Risk",  color: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200", icon: AlertTriangle },
              { key: "Overdue", color: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200", icon: XCircle },
            ].map(({ key, color, icon: Icon }) => (
              <Link
                key={key}
                href={`/pipeline?sla=${encodeURIComponent(key)}`}
                className={`rounded-xl border p-4 text-center transition-colors cursor-pointer block ${color}`}
              >
                <Icon size={18} className="mx-auto mb-1 opacity-70" />
                <div className="text-2xl font-bold">{data.slaStatus[key] || 0}</div>
                <div className="text-xs font-medium mt-0.5">{key}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-blue-500" />
            <h2 className="font-semibold text-gray-900">Tahap Prospek</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(data.stageCount)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([stage, count]) => {
                const pct = totalProspects > 0 ? (count / totalProspects) * 100 : 0;
                return (
                  <div key={stage}>
                    <div className="flex justify-between text-sm mb-0.5">
                      <span className="text-gray-600 truncate">{stage}</span>
                      <span className="text-gray-900 font-medium ml-2">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-blue-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* ── Rekap Aktivitas per Periode ──────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
        <ActivityRecapSection />
      </div>

      {/* ── Performa per Sales — Cards ───────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Award size={18} className="text-yellow-500" />
          <h2 className="font-semibold text-gray-900">Performa per Sales</h2>
          <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
            <Users size={12} /> {sorted.length} sales aktif
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((s, i) => {
            const activePipeline = s.onTrack + s.atRisk + s.overdue;
            const closedCount = s.total - activePipeline;
            return (
              <div key={s.name} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className={`bg-gradient-to-r px-5 py-4 flex items-center justify-between ${
                  i < 3 ? RANK_COLORS[i] : "from-gray-50 to-gray-100 text-gray-800"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i < 3 ? "bg-white/30" : "bg-gray-200"
                    }`}>{i + 1}</div>
                    <span className="font-bold text-lg">{s.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-75">Total Prospek</div>
                    <div className="font-bold text-xl">{s.total}</div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">UMKM Closed Won</span>
                    <span className="text-base font-bold text-green-600">
                      {s.closed > 0 ? s.closed.toLocaleString("id-ID") : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Weighted Pipeline</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {Math.round(s.pipeline).toLocaleString("id-ID")} UMKM
                    </span>
                  </div>
                  <div className="border-t border-gray-100" />
                  <div>
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                      SLA Pipeline Aktif ({activePipeline} prospek)
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-green-50 border border-green-100 rounded-xl p-2.5 text-center">
                        <CheckCircle2 size={14} className="text-green-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-green-700">{s.onTrack}</div>
                        <div className="text-xs text-green-600">On Track</div>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-2.5 text-center">
                        <AlertTriangle size={14} className="text-yellow-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-yellow-700">{s.atRisk}</div>
                        <div className="text-xs text-yellow-600">At Risk</div>
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded-xl p-2.5 text-center">
                        <XCircle size={14} className="text-red-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-red-700">{s.overdue}</div>
                        <div className="text-xs text-red-600">Overdue</div>
                      </div>
                    </div>
                  </div>
                  {activePipeline > 0 && (
                    <div>
                      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                        {s.onTrack > 0 && <div className="bg-green-400 rounded-l-full" style={{ width: `${(s.onTrack / activePipeline) * 100}%` }} />}
                        {s.atRisk > 0 && <div className="bg-yellow-400" style={{ width: `${(s.atRisk / activePipeline) * 100}%` }} />}
                        {s.overdue > 0 && <div className="bg-red-400 rounded-r-full" style={{ width: `${(s.overdue / activePipeline) * 100}%` }} />}
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{Math.round((s.onTrack / activePipeline) * 100)}% sehat</span>
                        {closedCount > 0 && <span>{closedCount} closed</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {sorted.length === 0 && (
            <div className="col-span-3 text-gray-400 text-sm text-center py-12 bg-white rounded-2xl border border-gray-100">
              Belum ada data performa sales
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
