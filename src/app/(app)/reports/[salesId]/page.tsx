"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { usePipelineFilter } from "@/contexts/PipelineFilterContext";
import {
  ArrowLeft, TrendingUp, Users, Target, CheckCircle2, AlertTriangle,
  XCircle, Activity, FileText, Clock, ChevronDown, ChevronUp,
  TrendingUp as TrendingUpIcon, Calendar, Award, Layers, Sparkles,
  RefreshCw, X, ExternalLink, ChevronRight,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";

/* ─── Types: Main Report ──────────────────────────────────────── */
interface SalesInfo { id: string; name: string; region: string | null; role: string; active: boolean; }
interface Summary {
  totalProspects: number; closedWonCount: number; closedWonUmkm: number;
  closedLostCount: number; activePipelineCount: number; weightedPipeline: number;
  winRate: number; avgDealSize: number;
}
interface FunnelStageItem { stage: string; order: number; count: number; convRateTarget: number; pctOfTotal: number; }
interface SLAHealth {
  onTrack: number; atRisk: number; overdue: number;
  overdueProspects: ProspectSLA[]; atRiskProspects: ProspectSLA[];
}
interface ProspectSLA { id: string; namaProspek: string; stage: string; hariDiStage: number; statusSLA: string; pipelineType?: string | null; }
interface PipelineItem {
  id: string; namaProspek: string; stage: string; statusSLA: string; hariDiStage: number;
  estUmkmReach: number | null; estNilaiDeal: number | null; probability: number | null;
  weightedUmkm: number | null; tglUpdateStage: string; channel: string | null; produkFokus: string | null; pipelineType: string | null;
}
interface ActivityGrowthPoint { date: string; total: number; [key: string]: string | number; }
interface MOMItem { id: string; title: string; tanggal: string; prospectId: string | null; prospectName: string | null; participants: string | null; agenda: string | null; }
interface TimelineItem { type: "activity" | "stage_change" | "mom"; date: string; label: string; detail: string; prospectId?: string | null; prospectName?: string | null; linkId?: string; }
interface ReportData {
  salesInfo: SalesInfo; summary: Summary; funnelConversion: FunnelStageItem[];
  slaHealth: SLAHealth; activePipeline: PipelineItem[]; activityGrowth: ActivityGrowthPoint[];
  activityTypes: string[]; activityChartDays: number; moms: MOMItem[]; timeline: TimelineItem[];
}

/* ─── Types: Prospect Drawer ──────────────────────────────────── */
interface ProspectDetail {
  id: string; namaProspek: string; channel: string | null; produkFokus: string | null;
  kontakPIC: string | null; kontakInfo: string | null; stage: string; tglMasuk: string;
  tglUpdateStage: string; estUmkmReach: number | null; estNilaiDeal: number | null;
  probability: number | null; weightedUmkm: number | null; nextAction: string | null;
  reasonLost: string | null; linkDokumen: string | null; statusSLA: string; hariDiStage: number;
}
interface ProspectActivity { id: string; tanggal: string; tipeAktivitas: string; namaProspek: string | null; pic: string | null; topikHasil: string | null; catatan: string | null; nextStage: string | null; linkMOM: string | null; }
interface ProspectMOM { id: string; title: string; tanggal: string; participants: string | null; agenda: string | null; discussion: string | null; decisions: string | null; actionItems: string | null; nextMeeting: string | null; }
interface ProspectStageHistory { id: string; changedAt: string; oldValue: string | null; newValue: string | null; notes: string | null; changedBy: { name: string }; }
interface CachedSummary { summary: string; generatedAt: string; generatedBy: string; isStale: boolean; activitiesCount: number; momsCount: number; }
interface DrawerData { prospect: ProspectDetail; activities: ProspectActivity[]; moms: ProspectMOM[]; stageHistory: ProspectStageHistory[]; cachedSummary: CachedSummary | null; currentHash: string; }

/* ─── Color palette ───────────────────────────────────────────── */
const ALL_ACTIVITY_TYPES = [
  "Email", "Meeting Online", "Meeting Offline",
  "Presentasi", "Demo", "Negosiasi", "Follow Up", "Lainnya",
];

const TYPE_COLORS: Record<string, string> = {
  "Email": "#6366f1", "Meeting Online": "#3b82f6",
  "Meeting Offline": "#8b5cf6", "Presentasi": "#f59e0b", "Demo": "#ef4444",
  "Negosiasi": "#ec4899", "Follow Up": "#10b981", "Lainnya": "#94a3b8",
};
function getTypeColor(type: string, idx: number): string {
  if (TYPE_COLORS[type]) return TYPE_COLORS[type];
  const fallback = ["#6366f1","#10b981","#3b82f6","#f59e0b","#ef4444","#ec4899","#14b8a6","#8b5cf6","#94a3b8"];
  return fallback[idx % fallback.length];
}

/* ─── SLA badge ───────────────────────────────────────────────── */
function SLABadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "On Track": "bg-green-100 text-green-700 border-green-200",
    "At Risk": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Overdue": "bg-red-100 text-red-700 border-red-200",
    "Closed": "bg-gray-100 text-gray-500 border-gray-200",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>{status}</span>;
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function fmtDate(d: string) { return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); }
function fmtDateShort(d: string) { return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" }); }
function fmtNum(n: number) { return n.toLocaleString("id-ID"); }
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  const days = Math.floor(hrs / 24);
  return `${days}h lalu`;
}

