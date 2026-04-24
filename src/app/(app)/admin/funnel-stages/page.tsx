"use client";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";

interface FunnelStage {
  id: string;
  order: number;
  name: string;
  description: string;
  slaMin: number;
  slaTarget: number;
  slaMax: number;
  convRateTarget: number;
}

export default function FunnelStagesPage() {
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/funnel-stages").then((r) => r.json()).then(setStages).finally(() => setLoading(false));
  }, []);

  const update = (id: string, key: string, value: string | number) => {
    setStages((s) => s.map((st) => st.id === id ? { ...st, [key]: value } : st));
  };

  const save = async (stage: FunnelStage) => {
    setSaving(stage.id);
    await fetch("/api/admin/funnel-stages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stage),
    });
    setSaving(null);
    setSaved(stage.id);
    setTimeout(() => setSaved(null), 2000);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Funnel Stages & SLA</h1>
        <p className="text-gray-500 text-sm mt-0.5">Konfigurasi SLA per stage pipeline</p>
      </div>

      <div className="space-y-4">
        {stages.map((stage) => (
          <div key={stage.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                {stage.description && <p className="text-xs text-gray-400 mt-0.5">{stage.description}</p>}
              </div>
              <button
                onClick={() => save(stage)}
                disabled={saving === stage.id}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg font-medium disabled:opacity-60"
              >
                <Save size={12} />
                {saving === stage.id ? "..." : saved === stage.id ? "Saved!" : "Simpan"}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">SLA Min (hari)</label>
                <input
                  type="number"
                  value={stage.slaMin}
                  onChange={(e) => update(stage.id, "slaMin", parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">SLA Target (hari)</label>
                <input
                  type="number"
                  value={stage.slaTarget}
                  onChange={(e) => update(stage.id, "slaTarget", parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">SLA Max (hari)</label>
                <input
                  type="number"
                  value={stage.slaMax}
                  onChange={(e) => update(stage.id, "slaMax", parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Conv. Rate Target</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={stage.convRateTarget}
                  onChange={(e) => update(stage.id, "convRateTarget", parseFloat(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
