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
    { order: 1,  name: "1. Lead/Prospek",       description: "Prospek teridentifikasi dari riset & mapping. Decision maker sudah diketahui.", slaMin: 1,  slaTarget: 2,  slaMax: 3,  convRateTarget: 1.0  },
    { order: 2,  name: "2. Outreach (Email/WA)", description: "Email/WA pertama terkirim. Pitch singkat + link materi.", slaMin: 1, slaTarget: 3, slaMax: 5, convRateTarget: 0.6 },
    { order: 3,  name: "3. Follow Up / Kit",     description: "Kirim proposal kit, one-pager, video demo. Reply diterima.", slaMin: 3, slaTarget: 5, slaMax: 7, convRateTarget: 0.5 },
    { order: 4,  name: "4. Meeting Discovery",   description: "Meeting pertama dengan decision maker. Pahami kebutuhan.", slaMin: 5, slaTarget: 7, slaMax: 14, convRateTarget: 0.7 },
    { order: 5,  name: "5. Demo/Presentasi",     description: "Live demo produk Whiz ke stakeholder. Jawab objection teknis.", slaMin: 3, slaTarget: 7, slaMax: 10, convRateTarget: 0.65 },
    { order: 6,  name: "6. Proposal Formal",     description: "Proposal resmi (PDF 8-10 hal), TOR/RAB, template MoU dikirim.", slaMin: 5, slaTarget: 10, slaMax: 14, convRateTarget: 0.55 },
    { order: 7,  name: "7. Negosiasi",           description: "Diskusi harga, scope, timeline, pembayaran (APBD/CSR/direct).", slaMin: 5, slaTarget: 10, slaMax: 14, convRateTarget: 0.6 },
    { order: 8,  name: "8. Pilot (opsional)",    description: "Pilot 50 UMKM 2 minggu (Impact+ / Academy). Showcase hasil di dashboard.", slaMin: 10, slaTarget: 14, slaMax: 21, convRateTarget: 0.7 },
    { order: 9,  name: "9. Deal/Closed Won",     description: "MoU/kontrak ditandatangani. Tim onboarding take over.", slaMin: 7, slaTarget: 14, slaMax: 30, convRateTarget: 1.0 },
    { order: 10, name: "0. Closed Lost",         description: "Prospek batal. Wajib isi alasan di Pipeline kolom Reason Lost.", slaMin: 0, slaTarget: 0, slaMax: 0, convRateTarget: 0.0 },
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
