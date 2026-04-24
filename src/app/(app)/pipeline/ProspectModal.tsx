"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STAGES = [
  "1. Lead/Prospek", "2. Qualified", "3. Meeting/Demo",
  "4. Proposal", "5. Negosiasi", "6. Closing",
  "7. Closed Won", "8. Closed Lost",
];

const CHANNELS = ["Impact+", "Academy", "FinanceWhiz", "Marketplace", "Direct", "Referral", "Event", "Lainnya"];
const PRODUCTS = ["Multi-Product / Bundle", "Impact+", "Academy", "FinanceWhiz", "Marketplace Tools", "Lainnya"];

interface ProspectModalProps {
  onClose: () => void;
  onSaved: () => void;
  userRole: string;
  initialData?: Record<string, unknown>;
  prospectId?: string;
}

export default function ProspectModal({ onClose, onSaved, userRole, initialData, prospectId }: ProspectModalProps) {
  const [salesList, setSalesList] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({
    namaProspek: "",
    channel: "",
    produkFokus: "",
    kontakPIC: "",
    kontakInfo: "",
    stage: "1. Lead/Prospek",
    nextAction: "",
    estUmkmReach: "",
    estNilaiDeal: "",
    probability: "",
    reasonLost: "",
    linkDokumen: "",
    salesId: "",
    notes: "",
    ...initialData,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userRole === "admin") {
      fetch("/api/admin/users").then((r) => r.json()).then(setSalesList);
    }
  }, [userRole]);

  const handleChange = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const method = prospectId ? "PUT" : "POST";
    const url = prospectId ? `/api/pipeline/${prospectId}` : "/api/pipeline";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal menyimpan");
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-gray-900">{prospectId ? "Edit Prospek" : "Tambah Prospek Baru"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {userRole === "admin" && salesList.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sales PIC</label>
              <select
                value={form.salesId as string}
                onChange={(e) => handleChange("salesId", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="">Pilih Sales</option>
                {salesList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Prospek / Institusi *</label>
              <input
                required
                value={form.namaProspek as string}
                onChange={(e) => handleChange("namaProspek", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="PT. Contoh Tbk"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <select
                value={form.channel as string}
                onChange={(e) => handleChange("channel", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="">Pilih Channel</option>
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Produk Fokus</label>
              <select
                value={form.produkFokus as string}
                onChange={(e) => handleChange("produkFokus", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="">Pilih Produk</option>
                {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kontak PIC</label>
              <input
                value={form.kontakPIC as string}
                onChange={(e) => handleChange("kontakPIC", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Nama PIC"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WA / Email PIC</label>
              <input
                value={form.kontakInfo as string}
                onChange={(e) => handleChange("kontakInfo", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="08xx / email@..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage *</label>
              <select
                required
                value={form.stage as string}
                onChange={(e) => handleChange("stage", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. UMKM Reach</label>
              <input
                type="number"
                value={form.estUmkmReach as string}
                onChange={(e) => handleChange("estUmkmReach", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. Nilai Deal (Rp)</label>
              <input
                type="number"
                value={form.estNilaiDeal as string}
                onChange={(e) => handleChange("estNilaiDeal", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="875000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probability (0-1)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={form.probability as string}
                onChange={(e) => handleChange("probability", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="0.8"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link Dokumen</label>
              <input
                value={form.linkDokumen as string}
                onChange={(e) => handleChange("linkDokumen", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="https://..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Action</label>
              <input
                value={form.nextAction as string}
                onChange={(e) => handleChange("nextAction", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Follow up final pricing..."
              />
            </div>
            {(form.stage as string).includes("Lost") && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason Lost</label>
                <textarea
                  value={form.reasonLost as string}
                  onChange={(e) => handleChange("reasonLost", e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Alasan deal tidak berhasil..."
                />
              </div>
            )}
            {prospectId && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Perubahan</label>
                <input
                  value={form.notes as string}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Alasan update (opsional, untuk history)"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
