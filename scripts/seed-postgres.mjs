import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
  { sales: "Dimas", namaProspek: "SMESCO", channel: "Partnership", produkFokus: "CreateWhiz, IMPACT+", kontakPIC: "Tim Bu Astika", stage: "7. Negosiasi", estUmkmReach: 500, estNilaiDeal: 150000000, probability: 0.65, tglMasuk: new Date("2026-04-01") },
  { sales: "Riqsa", namaProspek: "INDOWIRA", channel: "Cold Outreach", produkFokus: "SmartWhiz, SMEwhiz, Reportwhiz", kontakPIC: "Pak Hery (Pengurus Pusat)", stage: "3. Follow Up / Kit", estUmkmReach: 600, estNilaiDeal: 80000000, probability: 0.3, tglMasuk: new Date("2026-04-10") },
  { sales: "Regita", namaProspek: "InJourney", channel: "Referral", produkFokus: "CreateWhiz, SmartWhiz", kontakPIC: "", stage: "6. Proposal Formal", estUmkmReach: 30, estNilaiDeal: 120000000, probability: 0.5, tglMasuk: new Date("2026-04-14") },
  { sales: "Nova", namaProspek: "Kementerian UMKM", channel: "Government", produkFokus: "IMPACT+", kontakPIC: "Tim Kementerian UMKM", stage: "4. Meeting Discovery", estUmkmReach: 2000, estNilaiDeal: 500000000, probability: 0.4, tglMasuk: new Date("2026-04-01") },
  { sales: "Dimas", namaProspek: "Pemda Lahat", channel: "Government", produkFokus: "IMPACT+", kontakPIC: "Mas Syauqi (Pemda Lahat)", stage: "1. Lead/Prospek", estUmkmReach: 300, estNilaiDeal: 100000000, probability: 0.2, tglMasuk: new Date("2026-04-17") },
  { sales: "Regita", namaProspek: "Telkomsel", channel: "Corporate", produkFokus: "MWX Platform", kontakPIC: "Bang Fadli; Pak Jemi Mulia (GM)", stage: "3. Follow Up / Kit", estUmkmReach: 5000, estNilaiDeal: 1000000000, probability: 0.35, tglMasuk: new Date("2026-04-17") },
  { sales: "Regita", namaProspek: "SNBC / Daya", channel: "Corporate", produkFokus: "MWX Platform", kontakPIC: "", stage: "2. Outreach (Email/WA)", estUmkmReach: 200, estNilaiDeal: 50000000, probability: 0.2, tglMasuk: new Date("2026-04-17") },
  { sales: "Nova", namaProspek: "Kementerian Kebudayaan RI", channel: "Government", produkFokus: "FinanceWhiz, CreateWhiz, ReportWhiz", kontakPIC: "Wamen Giring Ganesha", stage: "3. Follow Up / Kit", estUmkmReach: 1000, estNilaiDeal: 300000000, probability: 0.3, tglMasuk: new Date("2026-04-20") },
  { sales: "Dimas", namaProspek: "KataData Foundation", channel: "Foundation/Grant", produkFokus: "IMPACT+", kontakPIC: "Mira Hanim (Project Manager)", stage: "6. Proposal Formal", estUmkmReach: 500, estNilaiDeal: 200000000, probability: 0.55, tglMasuk: new Date("2026-04-20") },
  { sales: "Dimas", namaProspek: "KADIN DKI Jakarta", channel: "Asosiasi", produkFokus: "IMPACT+, MWX Academy", kontakPIC: "Mahir (WKU Koordinator II)", stage: "6. Proposal Formal", estUmkmReach: 1000, estNilaiDeal: 250000000, probability: 0.6, tglMasuk: new Date("2026-04-20") },
  { sales: "Riany", namaProspek: "Victoria Care Indonesia", channel: "Corporate/CSR", produkFokus: "IMPACT+", kontakPIC: "Ibu Winny (VP Corcom)", stage: "2. Outreach (Email/WA)", estUmkmReach: 100, estNilaiDeal: 50000000, probability: 0.15, tglMasuk: new Date("2026-04-20") },
  { sales: "Dimas", namaProspek: "Istiqlal × Voyage", channel: "Partnership", produkFokus: "Whitelabel MWX Academy", kontakPIC: "Mas Pungkas (Dewan Pengurus Istiqlal)", stage: "7. Negosiasi", estUmkmReach: 500, estNilaiDeal: 180000000, probability: 0.65, tglMasuk: new Date("2026-04-20") },
  { sales: "Riany", namaProspek: "Djarum × Blibli", channel: "Corporate/CSR", produkFokus: "IMPACT+", kontakPIC: "Mas Tri (Corcom Djarum)", stage: "1. Lead/Prospek", estUmkmReach: 500, estNilaiDeal: 300000000, probability: 0.25, tglMasuk: new Date("2026-04-20") },
  { sales: "Dimas", namaProspek: "Yayasan Astra YDBA", channel: "Foundation/CSR", produkFokus: "IMPACT+", kontakPIC: "Pak Edison (Program Dept Head)", stage: "2. Outreach (Email/WA)", estUmkmReach: 1300, estNilaiDeal: 200000000, probability: 0.25, tglMasuk: new Date("2026-04-20") },
  { sales: "Riany", namaProspek: "CEDEA", channel: "Community", produkFokus: "IMPACT+, Workshop", kontakPIC: "Tim CEDEA", stage: "3. Follow Up / Kit", estUmkmReach: 250, estNilaiDeal: 150000000, probability: 0.45, tglMasuk: new Date("2026-04-22") },
  { sales: "Dimas", namaProspek: "Elnusa & Gekrafs DKI Jakarta", channel: "Corporate/Asosiasi", produkFokus: "IMPACT+", kontakPIC: "Farazandy (Komisaris Elnusa / Ketua Gekrafs DKI)", stage: "2. Outreach (Email/WA)", estUmkmReach: 31000, estNilaiDeal: 500000000, probability: 0.25, tglMasuk: new Date("2026-04-22") },
  { sales: "Regita", namaProspek: "BSI (Bank Syariah Indonesia)", channel: "Banking", produkFokus: "IMPACT+, Webinar", kontakPIC: "Pak Nana; Pak Hadrian", stage: "2. Outreach (Email/WA)", estUmkmReach: 5000, estNilaiDeal: 150000000, probability: 0.3, tglMasuk: new Date("2026-04-22") },
  { sales: "Afif", namaProspek: "11thSpace (Event XLR8)", channel: "Event", produkFokus: "FinanceWhiz", kontakPIC: "Tim 11thSpace", stage: "3. Follow Up / Kit", estUmkmReach: 8, estNilaiDeal: 5000000, probability: 0.7, tglMasuk: new Date("2026-04-23") },
  { sales: "Riany", namaProspek: "Paxel", channel: "Corporate/CSR", produkFokus: "CreateWhiz, FinanceWhiz", kontakPIC: "Eldi; Mayang; Kiki (Paxel)", stage: "3. Follow Up / Kit", estUmkmReach: 30, estNilaiDeal: 50000000, probability: 0.5, tglMasuk: new Date("2026-04-23") },
  { sales: "Dimas", namaProspek: "Staff Khusus Presiden (SKP)", channel: "Government", produkFokus: "IMPACT+", kontakPIC: "Dimas Wisnu Banass", stage: "3. Follow Up / Kit", estUmkmReach: 1000, estNilaiDeal: 500000000, probability: 0.35, tglMasuk: new Date("2026-04-23") },
  { sales: "Riqsa", namaProspek: "APEKSI × Bank BTN", channel: "Government/Banking", produkFokus: "IMPACT+, Pelatihan", kontakPIC: "Devy Munir (APEKSI); Dodi (EO BTN)", stage: "3. Follow Up / Kit", estUmkmReach: 5000, estNilaiDeal: 400000000, probability: 0.35, tglMasuk: new Date("2026-04-15") },
  { sales: "Tessa", namaProspek: "Komunitas Karya Kami", channel: "Community", produkFokus: "IMPACT+", kontakPIC: "Pak Ari", stage: "2. Outreach (Email/WA)", estUmkmReach: 1000, estNilaiDeal: 80000000, probability: 0.25, tglMasuk: new Date("2026-04-17") },
  { sales: "Regita", namaProspek: "Kementerian UMKM (Meeting 2)", channel: "Government", produkFokus: "IMPACT+, Database", kontakPIC: "Nova Zabrina (MediaWave)", stage: "4. Meeting Discovery", estUmkmReach: 5000, estNilaiDeal: 500000000, probability: 0.4, tglMasuk: new Date("2026-04-22") },
  { sales: "Kreshna", namaProspek: "SMESCO (Kreshna)", channel: "Partnership", produkFokus: "Whitelabel, Webinar Series", kontakPIC: "Pak Ade (SMESCO)", stage: "7. Negosiasi", estUmkmReach: 28, estNilaiDeal: 80000000, probability: 0.75, tglMasuk: new Date("2026-04-01") },
];

