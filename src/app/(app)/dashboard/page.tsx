"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, Target, Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

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

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/dashboard");
        const body = (await res.json().catch(() => null)) as unknown;

        if (!res.ok) {
          const message =
            (body as { error?: unknown } | null)?.error && typeof (body as { error?: unknown }).error === "string"
              ? ((body as { error: string }).error as string)
              : `Request failed (${res.status})`;

          if (!cancelled) {
            setData(null);
            setError(message);
          }
          return;
        }

        if (!isDashboardData(body)) {
          if (!cancelled) {
            setData(null);
            setError("Unexpected response from server.");
          }
          return;
        }

        if (!cancelled) setData(body);
      } catch {
        if (!cancelled) {
          setData(null);
          setError("Network error.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
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
    </div>
  );
}