const PERIOD_OPTIONS = [
  { label: "7 hari", days: 7 }, { label: "14 hari", days: 14 },
  { label: "30 hari", days: 30 }, { label: "90 hari", days: 90 },
];

/* ─── Custom Recharts Tooltip ─────────────────────────────────── */
function CumulativeTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string; }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => b.value - a.value);
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm min-w-[180px] max-w-[240px]">
      <p className="font-semibold text-gray-700 mb-2 text-xs">{label ? fmtDateShort(label) : ""}</p>
      {sorted.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3 py-0.5">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-gray-600 truncate text-xs">{p.name}</span>
          </span>
          <span className="font-bold text-gray-900 text-xs tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROSPECT DRAWER
═══════════════════════════════════════════════════════════════ */
function ProspectDrawer({
  salesId, prospect: pipelineItem, onClose,
}: { salesId: string; prospect: PipelineItem; onClose: () => void }) {
  const [data, setData] = useState<DrawerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"aktivitas" | "mom" | "stage">("aktivitas");
  const [summaryState, setSummaryState] = useState<CachedSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Load prospect detail
  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/sales/${salesId}/prospect/${pipelineItem.id}`)
      .then((r) => r.json())
      .then((d: DrawerData) => {
        setData(d);
        setSummaryState(d.cachedSummary);
      })
      .finally(() => setLoading(false));
  }, [salesId, pipelineItem.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleGenerate = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await fetch(`/api/reports/sales/${salesId}/prospect/${pipelineItem.id}/summarize`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setSummaryError(json.error || "Gagal generate"); return; }
      setSummaryState(json);
    } catch {
      setSummaryError("Terjadi kesalahan jaringan");
    } finally {
      setSummaryLoading(false);
    }
  }, [salesId, pipelineItem.id]);

  const isStale = summaryState?.isStale ?? false;
  const hasSummary = !!summaryState?.summary;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 h-full w-full sm:w-[520px] lg:w-[600px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: "slideInRight 0.22s ease-out" }}
      >
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="mt-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <X size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-gray-900 text-base truncate">{pipelineItem.namaProspek}</h2>
              <SLABadge status={pipelineItem.statusSLA} />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
              <span>{pipelineItem.stage}</span>
              <span>·</span>
              <span>{pipelineItem.hariDiStage} hari di stage ini</span>
              {pipelineItem.channel && <><span>·</span><span>{pipelineItem.channel}</span></>}
            </div>
          </div>
          <Link
            href={`/pipeline/${pipelineItem.id}`}
            className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
          >
            <ExternalLink size={12} /> Buka
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-yellow-400" />
            </div>
          ) : !data ? (
            <div className="p-6 text-center text-gray-400">Gagal memuat data</div>
          ) : (
            <>
              {/* ── Prospect meta cards ── */}
              <div className="grid grid-cols-2 gap-3 p-4 pb-0">
                {[
                  { label: "Est. UMKM", value: data.prospect.estUmkmReach ? fmtNum(data.prospect.estUmkmReach) : "—" },
                  { label: "Probabilitas", value: data.prospect.probability ? `${(data.prospect.probability * 100).toFixed(0)}%` : "—" },
                  { label: "Produk Fokus", value: data.prospect.produkFokus || "—" },
                  { label: "Tgl Masuk", value: fmtDate(data.prospect.tglMasuk) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                    <div className="text-sm font-semibold text-gray-800 truncate">{value}</div>
                  </div>
                ))}
              </div>
              {data.prospect.nextAction && (
                <div className="mx-4 mt-3 px-3 py-2.5 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-800">
                  <span className="font-semibold">Next Action: </span>{data.prospect.nextAction}
                </div>
              )}

              {/* ── AI Summary ── */}
              <div className="mx-4 mt-4 border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-100">
                  <Sparkles size={15} className="text-purple-500" />
                  <span className="text-sm font-semibold text-gray-800">Ringkasan AI</span>
                  {hasSummary && summaryState && (
                    <span className="ml-auto text-xs text-gray-400">{timeAgo(summaryState.generatedAt)} oleh {summaryState.generatedBy}</span>
                  )}
                </div>

                <div className="p-4">
                  {/* Stale warning */}
                  {hasSummary && isStale && (
                    <div className="flex items-start gap-2 mb-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                      <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                      <span>Ada aktivitas atau MOM baru sejak ringkasan ini dibuat. Perbarui untuk hasil terkini.</span>
                    </div>
                  )}

                  {hasSummary && summaryState ? (
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                      {summaryState.summary}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mb-3">
                      Belum ada ringkasan. Klik tombol di bawah untuk generate dengan AI.
                    </p>
                  )}

                  {summaryError && (
                    <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{summaryError}</div>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={summaryLoading}
                    className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                      isStale
                        ? "bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                        : hasSummary
                        ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                    }`}
                  >
                    {summaryLoading ? (
                      <><RefreshCw size={13} className="animate-spin" /> Generating…</>
                    ) : isStale ? (
                      <><RefreshCw size={13} /> Perbarui Ringkasan</>
                    ) : hasSummary ? (
                      <><RefreshCw size={13} /> Generate Ulang</>
                    ) : (
                      <><Sparkles size={13} /> Generate Ringkasan</>
                    )}
                  </button>

                  {hasSummary && summaryState && (
                    <p className="text-xs text-gray-400 mt-2">
                      Berdasarkan {summaryState.activitiesCount} aktivitas, {summaryState.momsCount} MOM
                    </p>
                  )}
                </div>
              </div>

              {/* ── Tabs ── */}
              <div className="mt-4">
                <div className="flex border-b border-gray-100 px-4">
                  {([
                    { key: "aktivitas", label: "Aktivitas", count: data.activities.length },
                    { key: "mom", label: "MOM", count: data.moms.length },
                    { key: "stage", label: "Stage History", count: data.stageHistory.length },
                  ] as const).map(({ key, label, count }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex items-center gap-1.5 pb-2.5 pt-1 mr-5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === key
                          ? "border-yellow-400 text-gray-900"
                          : "border-transparent text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {label}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === key ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Aktivitas */}
                {activeTab === "aktivitas" && (
                  <div className="divide-y divide-gray-50">
                    {data.activities.length === 0 ? (
                      <p className="text-center text-gray-400 py-8 text-sm px-4">Belum ada aktivitas</p>
                    ) : (
                      data.activities.map((a) => (
                        <div key={a.id} className="px-5 py-3.5">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{a.tipeAktivitas}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(a.tanggal)}</span>
                          </div>
                          {a.topikHasil && <p className="text-sm text-gray-800 mt-1">{a.topikHasil}</p>}
                          {a.catatan && <p className="text-xs text-gray-500 mt-0.5">{a.catatan}</p>}
                          {a.nextStage && (
                            <div className="mt-1.5 flex items-center gap-1 text-xs text-purple-600">
                              <ChevronRight size={11} />
                              <span>Next: {a.nextStage}</span>
                            </div>
                          )}
                          {a.linkMOM && (
                            <Link href={a.linkMOM} className="mt-1 text-xs text-green-600 hover:underline flex items-center gap-1">
                              <FileText size={11} /> Lihat MOM
                            </Link>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* MOM */}
                {activeTab === "mom" && (
                  <div className="divide-y divide-gray-50">
                    {data.moms.length === 0 ? (
                      <p className="text-center text-gray-400 py-8 text-sm px-4">Belum ada MOM</p>
                    ) : (
                      data.moms.map((m) => (
                        <div key={m.id} className="px-5 py-3.5">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <Link href={`/mom/${m.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline flex-1">{m.title}</Link>
                            <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(m.tanggal)}</span>
                          </div>
                          {m.agenda && <p className="text-xs text-gray-500 mb-1"><span className="font-medium text-gray-600">Agenda:</span> {m.agenda}</p>}
                          {m.decisions && <p className="text-xs text-gray-600 mb-1"><span className="font-medium">Keputusan:</span> {m.decisions.slice(0, 200)}</p>}
                          {m.actionItems && <p className="text-xs text-gray-600"><span className="font-medium">Action Items:</span> {m.actionItems.slice(0, 200)}</p>}
                          {m.nextMeeting && <p className="text-xs text-blue-500 mt-1">Next meeting: {fmtDate(m.nextMeeting)}</p>}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Stage History */}
                {activeTab === "stage" && (
                  <div className="p-4">
                    {data.stageHistory.length === 0 ? (
                      <p className="text-center text-gray-400 py-8 text-sm">Belum ada perubahan stage tercatat</p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-100" />
                        <div className="space-y-3">
                          {data.stageHistory.map((h, idx) => (
                            <div key={h.id} className="flex gap-3">
                              <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${idx === 0 ? "bg-purple-100" : "bg-gray-100"}`}>
                                <Layers size={11} className={idx === 0 ? "text-purple-600" : "text-gray-400"} />
                              </div>
                              <div className="flex-1 min-w-0 pb-1">
                                <div className="text-xs font-medium text-gray-800">
                                  <span className="text-gray-400">{h.oldValue ?? "—"}</span>
                                  {" → "}
                                  <span className="text-purple-700 font-semibold">{h.newValue ?? "—"}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-400">{fmtDate(h.changedAt)}</span>
                                  <span className="text-xs text-gray-300">·</span>
                                  <span className="text-xs text-gray-400">{h.changedBy.name}</span>
                                </div>
                                {h.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{h.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function SalesReportPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { pipelineType } = usePipelineFilter();
  const salesId = params.salesId as string;

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartDays, setChartDays] = useState(30);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [showAllOverdue, setShowAllOverdue] = useState(false);
  const [showAllAtRisk, setShowAllAtRisk] = useState(false);
  const [pipelineSort, setPipelineSort] = useState<"stage" | "sla" | "hari" | "umkm">("sla");
  const [pipelineSortDir, setPipelineSortDir] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState<"pipeline" | "timeline" | "mom">("pipeline");
  const [selectedProspect, setSelectedProspect] = useState<PipelineItem | null>(null);

  const load = useCallback(async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ days: String(days) });
      if (pipelineType) query.set("pipelineType", pipelineType);
      const res = await fetch(`/api/reports/sales/${salesId}?${query.toString()}`);
      if (res.status === 403) { setError("Akses ditolak"); return; }
      if (res.status === 404) { setError("Sales tidak ditemukan"); return; }
      if (!res.ok) { setError("Gagal memuat data laporan"); return; }
      setData(await res.json());
    } catch { setError("Terjadi kesalahan jaringan"); }
    finally { setLoading(false); }
  }, [salesId, pipelineType]);

  useEffect(() => { load(chartDays); }, [load, chartDays]);

  useEffect(() => {
    if (user && user.role === "sales" && user.userId !== salesId) router.replace("/reports");
  }, [user, salesId, router]);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
    </div>
  );

  if (error) return (
    <div className="p-6 text-center">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 inline-block">
        <XCircle size={32} className="text-red-400 mx-auto mb-2" />
        <p className="text-red-700 font-medium">{error}</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-gray-500 hover:text-gray-700">← Kembali</button>
      </div>
    </div>
  );

  if (!data) return null;

  const { salesInfo, summary, funnelConversion, slaHealth, activePipeline, activityGrowth, activityTypes, moms, timeline } = data;

  // Sort pipeline
  const slaOrder: Record<string, number> = { "Overdue": 3, "At Risk": 2, "On Track": 1, "Closed": 0 };
  const sortedPipeline = [...activePipeline].sort((a, b) => {
    if (pipelineSort === "sla") {
      const d = (slaOrder[b.statusSLA] || 0) - (slaOrder[a.statusSLA] || 0);
      return pipelineSortDir === "desc" ? d : -d;
    }
    if (pipelineSort === "hari") return pipelineSortDir === "desc" ? b.hariDiStage - a.hariDiStage : a.hariDiStage - b.hariDiStage;
    if (pipelineSort === "umkm") return pipelineSortDir === "desc" ? (b.estUmkmReach || 0) - (a.estUmkmReach || 0) : (a.estUmkmReach || 0) - (b.estUmkmReach || 0);
    return pipelineSortDir === "desc" ? a.stage.localeCompare(b.stage) : b.stage.localeCompare(a.stage);
  });

  function toggleSort(key: typeof pipelineSort) {
    if (pipelineSort === key) setPipelineSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setPipelineSort(key); setPipelineSortDir("desc"); }
  }

  function SortBtn({ col, label }: { col: typeof pipelineSort; label: string }) {
    const active = pipelineSort === col;
    return (
      <button onClick={() => toggleSort(col)} className={`flex items-center gap-0.5 whitespace-nowrap font-semibold ${active ? "text-yellow-600" : "text-gray-500"}`}>
        {label}
        {active ? (pipelineSortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : <ChevronDown size={12} className="opacity-30" />}
      </button>
    );
  }

  function TimelineIcon({ type }: { type: string }) {
    if (type === "activity") return <Activity size={14} className="text-blue-500" />;
    if (type === "stage_change") return <Layers size={14} className="text-purple-500" />;
    return <FileText size={14} className="text-green-500" />;
  }

  return (
    <>
      {/* Prospect Drawer */}
      {selectedProspect && (
        <ProspectDrawer
          salesId={salesId}
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
        />
      )}

      <div className="p-4 md:p-6 space-y-5 md:space-y-6">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-start gap-3">
          <button onClick={() => router.back()} className="mt-0.5 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{salesInfo.name}</h1>
              {salesInfo.region && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">{salesInfo.region}</span>}
              {!salesInfo.active && <span className="text-xs bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full font-medium">Nonaktif</span>}
            </div>
            <p className="text-gray-400 text-xs mt-0.5">Laporan performa sales · data real-time</p>
          </div>
          <Link href={`/pipeline?sales=${encodeURIComponent(salesInfo.name)}`} className="flex-shrink-0 text-xs bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-3 py-2 rounded-lg transition-colors hidden sm:flex items-center gap-1.5">
            <Target size={13} /> Lihat Pipeline
          </Link>
        </div>

        {/* ── Statistik Ringkasan ─────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Prospek", value: fmtNum(summary.totalProspects), sub: `${summary.closedWonCount} won · ${summary.closedLostCount} lost`, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "UMKM Closed Won", value: fmtNum(summary.closedWonUmkm), sub: `Rata-rata ${fmtNum(Math.round(summary.avgDealSize))} / deal`, icon: Award, color: "text-green-600", bg: "bg-green-50" },
            { label: "Win Rate", value: `${(summary.winRate * 100).toFixed(1)}%`, sub: `${summary.closedWonCount} won dari ${summary.closedWonCount + summary.closedLostCount} closed`, icon: Target, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Pipeline Aktif", value: fmtNum(summary.activePipelineCount), sub: `Weighted: ${fmtNum(Math.round(summary.weightedPipeline))} UMKM`, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
          ].map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={color} />
                </div>
                <span className="text-xs text-gray-400 font-medium leading-tight">{label}</span>
              </div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {/* ── SLA Health ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-red-500" />
            <h2 className="font-semibold text-gray-900">SLA Health — Pipeline Aktif</h2>
            <span className="text-xs text-gray-400 ml-auto">{summary.activePipelineCount} prospek</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { key: "onTrack", label: "On Track", count: slaHealth.onTrack, color: "bg-green-50 border-green-200 text-green-700", icon: CheckCircle2 },
              { key: "atRisk", label: "At Risk", count: slaHealth.atRisk, color: "bg-yellow-50 border-yellow-200 text-yellow-700", icon: AlertTriangle },
              { key: "overdue", label: "Overdue", count: slaHealth.overdue, color: "bg-red-50 border-red-200 text-red-700", icon: XCircle },
            ].map(({ key, label, count, color, icon: Icon }) => (
              <div key={key} className={`rounded-xl border p-4 text-center ${color}`}>
                <Icon size={18} className="mx-auto mb-1 opacity-60" />
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs font-medium mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          {summary.activePipelineCount > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-4">
              {slaHealth.onTrack > 0 && <div className="bg-green-400 rounded-l-full" style={{ width: `${(slaHealth.onTrack / summary.activePipelineCount) * 100}%` }} />}
              {slaHealth.atRisk > 0 && <div className="bg-yellow-400" style={{ width: `${(slaHealth.atRisk / summary.activePipelineCount) * 100}%` }} />}
              {slaHealth.overdue > 0 && <div className="bg-red-400 rounded-r-full" style={{ width: `${(slaHealth.overdue / summary.activePipelineCount) * 100}%` }} />}
            </div>
          )}
          {slaHealth.overdueProspects.length > 0 && (
            <div className="mb-3">
              <button onClick={() => setShowAllOverdue((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-red-600 mb-2 hover:text-red-700">
                <XCircle size={13} />{slaHealth.overdueProspects.length} Overdue{showAllOverdue ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showAllOverdue && (
                <div className="space-y-1.5">
                  {slaHealth.overdueProspects.map((p) => (
                    <button key={p.id} onClick={() => { const item = activePipeline.find((x) => x.id === p.id); if (item) setSelectedProspect(item); }} className="w-full flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-left">
                      <span className="text-sm text-red-800 font-medium truncate">{p.namaProspek}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-xs text-red-500">{p.stage}</span>
                        <span className="text-xs font-bold text-red-700">{p.hariDiStage}h</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {slaHealth.atRiskProspects.length > 0 && (
            <div>
              <button onClick={() => setShowAllAtRisk((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-yellow-600 mb-2 hover:text-yellow-700">
                <AlertTriangle size={13} />{slaHealth.atRiskProspects.length} At Risk{showAllAtRisk ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showAllAtRisk && (
                <div className="space-y-1.5">
                  {slaHealth.atRiskProspects.map((p) => (
                    <button key={p.id} onClick={() => { const item = activePipeline.find((x) => x.id === p.id); if (item) setSelectedProspect(item); }} className="w-full flex items-center justify-between px-3 py-2 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors text-left">
                      <span className="text-sm text-yellow-800 font-medium truncate">{p.namaProspek}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-xs text-yellow-600">{p.stage}</span>
                        <span className="text-xs font-bold text-yellow-700">{p.hariDiStage}h</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Grafik Kumulatif Aktivitas ──────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center gap-2 mr-auto">
              <TrendingUpIcon size={16} className="text-blue-500" />
              <h2 className="font-semibold text-gray-900">Akumulasi Aktivitas</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">kumulatif</span>
            </div>
            <div className="flex gap-1.5">
              {PERIOD_OPTIONS.map((opt) => (
                <button key={opt.days} onClick={() => setChartDays(opt.days)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${chartDays === opt.days ? "bg-yellow-400 text-gray-900" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {/* Filter aktivitas */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <span className="text-xs text-gray-400 font-medium mr-1">Jenis:</span>
            <button
              onClick={() => setTypeFilter([])}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                typeFilter.length === 0
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              Semua
            </button>
            {ALL_ACTIVITY_TYPES.filter((t) => activityTypes.includes(t)).map((type) => {
              const active = typeFilter.length === 0 || typeFilter.includes(type);
              return (
                <button
                  key={type}
                  onClick={() =>
                    setTypeFilter((prev) => {
                      if (prev.length === 0) return [type];
                      if (prev.includes(type)) {
                        const next = prev.filter((t) => t !== type);
                        return next.length === 0 ? [] : next;
                      }
                      return [...prev, type];
                    })
                  }
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    active
                      ? "bg-yellow-400 text-gray-900"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
          {activityGrowth.length === 0 || activityTypes.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Belum ada aktivitas</div>
          ) : (
            <div className="w-full" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityGrowth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: string) => fmtDateShort(v)} interval={chartDays <= 14 ? 0 : chartDays <= 30 ? 4 : 13} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip content={<CumulativeTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
                  {(typeFilter.length === 0 ? activityTypes : activityTypes.filter((t) => typeFilter.includes(t))).map((type, idx) => (
                    <Line
                      key={type}
                      type="monotone"
                      dataKey={type}
                      stroke={getTypeColor(type, idx)}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">Nilai = total kumulatif aktivitas dari awal hingga tanggal tersebut.</p>
        </div>

        {/* ── Funnel Distribution ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-purple-500" />
            <h2 className="font-semibold text-gray-900">Distribusi Funnel</h2>
            <span className="text-xs text-gray-400 ml-auto">{summary.totalProspects} total prospek</span>
          </div>
          <div className="space-y-2.5">
            {funnelConversion.filter((f) => f.count > 0).map((f) => (
              <div key={f.stage}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600 truncate max-w-[200px]">{f.stage}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">{(f.pctOfTotal * 100).toFixed(0)}%</span>
                    <span className="text-sm font-bold text-gray-900 w-6 text-right">{f.count}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all" style={{ width: `${Math.max(f.pctOfTotal * 100, 2)}%` }} />
                </div>
              </div>
            ))}
            {funnelConversion.every((f) => f.count === 0) && <p className="text-gray-400 text-sm text-center py-6">Belum ada prospek</p>}
          </div>
        </div>

        {/* ── Tabs: Pipeline / Timeline / MOM ────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {([
              { key: "pipeline", label: "Pipeline Aktif", icon: Target, count: summary.activePipelineCount },
              { key: "timeline", label: "Timeline 30 Hari", icon: Clock, count: timeline.length },
              { key: "mom", label: "MOM", icon: FileText, count: moms.length },
            ] as const).map(({ key, label, icon: Icon, count }) => (
              <button key={key} onClick={() => setActiveTab(key)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3.5 text-sm font-medium transition-colors border-b-2 ${activeTab === key ? "border-yellow-400 text-gray-900 bg-yellow-50/50" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
                {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === key ? "bg-yellow-400 text-gray-900" : "bg-gray-100 text-gray-500"}`}>{count}</span>}
              </button>
            ))}
          </div>

          {/* Tab: Pipeline Aktif */}
          {activeTab === "pipeline" && (
            <div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-gray-500 font-semibold">Nama Prospek</th>
                      <th className="text-left px-3 py-3"><SortBtn col="stage" label="Stage" /></th>
                      <th className="text-center px-3 py-3"><SortBtn col="sla" label="SLA" /></th>
                      <th className="text-center px-3 py-3"><SortBtn col="hari" label="Hari" /></th>
                      <th className="text-right px-3 py-3"><SortBtn col="umkm" label="Est. UMKM" /></th>
                      <th className="text-right px-4 py-3 text-gray-500 font-semibold">Prob.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPipeline.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-gray-400 py-10">Tidak ada pipeline aktif</td></tr>
                    ) : sortedPipeline.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedProspect(p)}
                        className="border-b border-gray-50 hover:bg-yellow-50/40 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 hover:text-blue-600">{p.namaProspek}</div>
                          {p.channel && <div className="text-xs text-gray-400">{p.channel}</div>}
                        </td>
                        <td className="px-3 py-3"><span className="text-xs text-gray-600">{p.stage}</span></td>
                        <td className="px-3 py-3 text-center"><SLABadge status={p.statusSLA} /></td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-bold ${p.statusSLA === "Overdue" ? "text-red-600" : p.statusSLA === "At Risk" ? "text-yellow-600" : "text-gray-700"}`}>{p.hariDiStage}h</span>
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-gray-700 font-medium">{p.estUmkmReach ? fmtNum(p.estUmkmReach) : "—"}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">{p.probability ? `${(p.probability * 100).toFixed(0)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-50">
                {sortedPipeline.length === 0 ? (
                  <p className="text-center text-gray-400 py-10 text-sm">Tidak ada pipeline aktif</p>
                ) : sortedPipeline.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProspect(p)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-yellow-50/40 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{p.namaProspek}</div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">{p.stage}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <SLABadge status={p.statusSLA} />
                      <span className="text-xs text-gray-400">{p.hariDiStage}h · {p.estUmkmReach ? fmtNum(p.estUmkmReach) + " UMKM" : "—"}</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
              {sortedPipeline.length > 0 && (
                <p className="text-xs text-gray-400 px-4 py-2.5 border-t border-gray-50">Klik nama untuk lihat detail aktivitas + ringkasan AI</p>
              )}
            </div>
          )}

          {/* Tab: Timeline */}
          {activeTab === "timeline" && (
            <div className="p-4 md:p-5">
              {timeline.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">Belum ada aktivitas dalam 30 hari terakhir</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
                  <div className="space-y-3">
                    {timeline.filter((item) => {
                      if (typeFilter.length === 0) return true;
                      if (item.type !== "activity") return true;
                      return typeFilter.includes(item.label);
                    }).map((item, idx) => (
                      <div key={`${item.type}-${item.linkId}-${idx}`} className="flex gap-3">
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.type === "activity" ? "bg-blue-50" : item.type === "stage_change" ? "bg-purple-50" : "bg-green-50"}`}>
                          <TimelineIcon type={item.type} />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-gray-900">{item.label}</span>
                              {item.prospectName && (
                                <span className="text-xs text-gray-400 ml-1.5">
                                  · {item.prospectId ? (
                                    <button
                                      onClick={() => { const pi = activePipeline.find((x) => x.id === item.prospectId); if (pi) setSelectedProspect(pi); }}
                                      className="hover:text-blue-500 hover:underline"
                                    >
                                      {item.prospectName}
                                    </button>
                                  ) : item.prospectName}
                                </span>
                              )}
                              {item.detail && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.detail}</p>}
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-1.5">
                              <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDateShort(item.date)}</span>
                              {item.type === "mom" && item.linkId && (
                                <Link href={`/mom/${item.linkId}`} className="text-xs text-blue-500 hover:underline whitespace-nowrap">Buka →</Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: MOM */}
          {activeTab === "mom" && (
            <div className="divide-y divide-gray-50">
              {moms.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">Belum ada MOM dibuat</p>
              ) : moms.map((m) => (
                <Link key={m.id} href={`/mom/${m.id}`} className="flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText size={14} className="text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">{m.title}</div>
                    {m.prospectName && <div className="text-xs text-blue-600 mt-0.5">{m.prospectName}</div>}
                    {m.agenda && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{m.agenda}</div>}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400">
                    <Calendar size={11} />{fmtDate(m.tanggal)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Mobile: quick link to pipeline */}
        <div className="sm:hidden">
          <Link href={`/pipeline?sales=${encodeURIComponent(salesInfo.name)}`} className="flex items-center justify-center gap-2 w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-xl transition-colors text-sm">
            <Target size={15} /> Lihat Semua Pipeline {salesInfo.name}
          </Link>
        </div>

      </div>
    </>
  );
}
