import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const SUPABASE_URL = "https://itdgaxgfazeyvwsinuve.supabase.co";
const SUPABASE_KEY = "sb_publishable_oWPR5rKYg0i6cGsOt2hfrg_z1UW-Ck8";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const hash = (p) => bcrypt.hashSync(p, 10);

const STAGES = [
  { order: 1, name: "1. Lead/Prospek", slaMin: 1, slaTarget: 3, slaMax: 7 },
  { order: 2, name: "2. Outreach (Email/WA)", slaMin: 1, slaTarget: 3, slaMax: 5 },
  { order: 3, name: "3. Follow Up / Kit", slaMin: 2, slaTarget: 5, slaMax: 10 },
  { order: 4, name: "4. Meeting Discovery", slaMin: 3, slaTarget: 7, slaMax: 14 },
  { order: 5, name: "5. Demo/Presentasi", slaMin: 3, slaTarget: 7, slaMax: 14 },
  { order: 6, name: "6. Proposal Formal", slaMin: 5, slaTarget: 10, slaMax: 21 },
  { order: 7, name: "7. Negosiasi", slaMin: 5, slaTarget: 14, slaMax: 30 },
  { order: 8, name: "8. Closed Won", slaMin: 0, slaTarget: 0, slaMax: 0 },
  { order: 9, name: "9. Closed Lost", slaMin: 0, slaTarget: 0, slaMax: 0 },
];

const CONFIG = [
  { key: "target_northstar_nasional", value: "100000", label: "Target Northstar Nasional (UMKM)", category: "target" },
  { key: "target_per_sales_bulan", value: "2000", label: "Target per Sales per Bulan", category: "target" },
  { key: "sla_warning_pct", value: "0.75", label: "SLA Warning Threshold (%)", category: "sla" },
  { key: "sla_breach_pct", value: "1.0", label: "SLA Breach Threshold (%)", category: "sla" },
  { key: "app_name", value: "MWX SLA Dashboard", label: "Nama Aplikasi", category: "general" },
  { key: "app_version", value: "1.0.0", label: "Versi Aplikasi", category: "general" },
];

const SALES_USERS = [
  { name: "Dimas", email: "dimas@mwx.id" },
  { name: "Riqsa", email: "riqsa@mwx.id" },
  { name: "Kreshna", email: "kreshna@mwx.id" },
  { name: "Regita", email: "regita@mwx.id" },
  { name: "Nova", email: "nova@mwx.id" },
  { name: "Riany", email: "riany@mwx.id" },
  { name: "Tessa", email: "tessa@mwx.id" },
  { name: "Afif", email: "afif@mwx.id" },
];

