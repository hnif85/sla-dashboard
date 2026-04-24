import prisma from "./db";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  const adminCount = await prisma.user.count();
  if (adminCount > 0) return;

  const adminHash = await hashPassword("admin123");
  const admin = await prisma.user.create({
    data: {
      name: "Administrator",
      email: "admin@mwx.id",
      passwordHash: adminHash,
      role: "admin",
      region: "All",
    },
  });

  const salesHash = await hashPassword("sales123");
  const sales1 = await prisma.user.create({
    data: {
      name: "Budi Santoso",
      email: "budi@mwx.id",
      passwordHash: salesHash,
      role: "sales",
      region: "Indonesia",
    },
  });

  await prisma.user.create({
    data: {
      name: "Erik Palupi",
      email: "erik@mwx.id",
      passwordHash: salesHash,
      role: "sales",
      region: "Indonesia",
    },
  });

  const stages = [
    { order: 1, name: "1. Lead/Prospek", description: "Prospek teridentifikasi dari riset & mapping", slaMin: 1, slaTarget: 2, slaMax: 3, convRateTarget: 1.0 },
    { order: 2, name: "2. Qualified", description: "Sudah dikonfirmasi ada kebutuhan & budget", slaMin: 2, slaTarget: 5, slaMax: 7, convRateTarget: 0.7 },
    { order: 3, name: "3. Meeting/Demo", description: "Meeting / demo produk dijadwalkan", slaMin: 3, slaTarget: 7, slaMax: 14, convRateTarget: 0.6 },
    { order: 4, name: "4. Proposal", description: "Proposal / penawaran dikirim", slaMin: 3, slaTarget: 7, slaMax: 14, convRateTarget: 0.5 },
    { order: 5, name: "5. Negosiasi", description: "Sedang negosiasi harga & terms", slaMin: 3, slaTarget: 7, slaMax: 14, convRateTarget: 0.6 },
    { order: 6, name: "6. Closing", description: "Kontrak / MoU dalam proses penandatanganan", slaMin: 1, slaTarget: 3, slaMax: 7, convRateTarget: 0.8 },
    { order: 7, name: "7. Closed Won", description: "Deal berhasil, UMKM onboard", slaMin: 0, slaTarget: 0, slaMax: 0, convRateTarget: 1.0 },
    { order: 8, name: "8. Closed Lost", description: "Deal gagal / tidak dilanjutkan", slaMin: 0, slaTarget: 0, slaMax: 0, convRateTarget: 0.0 },
  ];

  for (const stage of stages) {
    await prisma.funnelStage.upsert({
      where: { name: stage.name },
      update: {},
      create: stage,
    });
  }

  await prisma.config.createMany({
    data: [
      { key: "tahun_tracking", value: "2026", label: "Tahun Tracking", category: "utama" },
      { key: "target_northstar_nasional", value: "100000", label: "Target Northstar Nasional (UMKM)", category: "utama" },
      { key: "target_northstar_global", value: "1000000", label: "Target Northstar Global (UMKM)", category: "utama" },
      { key: "target_per_sales_bulan", value: "2000", label: "Target per Sales / Bulan (UMKM)", category: "utama" },
      { key: "bulan_laporan", value: "4", label: "Bulan Laporan (1-12)", category: "laporan" },
      { key: "tanggal_deadline_northstar", value: "2026-10-31", label: "Deadline Northstar", category: "utama" },
    ],
  });

  await prisma.prospect.create({
    data: {
      salesId: sales1.id,
      namaProspek: "PT Telkom Indonesia (CSR)",
      channel: "Impact+",
      produkFokus: "Multi-Product / Bundle",
      kontakPIC: "Ibu Ratna (VP CSR)",
      kontakInfo: "ratna@telkom.co.id",
      stage: "5. Negosiasi",
      tglMasuk: new Date("2026-03-09"),
      tglUpdateStage: new Date("2026-04-20"),
      nextAction: "Follow up final pricing",
      estUmkmReach: 500,
      estNilaiDeal: 875000000,
      probability: 0.8,
      weightedUmkm: 400,
      weightedNilai: 700000000,
      hariDiStage: 2,
      statusSLA: "On Track",
      linkDokumen: "MoU draft sent",
    },
  });

  console.log("✅ Database seeded: admin@mwx.id / admin123 | budi@mwx.id / sales123");
  void admin;
}
