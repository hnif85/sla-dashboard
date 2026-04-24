"use client";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";

interface Config {
  id: string;
  key: string;
  value: string;
  label: string;
  description: string;
  category: string;
}

export default function AdminConfigPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((data) => {
        setConfigs(data);
        setValues(Object.fromEntries(data.map((c: Config) => [c.key, c.value])));
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const updates = configs.map((c) => ({ key: c.key, value: values[c.key] || c.value }));
    await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const categories = [...new Set(configs.map((c) => c.category))];

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
    </div>
  );

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Konfigurasi Global</h1>
          <p className="text-gray-500 text-sm mt-0.5">Parameter utama sistem SLA Dashboard</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-4 py-2.5 rounded-xl text-sm disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>

      <div className="space-y-5">
        {categories.map((cat) => (
          <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
              {cat}
            </h2>
            <div className="space-y-4">
              {configs.filter((c) => c.category === cat).map((c) => (
                <div key={c.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{c.label}</label>
                  {c.description && (
                    <div className="text-xs text-gray-400 mb-1">{c.description}</div>
                  )}
                  <input
                    value={values[c.key] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [c.key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
