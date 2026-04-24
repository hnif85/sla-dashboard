"use client";
import { useEffect, useState } from "react";
import { TrendingUp, Award, Target, CheckCircle2, AlertTriangle, XCircle, Users } from "lucide-react";

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

const RANK_COLORS = [
  "from-yellow-400 to-yellow-500 text-gray-900",
  "from-gray-300 to-gray-400 text-gray-800",
  "from-amber-600 to-amber-700 text-white",
];

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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
        <p className="text-gray-500 text-sm mt-0.5">Rekap performa pipeline & sales</p>
      </div>
       {/* Ringkasan Northstar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-3">
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

       {/* ── Bottom row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* SLA Health Check */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-red-500" />
            <h2 className="font-semibold text-gray-900">SLA Health Check</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "On Track", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
              { key: "At Risk",  color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: AlertTriangle },
              { key: "Overdue", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
            ].map(({ key, color, icon: Icon }) => (
              <div key={key} className={`rounded-xl border p-4 text-center ${color}`}>
                <Icon size={18} className="mx-auto mb-1 opacity-70" />
                <div className="text-2xl font-bold">{data.slaStatus[key] || 0}</div>
                <div className="text-xs font-medium mt-0.5">{key}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribusi Stage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-blue-500" />
            <h2 className="font-semibold text-gray-900">Distribusi Stage</h2>
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

      {/* ── Performa per Sales — Cards ─────────────────────── */}
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
                {/* Header */}
                <div className={`bg-gradient-to-r px-5 py-4 flex items-center justify-between ${
                  i < 3 ? RANK_COLORS[i] : "from-gray-50 to-gray-100 text-gray-800"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i < 3 ? "bg-white/30" : "bg-gray-200"
                    }`}>
                      {i + 1}
                    </div>
                    <span className="font-bold text-lg">{s.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-75">Total Prospek</div>
                    <div className="font-bold text-xl">{s.total}</div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                  {/* Closed Won */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">UMKM Closed Won</span>
                    <span className="text-base font-bold text-green-600">
                      {s.closed > 0 ? s.closed.toLocaleString("id-ID") : "—"}
                    </span>
                  </div>

                  {/* Weighted Pipeline */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Weighted Pipeline</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {Math.round(s.pipeline).toLocaleString("id-ID")} UMKM
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100" />

                  {/* SLA Breakdown */}
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

                  {/* Progress bar: health ratio */}
                  {activePipeline > 0 && (
                    <div>
                      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                        {s.onTrack > 0 && (
                          <div className="bg-green-400 rounded-l-full" style={{ width: `${(s.onTrack / activePipeline) * 100}%` }} />
                        )}
                        {s.atRisk > 0 && (
                          <div className="bg-yellow-400" style={{ width: `${(s.atRisk / activePipeline) * 100}%` }} />
                        )}
                        {s.overdue > 0 && (
                          <div className="bg-red-400 rounded-r-full" style={{ width: `${(s.overdue / activePipeline) * 100}%` }} />
                        )}
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{activePipeline > 0 ? Math.round((s.onTrack / activePipeline) * 100) : 0}% sehat</span>
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

      {/* ── Bottom row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* SLA Health Check */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-red-500" />
            <h2 className="font-semibold text-gray-900">SLA Health Check</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "On Track", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
              { key: "At Risk",  color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: AlertTriangle },
              { key: "Overdue", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
            ].map(({ key, color, icon: Icon }) => (
              <div key={key} className={`rounded-xl border p-4 text-center ${color}`}>
                <Icon size={18} className="mx-auto mb-1 opacity-70" />
                <div className="text-2xl font-bold">{data.slaStatus[key] || 0}</div>
                <div className="text-xs font-medium mt-0.5">{key}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribusi Stage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-blue-500" />
            <h2 className="font-semibold text-gray-900">Distribusi Stage</h2>
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
    </div>
  );
}