const PIPELINE_DATA = [
  { sales: "Dimas", namaProspek: "SMESCO", channel: "Partnership", produkFokus: "CreateWhiz, IMPACT+", kontakPIC: "Tim Bu Astika", stage: "7. Negosiasi", estUmkmReach: 500, estNilaiDeal: 150000000, probability: 0.65, tglMasuk: "2026-04-01" },
  { sales: "Riqsa", namaProspek: "INDOWIRA", channel: "Cold Outreach", produkFokus: "SmartWhiz, SMEwhiz, Reportwhiz", kontakPIC: "Pak Hery (Pengurus Pusat)", stage: "3. Follow Up / Kit", estUmkmReach: 600, estNilaiDeal: 80000000, probability: 0.3, tglMasuk: "2026-04-10" },
  { sales: "Regita", namaProspek: "InJourney", channel: "Referral", produkFokus: "CreateWhiz, SmartWhiz", kontakPIC: "", stage: "6. Proposal Formal", estUmkmReach: 30, estNilaiDeal: 120000000, probability: 0.5, tglMasuk: "2026-04-14" },
  { sales: "Nova", namaProspek: "Kementerian UMKM", channel: "Government", produkFokus: "IMPACT+", kontakPIC: "Tim Kementerian UMKM", stage: "4. Meeting Discovery", estUmkmReach: 2000, estNilaiDeal: 500000000, probability: 0.4, tglMasuk: "2026-04-01" },
  { sales: "Dimas", namaProspek: "Pemda Lahat", channel: "Government", produkFokus: "IMPACT+", kontakPIC: "Mas Syauqi (Pemda Lahat)", stage: "1. Lead/Prospek", estUmkmReach: 300, estNilaiDeal: 100000000, probability: 0.2, tglMasuk: "2026-04-17" },
  { sales: "Regita", namaProspek: "Telkomsel", channel: "Corporate", produkFokus: "MWX Platform", kontakPIC: "Bang Fadli; Pak Jemi Mulia (GM)", stage: "3. Follow Up / Kit", estUmkmReach: 5000, estNilaiDeal: 1000000000, probability: 0.35, tglMasuk: "2026-04-17" },
  { sales: "Regita", namaProspek: "SNBC / Daya", channel: "Corporate", produkFokus: "MWX Platform", kontakPIC: "", stage: "2. Outreach (Email/WA)", estUmkmReach: 200, estNilaiDeal: 50000000, probability: 0.2, tglMasuk: "2026-04-17" },
  { sales: "Nova", namaProspek: "Kementerian Kebudayaan RI", channel: "Government", produkFokus: "FinanceWhiz, CreateWhiz, ReportWhiz", kontakPIC: "Wamen Giring Ganesha", stage: "3. Follow Up / Kit", estUmkmReach: 1000, estNilaiDeal: 300000000, probability: 0.3, tglMasuk: "2026-04-20" },
  { sales: "Dimas", namaProspek: "KataData Foundation", channel: "Foundation/Grant", produkFokus: "IMPACT+", kontakPIC: "Mira Hanim (Project Manager)", stage: "6. Proposal Formal", estUmkmReach: 500, estNilaiDeal: 200000000, probability: 0.55, tglMasuk: "2026-04-20" },
  { sales: "Dimas", namaProspek: "KADIN DKI Jakarta", channel: "Asosiasi", produkFokus: "IMPACT+, MWX Academy", kontakPIC: "Mahir (WKU Koordinator II)", stage: "6. Proposal Formal", estUmkmReach: 1000, estNilaiDeal: 250000000, probability: 0.6, tglMasuk: "2026-04-20" },
  { sales: "Riany", namaProspek: "Victoria Care Indonesia", channel: "Corporate/CSR", produkFokus: "IMPACT+", kontakPIC: "Ibu Winny (VP Corcom)", stage: "2. Outreach (Email/WA)", estUmkmReach: 100, estNilaiDeal: 50000000, probability: 0.15, tglMasuk: "2026-04-20" },
  { sales: "Dimas", namaProspek: "Istiqlal × Voyage", channel: "Partnership", produkFokus: "Whitelabel MWX Academy", kontakPIC: "Mas Pungkas (Dewan Pengurus Istiqlal)", stage: "7. Negosiasi", estUmkmReach: 500, estNilaiDeal: 180000000, probability: 0.65, tglMasuk: "2026-04-20" },
  { sales: "Riany", namaProspek: "Djarum × Blibli", channel: "Corporate/CSR", produkFokus: "IMPACT+", kontakPIC: "Mas Tri (Corcom Djarum)", stage: "1. Lead/Prospek", estUmkmReach: 500, estNilaiDeal: 300000000, probability: 0.25, tglMasuk: "2026-04-20" },
  { sales: "Dimas", namaProspek: "Yayasan Astra YDBA", channel: "Foundation/CSR", produkFokus: "IMPACT+", kontakPIC: "Pak Edison (Program Dept Head)", stage: "2. Outreach (Email/WA)", estUmkmReach: 1300, estNilaiDeal: 200000000, probability: 0.25, tglMasuk: "2026-04-20" },
  { sales: "Riany", namaProspek: "CEDEA", channel: "Community", produkFokus: "IMPACT+, Workshop", kontakPIC: "Tim CEDEA", stage: "3. Follow Up / Kit", estUmkmReach: 250, estNilaiDeal: 150000000, probability: 0.45, tglMasuk: "2026-04-22" },
  { sales: "Dimas", namaProspek: "Elnusa & Gekrafs DKI Jakarta", channel: "Corporate/Asosiasi", produkFokus: "IMPACT+", kontakPIC: "Farazandy (Komisaris Elnusa / Ketua Gekrafs DKI)", stage: "2. Outreach (Email/WA)", estUmkmReach: 31000, estNilaiDeal: 500000000, probability: 0.25, tglMasuk: "2026-04-22" },
  { sales: "Regita", namaProspek: "BSI (Bank Syariah Indonesia)", channel: "Banking", produkFokus: "IMPACT+, Webinar", kontakPIC: "Pak Nana; Pak Hadrian", stage: "2. Outreach (Email/WA)", estUmkmReach: 5000, estNilaiDeal: 150000000, probability: 0.3, tglMasuk: "2026-04-22" },
  { sales: "Afif", namaProspek: "11thSpace (Event XLR8)", channel: "Event", produkFokus: "FinanceWhiz", kontakPIC: "Tim 11thSpace", stage: "3. Follow Up / Kit", estUmkmReach: 8, estNilaiDeal: 5000000, probability: 0.7, tglMasuk: "2026-04-23" },
  { sales: "Riany", namaProspek: "Paxel", channel: "Corporate/CSR", produkFokus: "CreateWhiz, FinanceWhiz", kontakPIC: "Eldi; Mayang; Kiki (Paxel)", stage: "3. Follow Up / Kit", estUmkmReach: 30, estNilaiDeal: 50000000, probability: 0.5, tglMasuk: "2026-04-23" },
  { sales: "Dimas", namaProspek: "Staff Khusus Presiden (SKP)", channel: "Government", produkFokus: "IMPACT+", kontakPIC: "Dimas Wisnu Banass", stage: "3. Follow Up / Kit", estUmkmReach: 1000, estNilaiDeal: 500000000, probability: 0.35, tglMasuk: "2026-04-23" },
  { sales: "Riqsa", namaProspek: "APEKSI × Bank BTN", channel: "Government/Banking", produkFokus: "IMPACT+, Pelatihan", kontakPIC: "Devy Munir (APEKSI); Dodi (EO BTN)", stage: "3. Follow Up / Kit", estUmkmReach: 5000, estNilaiDeal: 400000000, probability: 0.35, tglMasuk: "2026-04-15" },
  { sales: "Tessa", namaProspek: "Komunitas Karya Kami", channel: "Community", produkFokus: "IMPACT+", kontakPIC: "Pak Ari", stage: "2. Outreach (Email/WA)", estUmkmReach: 1000, estNilaiDeal: 80000000, probability: 0.25, tglMasuk: "2026-04-17" },
  { sales: "Regita", namaProspek: "Kementerian UMKM (Meeting 2)", channel: "Government", produkFokus: "IMPACT+, Database", kontakPIC: "Nova Zabrina (MediaWave)", stage: "4. Meeting Discovery", estUmkmReach: 5000, estNilaiDeal: 500000000, probability: 0.4, tglMasuk: "2026-04-22" },
  { sales: "Kreshna", namaProspek: "SMESCO (Kreshna)", channel: "Partnership", produkFokus: "Whitelabel, Webinar Series", kontakPIC: "Pak Ade (SMESCO)", stage: "7. Negosiasi", estUmkmReach: 28, estNilaiDeal: 80000000, probability: 0.75, tglMasuk: "2026-04-01" },
];

