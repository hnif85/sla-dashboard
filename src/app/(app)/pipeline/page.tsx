"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Eye, ChevronRight } from "lucide-react";
import ProspectModal from "./ProspectModal";
import { getCached, setCached, bustCachePrefix } from "@/lib/fetch-cache";

interface Prospect {
  id: string;
  namaProspek: string;
  channel: string;
  stage: string;
  nextAction: string;
  estUmkmReach: number;
  estNilaiDeal: number;
  probability: number;
  weightedUmkm: number;
  statusSLA: string;
  tglUpdateStage: string;
  hariDiStage: number;
  sales: { id: string; name: string };
}

const SLA_STYLES: Record<string, string> = {
  "On Track": "bg-green-100 text-green-700 border-green-200",
  "At Risk": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Overdue": "bg-red-100 text-red-700 border-red-200",
  "Closed": "bg-gray-100 text-gray-500 border-gray-200",
};

export default function PipelinePage() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>(() => getCached<Prospect[]>("/api/pipeline") ?? []);
  const [loading, setLoading] = useState(() => getCached<Prospect[]>("/api/pipeline") === null);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterSLA, setFilterSLA] = useState("");
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    fetch("/api/pipeline")
      .then((r) => r.json())
      .then((data) => { setCached("/api/pipeline", data); setProspects(data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Always refresh in background even if we have cached data
    const stale = getCached<Prospect[]>("/api/pipeline");
    if (stale) setLoading(false);
    load();
  }, []);

  const filtered = prospects.filter((p) => {
    const matchSearch = !search || p.namaProspek.toLowerCase().includes(search.toLowerCase()) ||
      p.channel?.toLowerCase().includes(search.toLowerCase());
    const matchStage = !filterStage || p.stage === filterStage;
    const matchSLA = !filterSLA || p.statusSLA === filterSLA;
    return matchSearch && matchStage && matchSLA;
  });

  const stages = [...new Set(prospects.map((p) => p.stage))].sort();

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Pipeline Prospek</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">{filtered.length} dari {prospects.length} prospek</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Tambah Prospek</span>
          <span className="sm:hidden">Tambah</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 p-3 md:p-4 space-y-2 md:space-y-0 md:flex md:flex-wrap md:gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Cari nama prospek..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none min-w-0 text-gray-900 bg-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none text-gray-900 bg-white"
          >
            <option value="">Semua Stage</option>
            {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterSLA}
            onChange={(e) => setFilterSLA(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none text-gray-900 bg-white"
          >
            <option value="">Semua SLA</option>
            {["On Track", "At Risk", "Overdue"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Prospek</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Sales</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Stage</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Est. UMKM</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Prob.</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">SLA</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Hari</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.namaProspek}</div>
                      <div className="text-xs text-gray-400">{p.channel || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.sales.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">{p.stage}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{p.estUmkmReach?.toLocaleString("id-ID") || "-"}</td>
                    <td className="px-4 py-3 text-gray-700">{p.probability != null ? `${(p.probability * 100).toFixed(0)}%` : "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${SLA_STYLES[p.statusSLA] || SLA_STYLES["Closed"]}`}>{p.statusSLA}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.hariDiStage}h</td>
                    <td className="px-4 py-3">
                      <Link href={`/pipeline/${p.id}`} className="flex items-center gap-1 text-yellow-600 hover:text-yellow-700 font-medium text-xs">
                        <Eye size={14} /> Detail <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">Tidak ada prospek ditemukan</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
                Tidak ada prospek ditemukan
              </div>
            )}
            {filtered.map((p) => (
              <Link key={p.id} href={`/pipeline/${p.id}`} className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 active:bg-gray-50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{p.namaProspek}</div>
                    <div className="text-xs text-gray-400">{p.channel || "-"} · {p.sales.name}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${SLA_STYLES[p.statusSLA] || SLA_STYLES["Closed"]}`}>
                    {p.statusSLA}
                  </span>
                </div>
                <div className="flex items-center gap-1 mb-3">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium truncate">{p.stage}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg py-1.5">
                    <div className="text-xs text-gray-400">Est. UMKM</div>
                    <div className="text-sm font-bold text-gray-800">{p.estUmkmReach?.toLocaleString("id-ID") || "—"}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg py-1.5">
                    <div className="text-xs text-gray-400">Probabilitas</div>
                    <div className="text-sm font-bold text-gray-800">{p.probability != null ? `${(p.probability * 100).toFixed(0)}%` : "—"}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg py-1.5">
                    <div className="text-xs text-gray-400">Hari di Stage</div>
                    <div className="text-sm font-bold text-gray-800">{p.hariDiStage} hari</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <ProspectModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); bustCachePrefix("/api/pipeline"); bustCachePrefix("/api/dashboard"); load(); }}
          userRole={user?.role || "sales"}
        />
      )}
    </div>
  );
}