const ACTIVITY_DATA = [
  { sales: "Dimas", prospect: "SMESCO", tanggal: new Date("2026-04-07"), tipeAktivitas: "Meeting Offline", pic: "Tim Bu Astika", topikHasil: "Persiapan teknis Workshop Bandung 15-16 Apr — lobi Walikota, setup peserta, materi, doorprize, logistik", nextStage: "5. Demo/Presentasi", catatan: "Deadline TOR/undangan ke Walikota 9 Apr. Form peserta dari SMESCO H-2 (13 Apr). Eksplorasi Pandi & Road to Campus", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-318/2kzmurw1-338" },
  { sales: "Riqsa", prospect: "INDOWIRA", tanggal: new Date("2026-04-10"), tipeAktivitas: "Meeting Offline", pic: "Pak Hery (Pengurus Pusat)", topikHasil: "Introduction MWX ke INDOWIRA — ±600 anggota wirausaha aktif, familiar AI, punya program Sekolah Wirausaha", nextStage: "3. Follow Up / Kit", catatan: "Disepakati jadwalkan demo offline. Produk relevan: SmartWhiz, SMEwhiz, Reportwhiz untuk Sekolah Wirausaha", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-378/2kzmurw1-398" },
  { sales: "Kreshna", prospect: "SMESCO (Kreshna)", tanggal: new Date("2026-04-14"), tipeAktivitas: "Meeting Offline", pic: "Pak Ade (SMESCO)", topikHasil: "Evaluasi konversi user, teknis whitelabel SMESCO, perencanaan Webinar Series 2 mingguan", nextStage: "7. Negosiasi", catatan: "28 user bayar, ~10 aktif. Webinar Series Rabu/Kamis 10.00 Rp150-170rb. Dirut SMESCO terlibat langsung di review dashboard", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1078/2kzmurw1-958" },
  { sales: "Dimas", prospect: "SMESCO", tanggal: new Date("2026-04-15"), tipeAktivitas: "Demo", pic: "Peserta Workshop Bandung", topikHasil: "Workshop offline MWX × SMESCO — edukasi AI + onboarding CreateWhiz ke peserta UMKM Bandung", nextStage: "5. Demo/Presentasi", catatan: "Slot MWX 90 menit. Hari ke-1 dari 2 hari workshop (15-16 Apr 2026)", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-318/2kzmurw1-338" },
  { sales: "Riqsa", prospect: "APEKSI × Bank BTN", tanggal: new Date("2026-04-15"), tipeAktivitas: "Meeting Offline", pic: "Devy Munir (APEKSI); Dodi (EO BTN)", topikHasil: "Kolaborasi pelatihan UMKM go digital via CSR Bank BTN — 98 kota anggota APEKSI, KPI 50-100 UMKM/event, berlangganan 3 bln", nextStage: "3. Follow Up / Kit", catatan: "MWX sebagai penyedia AI + trainer. APEKSI susun proposal. Skema referral fee & special rate EO perlu disusun. Next: minggu ke-3 Apr", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1218/2kzmurw1-998" },
  { sales: "Regita", prospect: "InJourney", tanggal: new Date("2026-04-16"), tipeAktivitas: "Meeting Offline", pic: "", topikHasil: "Meeting lanjutan — pembahasan program CSR 30 UMKM binaan, 2 skema penawaran (3 bln & 6 bln) sudah dikirim", nextStage: "6. Proposal Formal", catatan: "FinanceWhiz sudah ada di vendor lain. Fokus ke CreateWhiz/SmartWhiz. Skema 6 bln lebih ideal untuk impact", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1618/2kzmurw1-1178" },
  { sales: "Nova", prospect: "Kementerian UMKM", tanggal: new Date("2026-04-16"), tipeAktivitas: "Meeting Offline", pic: "Tim Kementerian UMKM", topikHasil: "Evaluasi rangkaian event onboarding UMKM di berbagai kota + roadmap event MWX × Kementerian 2026", nextStage: "4. Meeting Discovery", catatan: "Kementerian izinkan nama mereka sebagai backing Impact Plus. Rencana MWX Academy Offline. Event Wonosobo 23-26 Apr & Surakarta minggu ke-4", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1198/2kzmurw1-978" },
  { sales: "Dimas", prospect: "Pemda Lahat", tanggal: new Date("2026-04-17"), tipeAktivitas: "Meeting Offline", pic: "Mas Syauqi (Pemda Lahat)", topikHasil: "Inisiasi kolaborasi MWX × Pemda Lahat — rencana kunjungan, launching yayasan, program UMKM AI sebagai flagship", nextStage: "1. Lead/Prospek", catatan: "Masih outline awal. PIC MWX belum tercantum. Detail perlu dilengkapi setelah kunjungan ke Lahat", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1598/2kzmurw1-1158" },
  { sales: "Regita", prospect: "Telkomsel", tanggal: new Date("2026-04-17"), tipeAktivitas: "Meeting Offline", pic: "Bang Fadli; Pak Jemi Mulia (GM); Pak Kwok Wai (GM); Pak Sunam", topikHasil: "Eksplorasi partnership produk UMKM Telkomsel — MWX isi kekosongan produk UMKM Tsel, 2 jalur paralel + ekspansi ke Stackez", nextStage: "3. Follow Up / Kit", catatan: "Jalur: bottom-up (Fadli+Kwok) & top-down (Sunam→Jemi). Stackez (Singtel lokal) via Bu Anna. Notes dikirim via WA 21 Apr", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1578/2kzmurw1-1138" },
  { sales: "Regita", prospect: "SNBC / Daya", tanggal: new Date("2026-04-17"), tipeAktivitas: "Meeting Offline", pic: "", topikHasil: "Introduction meeting antara MWX dan SNBC (Daya) — penjajakan awal potensi kolaborasi", nextStage: "2. Outreach (Email/WA)", catatan: "Notes sangat minimal. Detail belum terdokumentasi. Initial meeting formal dengan tim Daya dijadwalkan berikutnya", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1638/2kzmurw1-1198" },
  { sales: "Nova", prospect: "Kementerian Kebudayaan RI", tanggal: new Date("2026-04-20"), tipeAktivitas: "Demo", pic: "Wamen Giring Ganesha", topikHasil: "Presentasi FinanceWhiz, CreateWhiz, ReportWhiz ke Wamen — wacana digitalisasi Candi Plaosan & integrasi Dana Raya Indonesia", nextStage: "3. Follow Up / Kit", catatan: "MWX akan di-matching ke badan/lembaga relevan Kemendikbud. Budget Candi Plaosan via dana trustee.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1538/2kzmurw1-1118" },
  { sales: "Dimas", prospect: "KataData Foundation", tanggal: new Date("2026-04-20"), tipeAktivitas: "Meeting Offline", pic: "Mira Hanim (Project Manager)", topikHasil: "Eksplorasi IMPACT+ via Grant Fund — program naik kelas UMKM binaan, pendanaan dari dana grant KataData Foundation", nextStage: "6. Proposal Formal", catatan: "Narasi harus impact-driven bukan komersial. Susun deck foundation-friendly + framework impact measurement. Prob: 55%", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1458/2kzmurw1-1038" },
  { sales: "Dimas", prospect: "KADIN DKI Jakarta", tanggal: new Date("2026-04-20"), tipeAktivitas: "Meeting Offline", pic: "Mahir (WKU Koordinator II)", topikHasil: "Kolaborasi IMPACT+ & whitelabel MWX Academy berbranding KADIN — CSR dari anggota KADIN sebagai sumber funding", nextStage: "6. Proposal Formal", catatan: "Whitelabel AI for UMKM + MWX Academy. Replikable ke KADIN daerah. Susun program design + deck. Prob: 60%", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1438/2kzmurw1-1018" },
  { sales: "Riany", prospect: "Victoria Care Indonesia", tanggal: new Date("2026-04-20"), tipeAktivitas: "Meeting Offline", pic: "Ibu Winny (VP Corcom)", topikHasil: "Eksplorasi kolaborasi program pemberdayaan UMKM AI — Victoria Care sudah punya komunitas & affiliator sendiri", nextStage: "2. Outreach (Email/WA)", catatan: "STALLED. Tidak ada rencana agency saat ini. Keep warm. Kirim proposal untuk kebutuhan mendatang. Prob: 15%", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1518/2kzmurw1-1098" },
  { sales: "Dimas", prospect: "Istiqlal × Voyage", tanggal: new Date("2026-04-20"), tipeAktivitas: "Meeting Offline", pic: "Mas Pungkas (Dewan Pengurus Istiqlal)", topikHasil: "Kolaborasi whitelabel program UMKM AI — Voyage sebagai operator + Istiqlal sebagai komunitas + MWX sebagai teknologi", nextStage: "7. Negosiasi", catatan: "Whitelabel + landing page branding Istiqlal. Program inklusif & berbasis komunitas keumatan. Meeting BoD dijadwalkan 22 Apr. Prob: 65%", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1478/2kzmurw1-1058" },
  { sales: "Riany", prospect: "Djarum × Blibli", tanggal: new Date("2026-04-20"), tipeAktivitas: "Meeting Offline", pic: "Mas Tri (Corcom Djarum)", topikHasil: "Eksplorasi kolaborasi UMKM AI via DRP (Djarum Retail Program) dan Blibli — tema #banggabuatanindonesia", nextStage: "1. Lead/Prospek", catatan: "Harus kirim proposal formal dulu sebelum bisa meeting teknis. Entry via jalur internal. Prob: 25%", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1498/2kzmurw1-1078" },
  { sales: "Dimas", prospect: "Yayasan Astra YDBA", tanggal: new Date("2026-04-20"), tipeAktivitas: "Meeting Offline", pic: "Pak Edison (Program Dept Head); Ibu Ema; Pak Agung", topikHasil: "Introduction — sosialisasi IMPACT+ ke ±1.300 UMKM binaan YDBA, terbuka untuk aktivasi offline & online", nextStage: "2. Outreach (Email/WA)", catatan: "Tidak ada CSR funding. Posisi YDBA: distribution partner. Eksplorasi revenue share/freemium/bundling.", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1758/2kzmurw1-1218" },
  { sales: "Riany", prospect: "CEDEA", tanggal: new Date("2026-04-22"), tipeAktivitas: "Meeting Offline", pic: "Tim CEDEA", topikHasil: "Eksplorasi komunitas UMKM 200-300 orang via workshop offline — MWX kuasi & own komunitas untuk jangka panjang", nextStage: "3. Follow Up / Kit", catatan: "3 tier budget: Rp100jt/150jt/200jt. Framing: Marketing/Brand Activation bukan CSR. Komunitas bisa di-reactivate recurring", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1838/2kzmurw1-1298" },
  { sales: "Dimas", prospect: "Elnusa & Gekrafs DKI Jakarta", tanggal: new Date("2026-04-22"), tipeAktivitas: "Meeting Offline", pic: "Farazandy (Komisaris Elnusa / Ketua Gekrafs DKI)", topikHasil: "Eksplorasi IMPACT+ via Gekrafs DKI sebagai channel edukasi AI untuk 31.000 UMKM Jakpreneur", nextStage: "2. Outreach (Email/WA)", catatan: "Farazandy dual role. Gekrafs = entry point tercepat. Model replikable ke asosiasi ekraf kota lain", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1798/2kzmurw1-1258" },
  { sales: "Regita", prospect: "Kementerian UMKM (Meeting 2)", tanggal: new Date("2026-04-22"), tipeAktivitas: "Meeting Offline", pic: "Nova Zabrina (MediaWave); 4 perwakilan Kemenkop", topikHasil: "Meeting lanjutan — skema integrasi database MWX × Kemenkop, form scoring kurasi UMKM siap digitalisasi", nextStage: "4. Meeting Discovery", catatan: "Joined database MWX+Kemenkop. Form scoring = top-of-funnel IMPACT+. Event PLUT Surakarta & Nagoya Batam sebagai activation point", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1778/2kzmurw1-1238" },
  { sales: "Dimas", prospect: "Istiqlal × Voyage", tanggal: new Date("2026-04-22"), tipeAktivitas: "Meeting Offline", pic: "Board of Directors Istiqlal", topikHasil: "Meeting lanjutan dengan BoD Istiqlal — pembahasan teknis whitelabel dan konfirmasi arah kolaborasi", nextStage: "7. Negosiasi", catatan: "Follow-up dari meeting 20 Apr. Mockup landing page perlu siap sebelum/sesaat setelah meeting ini", linkMOM: "https://app.clickup.com/90182607745/docs/2kzmurw1-1478/2kzmurw1-1058" },
  { sales: "Tessa", prospect: "Komunitas Karya Kami", tanggal: new Date("2026-04-17"), tipeAktivitas: "Meeting Online", pic: "Pak Ari", topikHasil: "Introduction MWX ke Komunitas Karya Kami — ±1.000 anggota aktif Indonesia, secara aktif menyelenggarakan program pelatihan ke anggota", nextStage: "2. Outreach (Email/WA)", catatan: "Next: jadwalkan pertemuan offline dengan pengurus di Jakarta", linkMOM: "" },
  { sales: "Regita", prospect: "BSI (Bank Syariah Indonesia)", tanggal: new Date("2026-04-22"), tipeAktivitas: "Meeting Offline", pic: "Pak Nana; Pak Hadrian; Pak Bana; Bu Wien", topikHasil: "Penjajakan kolaborasi program UMKM — BSI punya 5.000 UMKM binaan + UMKM Center di Aceh/Jogja/Surabaya/Makassar", nextStage: "2. Outreach (Email/WA)", catatan: "FU untuk webinar dengan UMKM Center BSI. Skala program perlu disesuaikan dengan keterbatasan Ziswaf", linkMOM: "" },
  { sales: "Afif", prospect: "11thSpace (Event XLR8)", tanggal: new Date("2026-04-23"), tipeAktivitas: "Meeting Online", pic: "Tim 11thSpace", topikHasil: "MWX masuk batch 7 XLR8 tanggal 03/06/2026 — event offline di Kedoya, intimate 7-8 user. Fokus FinanceWhiz sesuai tema literasi keuangan bisnis", nextStage: "3. Follow Up / Kit", catatan: "Siapkan assets FAQ: PDF hasil Whiz, video tutorial, profile MWX Market/Academy, link terkait. Email free trial H-1 acara", linkMOM: "" },
  { sales: "Riany", prospect: "Paxel", tanggal: new Date("2026-04-23"), tipeAktivitas: "Meeting Offline", pic: "Eldi; Mayang; Kiki (Paxel)", topikHasil: "Kolaborasi program pemberdayaan UMKM berbasis AI — reward program untuk 20-30 UMKM top users Paxel", nextStage: "3. Follow Up / Kit", catatan: "Budget maks Rp50jt. MWX susun proposal (online 3 bln + reward activation + pendampingan).", linkMOM: "" },
  { sales: "Dimas", prospect: "Staff Khusus Presiden (SKP)", tanggal: new Date("2026-04-23"), tipeAktivitas: "Meeting Online", pic: "Dimas Wisnu Banass (Staf SKP Bidang UMKM & Teknologi Digital)", topikHasil: "Follow-up meeting pendalaman kolaborasi IMPACT+ — fokus wilayah Jawa Barat, target ±1.000 UMKM", nextStage: "3. Follow Up / Kit", catatan: "Challenge: butuh whitepaper data & insight kuat + pemetaan partner pembiayaan lokal di Jabar", linkMOM: "" },
];

async function main() {
  console.log("Seeding database...");

  const hash = (p) => bcrypt.hashSync(p, 10);

  // Upsert admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@mwx.id" },
    update: {},
    create: { name: "Admin MWX", email: "admin@mwx.id", passwordHash: hash("admin123"), role: "admin" },
  });
  console.log("Admin created:", admin.email);

  // Upsert sales users
  const userMap = {};
  for (const u of SALES_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash: hash("sales123"), role: "sales" },
    });
    userMap[u.name] = user;
    console.log("User:", user.email);
  }

  // Upsert funnel stages
  for (const s of STAGES) {
    await prisma.funnelStage.upsert({
      where: { name: s.name },
      update: s,
      create: s,
    });
  }
  console.log("Funnel stages seeded");

  // Upsert config
  for (const c of CONFIG) {
    await prisma.config.upsert({
      where: { key: c.key },
      update: c,
      create: c,
    });
  }
  console.log("Config seeded");

  // Create prospects
  const prospectMap = {};
  for (const p of PIPELINE_DATA) {
    const salesUser = userMap[p.sales];
    if (!salesUser) { console.warn("No user for sales:", p.sales); continue; }
    const weighted = (p.estUmkmReach || 0) * (p.probability || 0);
    const prospect = await prisma.prospect.create({
      data: {
        salesId: salesUser.id,
        namaProspek: p.namaProspek,
        channel: p.channel,
        produkFokus: p.produkFokus,
        kontakPIC: p.kontakPIC,
        stage: p.stage,
        tglMasuk: p.tglMasuk,
        tglUpdateStage: p.tglMasuk,
        estUmkmReach: p.estUmkmReach,
        estNilaiDeal: p.estNilaiDeal,
        probability: p.probability,
        weightedUmkm: weighted,
        statusSLA: "On Track",
      },
    });
    prospectMap[p.namaProspek] = prospect;
    console.log("Prospect:", p.namaProspek);
  }

  // Create activities
  for (const a of ACTIVITY_DATA) {
    const salesUser = userMap[a.sales];
    if (!salesUser) { console.warn("No user for sales:", a.sales); continue; }
    const prospect = prospectMap[a.prospect];
    await prisma.activity.create({
      data: {
        salesId: salesUser.id,
        prospectId: prospect?.id || null,
        tanggal: a.tanggal,
        tipeAktivitas: a.tipeAktivitas,
        namaProspek: a.prospect,
        pic: a.pic,
        topikHasil: a.topikHasil,
        nextStage: a.nextStage,
        catatan: a.catatan,
        linkMOM: a.linkMOM,
      },
    });
    console.log("Activity:", a.prospect, a.tanggal.toISOString().slice(0, 10));
  }

  console.log("\nDone! Database seeded successfully.");
  console.log(`Users: ${Object.keys(userMap).length + 1} (admin + ${Object.keys(userMap).length} sales)`);
  console.log(`Prospects: ${Object.keys(prospectMap).length}`);
  console.log(`Activities: ${ACTIVITY_DATA.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
