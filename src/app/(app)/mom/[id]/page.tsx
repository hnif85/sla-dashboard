"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Edit2, Trash2, Calendar, Users, CheckSquare, Zap } from "lucide-react";
import Link from "next/link";

interface MOMDetail {
  id: string;
  title: string;
  tanggal: string;
  participants: string;
  agenda: string;
  discussion: string;
  decisions: string;
  actionItems: string;
  nextMeeting: string | null;
  salesId: string;
  sales: { name: string };
  prospect?: { namaProspek: string };
}

function Section({ icon: Icon, title, content }: { icon: React.ElementType; title: string; content: string }) {
  if (!content) return null;
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-yellow-500" />
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</div>
    </div>
  );
}

export default function MOMDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [mom, setMom] = useState<MOMDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/mom/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setMom)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Yakin hapus MOM ini?")) return;
    await fetch(`/api/mom/${id}`, { method: "DELETE" });
    router.push("/mom");
  };

  const canEdit = user?.role === "admin" || mom?.salesId === user?.userId;

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
    </div>
  );

  if (!mom) return <div className="p-6 text-center text-gray-500">MOM tidak ditemukan</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/mom" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{mom.title}</h1>
            {mom.prospect && (
              <div className="text-xs text-blue-600 mt-0.5">{mom.prospect.namaProspek}</div>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link href={`/mom/${id}/edit`}
              className="flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700">
              <Edit2 size={14} /> Edit
            </Link>
            <button onClick={handleDelete}
              className="flex items-center gap-1.5 text-sm px-3 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50">
              <Trash2 size={14} /> Hapus
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div className="flex flex-wrap gap-4 pb-4 border-b border-gray-100 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-gray-400" />
            {new Date(mom.tanggal).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-gray-400" />
            {mom.participants || "Tidak ada peserta tercatat"}
          </div>
          <div className="text-gray-400">Dibuat oleh {mom.sales.name}</div>
        </div>

        {mom.agenda && <Section icon={Zap} title="Agenda" content={mom.agenda} />}
        {mom.discussion && <Section icon={Users} title="Diskusi & Pembahasan" content={mom.discussion} />}
        {mom.decisions && <Section icon={CheckSquare} title="Keputusan yang Disepakati" content={mom.decisions} />}
        {mom.actionItems && <Section icon={CheckSquare} title="Action Items" content={mom.actionItems} />}

        {mom.nextMeeting && (
          <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-4">
            <Calendar size={16} className="text-blue-500" />
            <div>
              <div className="text-xs text-blue-400 font-medium">NEXT MEETING</div>
              <div className="text-sm text-blue-700 font-semibold">
                {new Date(mom.nextMeeting).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
