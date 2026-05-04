"use client";
import { useEffect, useState } from "react";
import { getCached, setCached } from "@/lib/fetch-cache";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, Target, Activity, AlertTriangle, CheckCircle2, Clock, CalendarDays, BarChart2, Users, ArrowRightLeft, Sparkles } from "lucide-react";
import Link from "next/link";

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
  recentActivities: Array<{
    id: string;
    tanggal: string;
    tipeAktivitas: string;
    namaProspek: string;
    topikHasil: string;
    sales: { name: string };
  }>;
  salesPerformance: Array<{ name: string; closed: number; pipeline: number; total: number }>;
  weeklySummary: {
    weekStart: string;
    totalActivities: number;
    newProspects: number;
    stageChanges: number;
    closedWon: number;
    activitiesByType: Array<{ type: string; count: number }>;
    activitiesBySales: Array<{ name: string; count: number }>;
    recentClosedWon: Array<{ prospectName: string; salesName: string; changedAt: string }>;
    recentNewProspects: Array<{ namaProspek: string; stage: string; salesName: string; createdAt: string }>;
  } | null;
}

interface TaskItem {
  id: string;
  judul: string;
  tipeAktivitas: string;
  tanggalRencana: string;
  status: string;
  prospect: { id: string; namaProspek: string } | null;
  sales: { id: string; name: string };
}

function isDashboardData(value: unknown): value is DashboardData {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!v.summary || typeof v.summary !== "object") return false;
  const s = v.summary as Record<string, unknown>;

  return (
    typeof s.totalUmkmClosed === "number" &&
    typeof s.northstarPct === "number" &&
    typeof s.totalPipelineOpen === "number" &&
    typeof s.weightedPipeline === "number" &&
    typeof s.targetPerSales === "number" &&
    typeof v.stageCount === "object" &&
    typeof v.slaStatus === "object" &&
    Array.isArray(v.recentActivities) &&
    Array.isArray(v.salesPerformance)
    // weeklySummary is optional (admin-only, may be null)
  );
}

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500 mb-1">{title}</div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

const SLA_COLORS: Record<string, string> = {
  "On Track": "bg-green-100 text-green-700",
  "At Risk": "bg-yellow-100 text-yellow-700",
  "Overdue": "bg-red-100 text-red-700",
  "Closed": "bg-gray-100 text-gray-600",
};

function getTaskBadge(task: TaskItem) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tanggal = new Date(task.tanggalRencana);
  tanggal.setHours(0, 0, 0, 0);
  if (tanggal < today) return { label: "Terlambat", cls: "bg-red-100 text-red-700" };
  return { label: "Hari Ini", cls: "bg-yellow-100 text-yellow-700" };
}

type WeeklySummary = NonNullable<DashboardData["weeklySummary"]>;

