"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Filter, Eye, ChevronRight } from "lucide-react";
import ProspectModal from "./ProspectModal";

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
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterSLA, setFilterSLA] = useState("");
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    fetch("/api/pipeline")
      .then((r) => r.json())
      .then(setProspects)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = prospects.filter((p) => {
    const matchSearch = !search || p.namaProspek.toLowerCase().includes(search.toLowerCase()) ||
      p.channel?.toLowerCase().includes(search.toLowerCase());
    const matchStage = !filterStage || p.stage === filterStage;
    const matchSLA = !filterSLA || p.statusSLA === filterSLA;
    return matchSearch && matchStage && matchSLA;
  });

  const stages = [...new Set(prospects.map((p) => p.stage))].sort();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Prospek</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filtered.length} dari {prospects.length} prospek</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} />
          Tambah Prospek
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-5 p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama prospek, channel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none"
          >
            <option value="">Semua Stage</option>
            {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterSLA}
            onChange={(e) => setFilterSLA(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none"
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Prospek</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Sales</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Stage</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Est. UMKM</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Probability</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Status SLA</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Hari di Stage</th>
                <th className="px-4 py-3"></th>
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
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                      {p.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {p.estUmkmReach?.toLocaleString("id-ID") || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {p.probability != null ? `${(p.probability * 100).toFixed(0)}%` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${SLA_STYLES[p.statusSLA] || SLA_STYLES["Closed"]}`}>
                      {p.statusSLA}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.hariDiStage} hari</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/pipeline/${p.id}`}
                      className="flex items-center gap-1 text-yellow-600 hover:text-yellow-700 font-medium text-xs"
                    >
                      <Eye size={14} />
                      Detail
                      <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Tidak ada prospek ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ProspectModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
          userRole={user?.role || "sales"}
        />
      )}
    </div>
  );
}
