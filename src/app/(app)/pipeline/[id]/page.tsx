"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Clock, Edit2, History, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import ProspectModal from "../ProspectModal";

interface HistoryEntry {
  id: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  notes: string;
  changedAt: string;
  changedBy: { name: string };
}

interface Activity {
  id: string;
  tanggal: string;
  tipeAktivitas: string;
  topikHasil: string;
  catatan: string;
  linkMOM?: string;
  sales: { name: string };
}

interface MOM {
  id: string;
  title: string;
  tanggal: string;
  participants: string;
  sales: { name: string };
}

interface Prospect {
  id: string;
  namaProspek: string;
  channel: string;
  produkFokus: string;
  kontakPIC: string;
  kontakInfo: string;
  stage: string;
  tglMasuk: string;
  tglUpdateStage: string;
  nextAction: string;
  estUmkmReach: number;
  estNilaiDeal: number;
  probability: number;
  weightedUmkm: number;
  weightedNilai: number;
  statusSLA: string;
  reasonLost: string;
  linkDokumen: string;
  hariDiStage: number;
  sales: { id: string; name: string; email: string };
  history: HistoryEntry[];
  activities: Activity[];
  moms: MOM[];
}

const SLA_STYLES: Record<string, string> = {
  "On Track": "bg-green-100 text-green-700",
  "At Risk": "bg-yellow-100 text-yellow-700",
  "Overdue": "bg-red-100 text-red-700",
  "Closed": "bg-gray-100 text-gray-500",
};

const TAB_ITEMS = ["Detail", "History", "Activity Log", "MOM"];

