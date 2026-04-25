"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileText, Calendar, User, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface MOM {
  id: string;
  title: string;
  tanggal: string;
  participants: string;
  actionItems: string;
  decisions: string;
  sales: { name: string };
  prospect?: { namaProspek: string };
}

export default function MOMPage() {
  const { user } = useAuth();
  const [moms, setMoms] = useState<MOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMoms = () => {
    fetch("/api/mom").then((r) => r.json()).then(setMoms).finally(() => setLoading(false));
  };

  useEffect(() => { fetchMoms(); }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Yakin hapus MOM ini? Tindakan ini tidak bisa dibatalkan.")) return;
    setDeletingId(id);
    await fetch(`/api/mom/${id}`, { method: "DELETE" });
    setDeletingId(null);
    fetchMoms();
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Minutes of Meeting</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">{moms.length} MOM tersimpan</p>
        </div>
        <Link
          href="/mom/new"
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-sm"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Buat MOM</span>
          <span className="sm:hidden">Buat</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" /></div>
      ) : moms.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada MOM</p>
          <p className="text-sm mt-1">Klik Buat MOM untuk menambahkan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moms.map((m) => (
            <div key={m.id} className="relative group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <Link href={`/mom/${m.id}`} className="block p-5">
                <div className="flex items-start justify-between mb-3">
                  <FileText size={18} className="text-yellow-500 mt-0.5" />
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(m.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 pr-6">{m.title}</h3>
                {m.prospect && (
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mb-2">
                    {m.prospect.namaProspek}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  <User size={10} />
                  <span>{m.sales.name}</span>
                  {m.participants && <><span>·</span><span>{m.participants.split(",").length} peserta</span></>}
                </div>
                {m.actionItems && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <div className="text-xs text-gray-400 mb-1">Action Items</div>
                    <div className="text-xs text-gray-600 line-clamp-2">{m.actionItems}</div>
                  </div>
                )}
              </Link>
              {user?.role === "admin" && (
                <button
                  onClick={(e) => handleDelete(e, m.id)}
                  disabled={deletingId === m.id}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                  title="Hapus MOM"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