function WeeklySummaryWidget({ summary }: { summary: WeeklySummary }) {
  const maxActivity = Math.max(1, ...summary.activitiesBySales.map((s) => s.count));
  const maxType = Math.max(1, ...summary.activitiesByType.map((t) => t.count));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-white">
        <Sparkles size={18} className="text-yellow-500 shrink-0" />
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">Ringkasan 7 Hari Terakhir</h2>
          <p className="text-xs text-gray-400">
            Sejak {new Date(summary.weekStart).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      {/* 4-stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
        {[
          { label: "Aktivitas", value: summary.totalActivities, icon: Activity, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Prospek Baru", value: summary.newProspects, icon: Users, color: "text-purple-500", bg: "bg-purple-50" },
          { label: "Perubahan Stage", value: summary.stageChanges, icon: ArrowRightLeft, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "Closed Won", value: summary.closedWon, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-center gap-3 px-5 py-4">
            <div className={`p-2 rounded-xl ${bg} shrink-0`}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {/* Activities by sales leaderboard */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktivitas per Sales</span>
          </div>
          {summary.activitiesBySales.length === 0 ? (
            <div className="text-sm text-gray-400 py-4 text-center">Belum ada aktivitas minggu ini</div>
          ) : (
            <div className="space-y-2.5">
              {summary.activitiesBySales.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-gray-400 shrink-0 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">{s.name}</span>
                      <span className="text-xs font-bold text-gray-700 ml-2 shrink-0">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-yellow-400 transition-all"
                        style={{ width: `${(s.count / maxActivity) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activities by type */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktivitas per Tipe</span>
          </div>
          {summary.activitiesByType.length === 0 ? (
            <div className="text-sm text-gray-400 py-4 text-center">Belum ada aktivitas minggu ini</div>
          ) : (
            <div className="space-y-2.5">
              {summary.activitiesByType.slice(0, 6).map((t) => (
                <div key={t.type} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">{t.type}</span>
                      <span className="text-xs font-bold text-gray-700 ml-2 shrink-0">{t.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-400 transition-all"
                        style={{ width: `${(t.count / maxType) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Closed Won */}
      {summary.recentClosedWon.length > 0 && (
        <div className="px-5 py-4 border-t border-gray-100 bg-green-50/50">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} className="text-green-500" />
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Deal Minggu Ini 🎉</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.recentClosedWon.map((c, i) => (
              <div key={i} className="flex items-center gap-2 bg-white border border-green-200 rounded-xl px-3 py-1.5 text-sm">
                <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                <span className="font-medium text-gray-900">{c.prospectName}</span>
                <span className="text-gray-400">·</span>
                <span className="text-xs text-gray-500">{c.salesName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent new prospects */}
      {summary.recentNewProspects.length > 0 && (
        <div className="px-5 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-purple-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prospek Baru Minggu Ini</span>
          </div>
          <div className="space-y-2">
            {summary.recentNewProspects.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span className="font-medium text-gray-900 truncate flex-1">{p.namaProspek}</span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full shrink-0">{p.stage}</span>
                <span className="text-xs text-gray-400 shrink-0">{p.salesName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(() => getCached<DashboardData>("/api/dashboard") === null);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Show stale data instantly while refreshing in background
      const stale = getCached<DashboardData>("/api/dashboard");
      if (stale) { setData(stale); setLoading(false); }

      try {
        const res = await fetch("/api/dashboard");
        const body = (await res.json().catch(() => null)) as unknown;

        if (!res.ok) {
          const message =
            (body as { error?: unknown } | null)?.error && typeof (body as { error?: unknown }).error === "string"
              ? ((body as { error: string }).error as string)
              : `Request failed (${res.status})`;
          if (!cancelled && !stale) { setData(null); setError(message); }
          return;
        }

        if (!isDashboardData(body)) {
          if (!cancelled && !stale) { setData(null); setError("Unexpected response from server."); }
          return;
        }

        setCached("/api/dashboard", body);
        if (!cancelled) { setData(body); setError(null); }
      } catch {
        if (!cancelled && !stale) { setData(null); setError("Network error."); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadTasks() {
      const today = new Date().toISOString().split("T")[0];
      try {
        const res = await fetch(`/api/tasks?status=planned&dateTo=${today}`);
        if (res.ok && !cancelled) setTasks(await res.json());
      } catch { /* ignore */ }
    }

    load();
    loadTasks();
    return () => { cancelled = true; };
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
    </div>
  );

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <AlertTriangle size={18} className="text-yellow-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">Dashboard unavailable</div>
              <div className="text-sm text-gray-500 mt-1">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-xs md:text-sm mt-0.5">
          Selamat datang, {user?.name} · {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total UMKM Closed Won"
          value={data.summary.totalUmkmClosed.toLocaleString("id-ID")}
          sub={`${(data.summary.northstarPct * 100).toFixed(1)}% dari Northstar`}
          icon={CheckCircle2}
          color="bg-green-500"
        />
        <StatCard
          title="Pipeline Aktif"
          value={data.summary.totalPipelineOpen.toLocaleString("id-ID")}
          sub="Prospek open"
          icon={Target}
          color="bg-blue-500"
        />
        <StatCard
          title="Weighted Pipeline"
          value={Math.round(data.summary.weightedPipeline).toLocaleString("id-ID")}
          sub="UMKM (probability-adjusted)"
          icon={TrendingUp}
          color="bg-purple-500"
        />
        <StatCard
          title="Overdue SLA"
          value={(data.slaStatus["Overdue"] || 0).toString()}
          sub="Prospek perlu perhatian"
          icon={AlertTriangle}
          color="bg-red-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Status SLA Pipeline</h2>
          <div className="space-y-2">
            {Object.entries(data.slaStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${SLA_COLORS[status] || "bg-gray-100 text-gray-600"}`}>
                  {status}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-yellow-400"
                      style={{ width: `${Math.min(100, (count / Math.max(1, data.summary.totalPipelineOpen)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Northstar Progress</h2>
          <div className="flex items-center justify-center h-32">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="#eab308"
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(1, data.summary.northstarPct))}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-900">
                  {(data.summary.northstarPct * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
          <div className="text-center text-sm text-gray-500">
            {data.summary.totalUmkmClosed.toLocaleString("id-ID")} / 100.000 UMKM
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Pipeline per Stage</h2>
          <div className="space-y-2">
            {Object.entries(data.stageCount)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate flex-1">{stage}</span>
                  <span className="font-semibold text-gray-900 ml-4 bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Aktivitas Terbaru</h2>
          <div className="space-y-3">
            {data.recentActivities.slice(0, 5).map((act) => (
              <div key={act.id} className="flex gap-3">
                <div className="mt-0.5">
                  <Activity size={14} className="text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{act.namaProspek || "-"}</div>
                  <div className="text-xs text-gray-400">{act.tipeAktivitas} · {act.sales.name}</div>
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(act.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                </div>
              </div>
            ))}
            {data.recentActivities.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-4">Belum ada aktivitas</div>
            )}
          </div>
        </div>
      </div>

      {/* Rencana Hari Ini & Terlambat */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-yellow-500" />
            <h2 className="font-semibold text-gray-900">Rencana Hari Ini &amp; Terlambat</h2>
          </div>
          <Link href="/plans" className="text-xs text-yellow-600 hover:text-yellow-700 font-medium">
            Lihat semua →
          </Link>
        </div>
        {tasks.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-6">Tidak ada rencana yang terlambat atau jatuh tempo hari ini</div>
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 5).map((task) => {
              const badge = getTaskBadge(task);
              return (
                <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 shrink-0 ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{task.judul}</div>
                    <div className="text-xs text-gray-400">
                      {task.tipeAktivitas}
                      {task.prospect && <> · {task.prospect.namaProspek}</>}
                      {user?.role === "admin" && <> · {task.sales.name}</>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                    {new Date(task.tanggalRencana).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </div>
                </div>
              );
            })}
            {tasks.length > 5 && (
              <Link href="/plans" className="block text-center text-xs text-yellow-600 hover:text-yellow-700 font-medium pt-1">
                +{tasks.length - 5} lagi
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Weekly Summary (admin only) ─────────────────────────────────────── */}
      {user?.role === "admin" && data.weeklySummary && (
        <WeeklySummaryWidget summary={data.weeklySummary} />
      )}
    </div>
  );
}