export default function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Detail");
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    fetch(`/api/pipeline/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { setProspect(data); setLoading(false); });
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    if (!confirm("Yakin hapus prospek ini?")) return;
    setDeleting(true);
    await fetch(`/api/pipeline/${id}`, { method: "DELETE" });
    router.push("/pipeline");
  };

  const canEdit = user?.role === "admin" || prospect?.sales.id === user?.userId;

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
    </div>
  );

  if (!prospect) return (
    <div className="p-6 text-center text-gray-500">Prospek tidak ditemukan</div>
  );

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 md:mb-6 gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <Link href="/pipeline" className="text-gray-400 hover:text-gray-600 mt-1 shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">{prospect.namaProspek}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{prospect.stage}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SLA_STYLES[prospect.statusSLA]}`}>{prospect.statusSLA}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {canEdit && (
            <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-1 text-sm px-2.5 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700">
              <Edit2 size={14} />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}
          {user?.role === "admin" && (
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1 text-sm px-2.5 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50">
              <Trash2 size={14} />
              <span className="hidden sm:inline">Hapus</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="flex gap-0 mb-4 md:mb-5 border-b border-gray-200 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
        {TAB_ITEMS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`whitespace-nowrap px-3 md:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors shrink-0 ${
              tab === t ? "border-yellow-400 text-yellow-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
            {t === "History" && prospect.history.length > 0 && (
              <span className="ml-1 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{prospect.history.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "Detail" && (
        <div className="space-y-4 lg:grid lg:grid-cols-3 lg:gap-5 lg:space-y-0">
          {/* Info utama */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Informasi Prospek</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ["Channel", prospect.channel],
                ["Produk Fokus", prospect.produkFokus],
                ["Kontak PIC", prospect.kontakPIC],
                ["WA / Email", prospect.kontakInfo],
                ["Sales PIC", prospect.sales.name],
                ["Tgl Masuk", prospect.tglMasuk ? new Date(prospect.tglMasuk).toLocaleDateString("id-ID") : "-"],
                ["Tgl Update Stage", new Date(prospect.tglUpdateStage).toLocaleDateString("id-ID")],
                ["Hari di Stage", `${prospect.hariDiStage} hari`],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-gray-400 text-xs mb-0.5">{label}</div>
                  <div className="text-gray-900 font-medium text-sm break-words">{value || "-"}</div>
                </div>
              ))}
              <div className="col-span-2">
                <div className="text-gray-400 text-xs mb-0.5">Next Action</div>
                <div className="text-gray-900 text-sm">{prospect.nextAction || "-"}</div>
              </div>
              {prospect.reasonLost && (
                <div className="col-span-2">
                  <div className="text-gray-400 text-xs mb-0.5">Reason Lost</div>
                  <div className="text-red-700 bg-red-50 px-3 py-2 rounded-lg text-sm">{prospect.reasonLost}</div>
                </div>
              )}
              {prospect.linkDokumen && (
                <div className="col-span-2">
                  <div className="text-gray-400 text-xs mb-0.5">Link Dokumen</div>
                  <a href={prospect.linkDokumen} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all text-sm">
                    {prospect.linkDokumen}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-3">
            {/* Nilai deal — 2-col grid on mobile */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Nilai Deal</h3>
              <div className="grid grid-cols-2 gap-2 lg:block lg:space-y-2 text-sm">
                {[
                  ["Est. UMKM", prospect.estUmkmReach?.toLocaleString("id-ID") || "-", ""],
                  ["Nilai Deal", prospect.estNilaiDeal ? `Rp ${prospect.estNilaiDeal.toLocaleString("id-ID")}` : "-", ""],
                  ["Probability", prospect.probability != null ? `${(prospect.probability * 100).toFixed(0)}%` : "-", "text-green-600"],
                  ["Weighted UMKM", Math.round(prospect.weightedUmkm || 0).toLocaleString("id-ID"), "text-blue-600"],
                  ["Weighted Nilai", `Rp ${Math.round(prospect.weightedNilai || 0).toLocaleString("id-ID")}`, "text-blue-600"],
                ].map(([label, value, accent]) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-2.5 lg:bg-transparent lg:p-0 lg:flex lg:justify-between lg:border-b lg:border-gray-50 lg:pb-2 lg:last:border-0">
                    <span className="text-gray-500 text-xs block lg:inline">{label}</span>
                    <span className={`font-semibold text-sm ${accent || "text-gray-900"}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{prospect.moms.length}</div>
                <div className="text-xs text-gray-400 mt-0.5">MOM</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{prospect.activities.length}</div>
                <div className="text-xs text-gray-400 mt-0.5">Aktivitas</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "History" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <History size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Riwayat Perubahan</h2>
          </div>
          {prospect.history.length === 0 ? (
            <div className="text-center text-gray-400 py-8">Belum ada riwayat perubahan</div>
          ) : (
            <div className="space-y-3">
              {prospect.history.map((h, i) => (
                <div key={h.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                    {i < prospect.history.length - 1 && <div className="w-0.5 bg-gray-200 flex-1 mt-1" />}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{h.fieldName}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(h.changedAt).toLocaleString("id-ID")}
                      </span>
                      <span className="text-xs text-gray-500">oleh {h.changedBy.name}</span>
                    </div>
                    <div className="flex gap-2 items-center text-sm">
                      {h.oldValue && (
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded line-through text-xs">{h.oldValue}</span>
                      )}
                      <span className="text-gray-400 text-xs">→</span>
                      <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs font-medium">{h.newValue}</span>
                    </div>
                    {h.notes && <div className="text-xs text-gray-400 mt-1 italic">{h.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Activity Log" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Activity Log</h2>
            <Link
              href={`/activities?prospectId=${id}`}
              className="text-xs text-yellow-600 hover:text-yellow-700 font-medium"
            >
              + Tambah Aktivitas
            </Link>
          </div>
          {prospect.activities.length === 0 ? (
            <div className="text-center text-gray-400 py-8">Belum ada aktivitas</div>
          ) : (
            <div className="space-y-3">
              {prospect.activities.map((a) => (
                <div key={a.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{a.tipeAktivitas}</span>
                      <span className="text-xs text-gray-400">{a.sales.name}</span>
                    </div>
                    <div className="text-sm text-gray-700">{a.topikHasil || "-"}</div>
                    {a.catatan && <div className="text-xs text-gray-400 mt-0.5">{a.catatan}</div>}
                    {a.linkMOM && (
                      <div className="text-xs mt-1">
                        {a.linkMOM.startsWith("/") ? (
                          <Link
                            href={a.linkMOM}
                            className="text-yellow-700 hover:text-yellow-800 underline underline-offset-2"
                          >
                            Lihat MOM
                          </Link>
                        ) : (
                          <a
                            href={a.linkMOM}
                            target="_blank"
                            rel="noreferrer"
                            className="text-yellow-700 hover:text-yellow-800 underline underline-offset-2"
                          >
                            Lihat MOM
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(a.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "MOM" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-gray-400" />
              <h2 className="font-semibold text-gray-900">Minutes of Meeting</h2>
            </div>
            <Link
              href={`/mom/new?prospectId=${id}`}
              className="text-xs text-yellow-600 hover:text-yellow-700 font-medium"
            >
              + Buat MOM
            </Link>
          </div>
          {prospect.moms.length === 0 ? (
            <div className="text-center text-gray-400 py-8">Belum ada MOM tersimpan</div>
          ) : (
            <div className="space-y-3">
              {prospect.moms.map((m) => (
                <Link key={m.id} href={`/mom/${m.id}`} className="block p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900 mb-1">{m.title}</div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{new Date(m.tanggal).toLocaleDateString("id-ID")}</span>
                    <span>·</span>
                    <span>{m.sales.name}</span>
                    {m.participants && <><span>·</span><span>{m.participants.split(",").length} peserta</span></>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {showEdit && prospect && (
        <ProspectModal
          prospectId={id}
          initialData={{
            namaProspek: prospect.namaProspek,
            channel: prospect.channel,
            produkFokus: prospect.produkFokus,
            kontakPIC: prospect.kontakPIC,
            kontakInfo: prospect.kontakInfo,
            stage: prospect.stage,
            nextAction: prospect.nextAction,
            estUmkmReach: prospect.estUmkmReach?.toString() || "",
            estNilaiDeal: prospect.estNilaiDeal?.toString() || "",
            probability: prospect.probability?.toString() || "",
            reasonLost: prospect.reasonLost,
            linkDokumen: prospect.linkDokumen,
          }}
          userRole={user?.role || "sales"}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); }}
        />
      )}
    </div>
  );
}
