import prisma from "./db";

type ProspectData = Record<string, unknown>;

const FIELD_LABELS: Record<string, string> = {
  salesId: "Sales PIC",
  namaProspek: "Nama Prospek",
  channel: "Channel",
  produkFokus: "Produk Fokus",
  kontakPIC: "Kontak PIC",
  kontakInfo: "Kontak Info",
  stage: "Stage",
  tglUpdateStage: "Tgl Update Stage",
  nextAction: "Next Action",
  estUmkmReach: "Est. UMKM Reach",
  estNilaiDeal: "Est. Nilai Deal",
  probability: "Probability",
  statusSLA: "Status SLA",
  reasonLost: "Reason Lost",
  linkDokumen: "Link Dokumen",
};

export async function logPipelineChange(
  prospectId: string,
  changedById: string,
  oldData: ProspectData,
  newData: ProspectData,
  notes?: string
) {
  const trackedFields = Object.keys(FIELD_LABELS);
  const changes: Array<{
    prospectId: string;
    changedById: string;
    fieldName: string;
    oldValue: string | null;
    newValue: string | null;
    notes: string | null;
  }> = [];

  for (const field of trackedFields) {
    const oldVal = oldData[field];
    const newVal = newData[field];
    if (String(oldVal ?? "") !== String(newVal ?? "")) {
      changes.push({
        prospectId,
        changedById,
        fieldName: FIELD_LABELS[field] || field,
        oldValue: oldVal != null ? String(oldVal) : null,
        newValue: newVal != null ? String(newVal) : null,
        notes: notes || null,
      });
    }
  }

  if (changes.length > 0) {
    await prisma.pipelineHistory.createMany({ data: changes });
  }
}
