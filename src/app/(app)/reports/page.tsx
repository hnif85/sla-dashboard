"use client";
import { useEffect, useState } from "react";
import { TrendingUp, Award, Target } from "lucide-react";

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
  salesPerformance: Array<{ name: string; closed: number; pipeline: number; total: number }>;
}

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

  const sorted = [...(data.salesPerformance || [])].sort((a, b) => b.closed - a.closed);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
        <p className="text-gray-500 text-sm mt-0.5">Rekap performa pipeline & sales</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-yellow-500" />
            <h2 className="font-semibold text-gray-900">Performa per Sales</h2>
          </div>
          <div className="space-y-3">
            {sorted.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900">{s.name}</span>
                    <span className="text-sm font-bold text-green-600">{s.closed.toLocaleString("id-ID")} UMKM closed</span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400">
                    <span>Pipeline: {Math.round(s.pipeline).toLocaleString("id-ID")} (weighted)</span>
                    <span>Total: {s.total} prospek</span>
                  </div>
                </div>
              </div>
            ))}
            {sorted.length === 0 && <div className="text-gray-400 text-sm text-center py-4">Belum ada data</div>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-blue-500" />
            <h2 className="font-semibold text-gray-900">Distribusi Stage</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(data.stageCount).sort(([a], [b]) => a.localeCompare(b)).map(([stage, count]) => {
              const total = Object.values(data.stageCount).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={stage}>
                  <div className="flex justify-between text-sm mb-0.5">
                    <span className="text-gray-600 truncate">{stage}</span>
                    <span className="text-gray-900 font-medium ml-2">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-red-500" />
            <h2 className="font-semibold text-gray-900">SLA Health Check</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "On Track", color: "bg-green-100 text-green-700 border-green-200" },
              { key: "At Risk", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
              { key: "Overdue", color: "bg-red-100 text-red-700 border-red-200" },
            ].map(({ key, color }) => (
              <div key={key} className={`rounded-xl border p-4 text-center ${color}`}>
                <div className="text-2xl font-bold">{data.slaStatus[key] || 0}</div>
                <div className="text-xs font-medium mt-0.5">{key}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-green-500" />
            <h2 className="font-semibold text-gray-900">Ringkasan Northstar</h2>
          </div>
          <div className="space-y-3 text-sm">
            {[
              ["Target Nasional", "100.000 UMKM"],
              ["Total Closed Won", `${data.summary.totalUmkmClosed.toLocaleString("id-ID")} UMKM`],
              ["% Tercapai", `${(data.summary.northstarPct * 100).toFixed(2)}%`],
              ["Pipeline Aktif", `${data.summary.totalPipelineOpen} prospek`],
              ["Weighted Pipeline", `${Math.round(data.summary.weightedPipeline).toLocaleString("id-ID")} UMKM`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-gray-50 pb-2 last:border-0">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