const ACTIVITY_DATA = [
  { sales: "Dimas", prospect: "SMESCO", tanggal: "2026-04-07", tipeAktivitas: "Meeting Offline", pic: "Tim Bu Astika", topikHasil: "Persiapan teknis Workshop Bandung 15-16 Apr — lobi Walikota, setup peserta, materi, doorprize, logistik", nextStage: "5. Demo/Presentasi", catatan: "Deadline TOR/undangan ke Walikota 9 Apr. Form peserta dari SMESCO H-2 (13 Apr).", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-318/2kzmurw1-338" },
  { sales: "Riqsa", prospect: "INDOWIRA", tanggal: "2026-04-10", tipeAktivitas: "Meeting Offline", pic: "Pak Hery (Pengurus Pusat)", topikHasil: "Introduction MWX ke INDOWIRA — ±600 anggota wirausaha aktif, familiar AI, punya program Sekolah Wirausaha", nextStage: "3. Follow Up / Kit", catatan: "Disepakati jadwalkan demo offline.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-378/2kzmurw1-398" },
  { sales: "Kreshna", prospect: "SMESCO (Kreshna)", tanggal: "2026-04-14", tipeAktivitas: "Meeting Offline", pic: "Pak Ade (SMESCO)", topikHasil: "Evaluasi konversi user, teknis whitelabel SMESCO, perencanaan Webinar Series 2 mingguan", nextStage: "7. Negosiasi", catatan: "28 user bayar, ~10 aktif.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1078/2kzmurw1-958" },
  { sales: "Dimas", prospect: "SMESCO", tanggal: "2026-04-15", tipeAktivitas: "Demo", pic: "Peserta Workshop Bandung", topikHasil: "Workshop offline MWX × SMESCO — edukasi AI + onboarding CreateWhiz ke peserta UMKM Bandung", nextStage: "5. Demo/Presentasi", catatan: "Slot MWX 90 menit. Hari ke-1 dari 2 hari workshop.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-318/2kzmurw1-338" },
  { sales: "Riqsa", prospect: "APEKSI × Bank BTN", tanggal: "2026-04-15", tipeAktivitas: "Meeting Offline", pic: "Devy Munir (APEKSI); Dodi (EO BTN)", topikHasil: "Kolaborasi pelatihan UMKM go digital via CSR Bank BTN — 98 kota anggota APEKSI", nextStage: "3. Follow Up / Kit", catatan: "MWX sebagai penyedia AI + trainer.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1218/2kzmurw1-998" },
  { sales: "Regita", prospect: "InJourney", tanggal: "2026-04-16", tipeAktivitas: "Meeting Offline", pic: "", topikHasil: "Meeting lanjutan — pembahasan program CSR 30 UMKM binaan, 2 skema penawaran sudah dikirim", nextStage: "6. Proposal Formal", catatan: "Fokus ke CreateWhiz/SmartWhiz.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1618/2kzmurw1-1178" },
  { sales: "Nova", prospect: "Kementerian UMKM", tanggal: "2026-04-16", tipeAktivitas: "Meeting Offline", pic: "Tim Kementerian UMKM", topikHasil: "Evaluasi rangkaian event onboarding UMKM + roadmap event MWX × Kementerian 2026", nextStage: "4. Meeting Discovery", catatan: "Event Wonosobo 23-26 Apr & Surakarta minggu ke-4", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1198/2kzmurw1-978" },
  { sales: "Dimas", prospect: "Pemda Lahat", tanggal: "2026-04-17", tipeAktivitas: "Meeting Offline", pic: "Mas Syauqi (Pemda Lahat)", topikHasil: "Inisiasi kolaborasi MWX × Pemda Lahat — rencana kunjungan, launching yayasan", nextStage: "1. Lead/Prospek", catatan: "Masih outline awal.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1598/2kzmurw1-1158" },
  { sales: "Regita", prospect: "Telkomsel", tanggal: "2026-04-17", tipeAktivitas: "Meeting Offline", pic: "Bang Fadli; Pak Jemi Mulia (GM)", topikHasil: "Eksplorasi partnership produk UMKM Telkomsel — 2 jalur paralel + ekspansi ke Stackez", nextStage: "3. Follow Up / Kit", catatan: "Jalur: bottom-up & top-down. Notes dikirim via WA 21 Apr", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1578/2kzmurw1-1138" },
  { sales: "Regita", prospect: "SNBC / Daya", tanggal: "2026-04-17", tipeAktivitas: "Meeting Offline", pic: "", topikHasil: "Introduction meeting antara MWX dan SNBC (Daya) — penjajakan awal potensi kolaborasi", nextStage: "2. Outreach (Email/WA)", catatan: "Notes sangat minimal.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1638/2kzmurw1-1198" },
  { sales: "Nova", prospect: "Kementerian Kebudayaan RI", tanggal: "2026-04-20", tipeAktivitas: "Demo", pic: "Wamen Giring Ganesha", topikHasil: "Presentasi FinanceWhiz, CreateWhiz, ReportWhiz ke Wamen", nextStage: "3. Follow Up / Kit", catatan: "MWX akan di-matching ke badan/lembaga relevan Kemendikbud.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1538/2kzmurw1-1118" },
  { sales: "Dimas", prospect: "KataData Foundation", tanggal: "2026-04-20", tipeAktivitas: "Meeting Offline", pic: "Mira Hanim (Project Manager)", topikHasil: "Eksplorasi IMPACT+ via Grant Fund — program naik kelas UMKM binaan", nextStage: "6. Proposal Formal", catatan: "Narasi harus impact-driven bukan komersial. Prob: 55%", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1458/2kzmurw1-1038" },
  { sales: "Dimas", prospect: "KADIN DKI Jakarta", tanggal: "2026-04-20", tipeAktivitas: "Meeting Offline", pic: "Mahir (WKU Koordinator II)", topikHasil: "Kolaborasi IMPACT+ & whitelabel MWX Academy berbranding KADIN", nextStage: "6. Proposal Formal", catatan: "Replikable ke KADIN daerah. Prob: 60%", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1438/2kzmurw1-1018" },
  { sales: "Riany", prospect: "Victoria Care Indonesia", tanggal: "2026-04-20", tipeAktivitas: "Meeting Offline", pic: "Ibu Winny (VP Corcom)", topikHasil: "Eksplorasi kolaborasi program pemberdayaan UMKM AI", nextStage: "2. Outreach (Email/WA)", catatan: "STALLED. Keep warm. Prob: 15%", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1518/2kzmurw1-1098" },
  { sales: "Dimas", prospect: "Istiqlal × Voyage", tanggal: "2026-04-20", tipeAktivitas: "Meeting Offline", pic: "Mas Pungkas (Dewan Pengurus Istiqlal)", topikHasil: "Kolaborasi whitelabel program UMKM AI — Istiqlal komunitas + MWX teknologi", nextStage: "7. Negosiasi", catatan: "Meeting BoD dijadwalkan 22 Apr. Prob: 65%", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1478/2kzmurw1-1058" },
  { sales: "Riany", prospect: "Djarum × Blibli", tanggal: "2026-04-20", tipeAktivitas: "Meeting Offline", pic: "Mas Tri (Corcom Djarum)", topikHasil: "Eksplorasi kolaborasi UMKM AI via DRP dan Blibli", nextStage: "1. Lead/Prospek", catatan: "Harus kirim proposal formal dulu. Prob: 25%", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1498/2kzmurw1-1078" },
  { sales: "Dimas", prospect: "Yayasan Astra YDBA", tanggal: "2026-04-20", tipeAktivitas: "Meeting Offline", pic: "Pak Edison; Ibu Ema; Pak Agung", topikHasil: "Introduction — sosialisasi IMPACT+ ke ±1.300 UMKM binaan YDBA", nextStage: "2. Outreach (Email/WA)", catatan: "Tidak ada CSR funding. Posisi YDBA: distribution partner.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1758/2kzmurw1-1218" },
  { sales: "Riany", prospect: "CEDEA", tanggal: "2026-04-22", tipeAktivitas: "Meeting Offline", pic: "Tim CEDEA", topikHasil: "Eksplorasi komunitas UMKM 200-300 orang via workshop offline", nextStage: "3. Follow Up / Kit", catatan: "3 tier budget: Rp100jt/150jt/200jt.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1838/2kzmurw1-1298" },
  { sales: "Dimas", prospect: "Elnusa & Gekrafs DKI Jakarta", tanggal: "2026-04-22", tipeAktivitas: "Meeting Offline", pic: "Farazandy (Komisaris Elnusa / Ketua Gekrafs DKI)", topikHasil: "Eksplorasi IMPACT+ via Gekrafs DKI sebagai channel edukasi AI", nextStage: "2. Outreach (Email/WA)", catatan: "Gekrafs = entry point tercepat.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1798/2kzmurw1-1258" },
  { sales: "Regita", prospect: "Kementerian UMKM (Meeting 2)", tanggal: "2026-04-22", tipeAktivitas: "Meeting Offline", pic: "Nova Zabrina (MediaWave); 4 perwakilan Kemenkop", topikHasil: "Meeting lanjutan — skema integrasi database MWX × Kemenkop", nextStage: "4. Meeting Discovery", catatan: "Joined database MWX+Kemenkop.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1778/2kzmurw1-1238" },
  { sales: "Dimas", prospect: "Istiqlal × Voyage", tanggal: "2026-04-22", tipeAktivitas: "Meeting Offline", pic: "Board of Directors Istiqlal", topikHasil: "Meeting lanjutan BoD Istiqlal — pembahasan teknis whitelabel", nextStage: "7. Negosiasi", catatan: "Mockup landing page perlu siap.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1478/2kzmurw1-1058" },
  { sales: "Tessa", prospect: "Komunitas Karya Kami", tanggal: "2026-04-17", tipeAktivitas: "Meeting Online", pic: "Pak Ari", topikHasil: "Introduction MWX ke Komunitas Karya Kami — ±1.000 anggota aktif Indonesia", nextStage: "2. Outreach (Email/WA)", catatan: "Next: jadwalkan pertemuan offline di Jakarta", linkMOM: "" },
  { sales: "Regita", prospect: "BSI (Bank Syariah Indonesia)", tanggal: "2026-04-22", tipeAktivitas: "Meeting Offline", pic: "Pak Nana; Pak Hadrian; Pak Bana; Bu Wien", topikHasil: "Penjajakan kolaborasi program UMKM — BSI punya 5.000 UMKM binaan", nextStage: "2. Outreach (Email/WA)", catatan: "FU untuk webinar dengan UMKM Center BSI.", linkMOM: "" },
  { sales: "Afif", prospect: "11thSpace (Event XLR8)", tanggal: "2026-04-23", tipeAktivitas: "Meeting Online", pic: "Tim 11thSpace", topikHasil: "MWX masuk batch 7 XLR8 tanggal 03/06/2026 — event offline di Kedoya", nextStage: "3. Follow Up / Kit", catatan: "Siapkan assets FAQ dan email free trial H-1 acara", linkMOM: "" },
  { sales: "Riany", prospect: "Paxel", tanggal: "2026-04-23", tipeAktivitas: "Meeting Offline", pic: "Eldi; Mayang; Kiki (Paxel)", topikHasil: "Kolaborasi program pemberdayaan UMKM berbasis AI — reward 20-30 UMKM top users", nextStage: "3. Follow Up / Kit", catatan: "Budget maks Rp50jt.", linkMOM: "" },
  { sales: "Dimas", prospect: "Staff Khusus Presiden (SKP)", tanggal: "2026-04-23", tipeAktivitas: "Meeting Online", pic: "Dimas Wisnu Banass (Staf SKP)", topikHasil: "Follow-up pendalaman kolaborasi IMPACT+ — fokus wilayah Jawa Barat, target ±1.000 UMKM", nextStage: "3. Follow Up / Kit", catatan: "Butuh whitepaper data & pemetaan partner pembiayaan lokal di Jabar", linkMOM: "" },
];

async function upsertUser(data) {
  const { data: existing } = await supabase.from("User").select("id").eq("email", data.email).single();
  if (existing) return existing;
  const { data: created, error } = await supabase.from("User").insert(data).select("id").single();
  if (error) throw new Error(`User insert error: ${error.message}`);
  return created;
}

async function main() {
  console.log("Seeding Supabase via JS client...\n");

  // Funnel stages
  for (const s of STAGES) {
    const { error } = await supabase.from("FunnelStage").upsert(s, { onConflict: "name" });
    if (error) console.error("Stage error:", error.message);
  }
  console.log("✓ Funnel stages");

  // Config
  for (const c of CONFIG) {
    const { error } = await supabase.from("Config").upsert(c, { onConflict: "key" });
    if (error) console.error("Config error:", error.message);
  }
  console.log("✓ Config");

  // Admin user
  const admin = await upsertUser({ name: "Admin MWX", email: "admin@mwx.id", passwordHash: hash("admin123"), role: "admin" });
  console.log("✓ Admin:", admin.id);

  // Sales users
  const userMap = {};
  for (const u of SALES_USERS) {
    const user = await upsertUser({ name: u.name, email: u.email, passwordHash: hash("sales123"), role: "sales" });
    userMap[u.name] = user.id;
    console.log("✓ User:", u.email);
  }

  // Prospects
  const prospectMap = {};
  for (const p of PIPELINE_DATA) {
    const salesId = userMap[p.sales];
    if (!salesId) { console.warn("No user for:", p.sales); continue; }
    const weighted = (p.estUmkmReach || 0) * (p.probability || 0);
    const { data, error } = await supabase.from("Prospect").insert({
      salesId, namaProspek: p.namaProspek, channel: p.channel,
      produkFokus: p.produkFokus, kontakPIC: p.kontakPIC, stage: p.stage,
      tglMasuk: p.tglMasuk, tglUpdateStage: p.tglMasuk,
      estUmkmReach: p.estUmkmReach, estNilaiDeal: p.estNilaiDeal,
      probability: p.probability, weightedUmkm: weighted, statusSLA: "On Track",
    }).select("id").single();
    if (error) { console.error("Prospect error:", p.namaProspek, error.message); continue; }
    prospectMap[p.namaProspek] = data.id;
    console.log("✓ Prospect:", p.namaProspek);
  }

  // Activities
  for (const a of ACTIVITY_DATA) {
    const salesId = userMap[a.sales];
    if (!salesId) { console.warn("No user for:", a.sales); continue; }
    const { error } = await supabase.from("Activity").insert({
      salesId, prospectId: prospectMap[a.prospect] || null,
      tanggal: a.tanggal, tipeAktivitas: a.tipeAktivitas,
      namaProspek: a.prospect, pic: a.pic, topikHasil: a.topikHasil,
      nextStage: a.nextStage, catatan: a.catatan, linkMOM: a.linkMOM,
    });
    if (error) console.error("Activity error:", a.prospect, error.message);
    else console.log("✓ Activity:", a.prospect, a.tanggal);
  }

  console.log("\nDone!");
}

main().catch((e) => { console.error(e); process.exit(1); });
