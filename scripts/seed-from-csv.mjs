import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../dev.db");
const db = new Database(DB_PATH);

function cuid() {
  return "c" + Math.random().toString(36).slice(2, 22) + Math.random().toString(36).slice(2, 6);
}

function parseDate(str) {
  if (!str || str === "") return new Date("2026-04-20");
  str = str.trim();
  // DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`);
  // DD-MMM-YYYY or DD-MMM-YY
  const dMY = str.match(/^(\d{1,2})-([A-Za-z]+)-(\d{2,4})$/);
  if (dMY) {
    const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const m = months[dMY[2].toLowerCase()];
    const y = dMY[3].length === 2 ? 2000 + parseInt(dMY[3]) : parseInt(dMY[3]);
    if (m) return new Date(`${y}-${String(m).padStart(2,"0")}-${dMY[1].padStart(2,"0")}`);
  }
  // DD-Apr-2026 etc
  const d2 = str.match(/^(\d{1,2})-(\w+)-(\d{4})$/);
  if (d2) {
    const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const m = months[d2[2].toLowerCase()];
    if (m) return new Date(`${d2[3]}-${String(m).padStart(2,"0")}-${d2[1].padStart(2,"0")}`);
  }
  return new Date("2026-04-20");
}

function parseNum(str) {
  if (!str || str === "-" || str === "") return null;
  return parseFloat(str.replace(/[.,]/g, (m, i, s) => {
    // handle Indonesian format: 150.000.000 or 1,000
    return "";
  })) || null;
}

function parseUMKM(str) {
  if (!str || str === "-" || str === "") return null;
  const clean = str.replace(/[",]/g, "").trim();
  const n = parseInt(clean);
  return isNaN(n) ? null : n;
}

function parseNilai(str) {
  if (!str || str === "-" || str === "") return null;
  const clean = str.replace(/[".]/g, "").replace(",", "").trim();
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function parseProb(str) {
  if (!str || str === "-" || str === "") return null;
  const n = parseFloat(str.replace("%", "").trim());
  return isNaN(n) ? null : n / 100;
}

function parseSLA(str) {
  if (!str) return "On Track";
  if (str.includes("On Track") || str.includes("🟢")) return "On Track";
  if (str.includes("Stuck") || str.includes("🔴")) return "Stuck";
  if (str.includes("Stall") || str.includes("🟡")) return "At Risk";
  return "On Track";
}

function parseHari(str) {
  if (!str || str === "-" || str === "") return 0;
  const n = parseInt(str);
  return isNaN(n) ? 0 : n;
}

// ─── 1. Update Funnel Stages ───────────────────────────────────────────────
console.log("📋 Updating funnel stages...");
db.exec("DELETE FROM FunnelStage");

const stages = [
  { order: 1, name: "1. Lead/Prospek",       description: "Prospek teridentifikasi dari riset & mapping. Decision maker sudah diketahui.", slaMin: 1, slaTarget: 2, slaMax: 3,  convRate: 1.0 },
  { order: 2, name: "2. Outreach (Email/WA)", description: "Sudah dihubungi via email/WA, menunggu respons atau jadwal meeting.", slaMin: 2, slaTarget: 3, slaMax: 7,  convRate: 0.8 },
  { order: 3, name: "3. Follow Up / Kit",     description: "Kit/materi sudah dikirim, sedang follow up untuk jadwal demo atau meeting.", slaMin: 3, slaTarget: 5, slaMax: 10, convRate: 0.7 },
  { order: 4, name: "4. Meeting Discovery",   description: "Meeting discovery / penjajakan awal telah dilaksanakan.", slaMin: 3, slaTarget: 7, slaMax: 14, convRate: 0.6 },
  { order: 5, name: "5. Demo/Presentasi",     description: "Demo produk atau presentasi formal sudah dijadwalkan atau terlaksana.", slaMin: 3, slaTarget: 7, slaMax: 14, convRate: 0.55 },
  { order: 6, name: "6. Proposal Formal",     description: "Proposal formal/penawaran tertulis sudah dikirimkan.", slaMin: 3, slaTarget: 7, slaMax: 14, convRate: 0.5 },
  { order: 7, name: "7. Negosiasi",           description: "Sedang negosiasi harga, terms, dan kontrak.", slaMin: 3, slaTarget: 7, slaMax: 14, convRate: 0.65 },
  { order: 8, name: "8. Closed Won",          description: "Deal berhasil, UMKM onboard ke platform MWX.", slaMin: 0, slaTarget: 0, slaMax: 0,  convRate: 1.0 },
  { order: 9, name: "9. Closed Lost",         description: "Deal gagal / tidak dilanjutkan.", slaMin: 0, slaTarget: 0, slaMax: 0,  convRate: 0.0 },
];

const insertStage = db.prepare(`
  INSERT INTO FunnelStage (id, "order", name, description, slaMin, slaTarget, slaMax, convRateTarget)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const s of stages) {
  insertStage.run(cuid(), s.order, s.name, s.description, s.slaMin, s.slaTarget, s.slaMax, s.convRate);
}
console.log(`  ✓ ${stages.length} stages updated`);

// ─── 2. Create Sales Users ─────────────────────────────────────────────────
console.log("👥 Creating sales users...");
const defaultPassword = bcrypt.hashSync("sales123", 12);

const salesPeople = [
  { name: "Dimas",       email: "dimas@mwx.id",   region: "Jakarta" },
  { name: "Tessa",       email: "tessa@mwx.id",   region: "Jakarta" },
  { name: "Kreshna",     email: "kreshna@mwx.id", region: "Jakarta" },
  { name: "Riqsa",       email: "riqsa@mwx.id",   region: "Jakarta" },
  { name: "Regita",      email: "regita@mwx.id",  region: "Jakarta" },
  { name: "Nova",        email: "nova@mwx.id",    region: "Jakarta" },
  { name: "Riany",       email: "riany@mwx.id",   region: "Jakarta" },
  { name: "Afif",        email: "afif@mwx.id",    region: "Jakarta" },
  { name: "Erik Palupi", email: "erik@mwx.id",    region: "Indonesia" },
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO User (id, name, email, passwordHash, role, region, active, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, 'sales', ?, 1, datetime('now'), datetime('now'))
`);

const userMap = {};
// Load existing users
const existingUsers = db.prepare("SELECT id, name, email FROM User").all();
for (const u of existingUsers) {
  userMap[u.name.toLowerCase()] = u.id;
  userMap[u.email] = u.id;
}

for (const s of salesPeople) {
  const existing = db.prepare("SELECT id FROM User WHERE email = ?").get(s.email);
  if (!existing) {
    const id = cuid();
    insertUser.run(id, s.name, s.email, defaultPassword, s.region);
    userMap[s.name.toLowerCase()] = id;
    console.log(`  + Created: ${s.name} (${s.email})`);
  } else {
    userMap[s.name.toLowerCase()] = existing.id;
    console.log(`  ✓ Existing: ${s.name}`);
  }
}

// Reload all users
const allUsers = db.prepare("SELECT id, name, email FROM User").all();
for (const u of allUsers) {
  userMap[u.name.toLowerCase()] = u.id;
}

function getSalesId(name) {
  if (!name) return null;
  // Handle compound names like "Riany; Nova"
  const first = name.split(/[;,]/)[0].trim().toLowerCase();
  return userMap[first] || userMap["erik palupi"] || null;
}

// ─── 3. Seed Prospects (Pipeline) ─────────────────────────────────────────
console.log("🎯 Seeding prospects...");

// Delete old prospect (the one from initial seed - PT Telkom) and related data
const existingProspects = db.prepare("SELECT id FROM Prospect").all();
if (existingProspects.length > 0) {
  db.prepare("DELETE FROM PipelineHistory").run();
  db.prepare("DELETE FROM Activity").run();
  db.prepare("DELETE FROM MOM").run();
  db.prepare("DELETE FROM Prospect").run();
  console.log("  ✓ Cleared old pipeline data");
}

const prospects = [
  { no:1,  tglMasuk:"2026-04-07", sales:"Dimas",       nama:"SMESCO",                                                    channel:"Impact+",    produk:"CreateWhiz",           pic:"Tim Bu Astika",                                          kontakInfo:"",                                  stage:"5. Demo/Presentasi",  tglUpdate:"2026-04-16", nextAction:"Follow up pasca workshop; explore Road to Campus",                                                                    estUmkm:null,   estNilai:null,       prob:0.60, hari:7,  sla:"On Track", catatan:"Workshop sudah terlaksana 15-16 Apr. Road to Campus dengan Bu Astika = jalur baru",                                              link:"https://app.clickup.com/90182607745/docs/2kzmurw1-318/2kzmurw1-338" },
  { no:2,  tglMasuk:"2026-04-04", sales:"Tessa",       nama:"INDOWIRA",                                                  channel:"Asosiasi",   produk:"SMEwhiz",               pic:"Pak Hery (Pengurus Pusat)",                               kontakInfo:"",                                  stage:"3. Follow Up / Kit",  tglUpdate:"2026-10-04", nextAction:"Jadwalkan & konfirmasi demo offline MWX",                                                                                      estUmkm:600,    estNilai:null,       prob:0.30, hari:13, sla:"Stuck",    catatan:"±600 anggota aktif, familiar AI. Program Sekolah Wirausaha jadi entry point",                                                    link:"https://app.clickup.com/90182607745/docs/2kzmurw1-378/2kzmurw1-398" },
  { no:3,  tglMasuk:"2026-04-14", sales:"Kreshna",     nama:"SMESCO",                                                    channel:"Impact+",    produk:"SmartWhiz",             pic:"Pak Ade (SMESCO)",                                       kontakInfo:"",                                  stage:"7. Negosiasi",        tglUpdate:"2026-04-14", nextAction:"Setup whitelabel subdomain SMESCO + finalisasi format Webinar Series (Rabu/Kamis 10.00)",                                  estUmkm:null,   estNilai:null,       prob:0.70, hari:9,  sla:"On Track", catatan:"28 user bayar, ~10 aktif. Whitelabel MWX+SMESCO subdomain. Webinar 2 mingguan Rp150-170rb. Dirut terlibat langsung",             link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1078/2kzmurw1-958" },
  { no:4,  tglMasuk:"2026-04-15", sales:"Riqsa",       nama:"APEKSI × Bank BTN",                                         channel:"Asosiasi",   produk:"SmartWhiz",             pic:"Devy Munir (APEKSI); Dodi (EO BTN)",                     kontakInfo:"",                                  stage:"3. Follow Up / Kit",  tglUpdate:"2026-04-15", nextAction:"Susun skema referral fee + deck trainer AI untuk proposal EO",                                                                 estUmkm:100,    estNilai:null,       prob:0.50, hari:8,  sla:"Stuck",    catatan:"KPI 50-100 UMKM/event × 98 kota anggota APEKSI. Berlangganan 3 bln. Model replikasi ke Bank Syariah Nasional",                    link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1218/2kzmurw1-998" },
  { no:5,  tglMasuk:"2026-04-16", sales:"Regita",      nama:"InJourney",                                                  channel:"Impact+",    produk:"CreateWhiz",            pic:"",                                                       kontakInfo:"",                                  stage:"6. Proposal Formal",  tglUpdate:"2026-04-16", nextAction:"Follow up feedback penawaran (2 skema: 3 bln & 6 bln)",                                                                       estUmkm:30,     estNilai:null,       prob:0.50, hari:7,  sla:"On Track", catatan:"FinanceWhiz sudah ada di vendor lain. Fokus ke CreateWhiz/SmartWhiz. Skema 6 bulan lebih ideal",                                   link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1618/2kzmurw1-1178" },
  { no:6,  tglMasuk:"2026-04-16", sales:"Nova",        nama:"Kementerian UMKM",                                           channel:"Academy",    produk:"Multi-Product / Bundle", pic:"TBC (Kementerian UMKM)",                                 kontakInfo:"",                                  stage:"4. Meeting Discovery", tglUpdate:"2026-04-16", nextAction:"Susun & konfirmasi roadmap event 2026 bersama Kementerian",                                                                   estUmkm:null,   estNilai:null,       prob:0.60, hari:7,  sla:"On Track", catatan:"Kementerian izinkan nama mereka sebagai backing Impact Plus. Roadmap event 2026 sedang disusun bersama. MWX Academy Offline direncanakan", link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1198/2kzmurw1-978" },
  { no:7,  tglMasuk:"2026-04-17", sales:"Erik Palupi", nama:"Pemda Lahat",                                                channel:"Academy",    produk:"Multi-Product / Bundle", pic:"Mas Syauqi (Pemda Lahat)",                               kontakInfo:"",                                  stage:"1. Lead/Prospek",     tglUpdate:"2026-04-17", nextAction:"Finalisasi jadwal kunjungan MWX ke Lahat + koordinasi stakeholder Pemda",                                                      estUmkm:null,   estNilai:null,       prob:0.20, hari:6,  sla:"Stuck",    catatan:"Launching yayasan Mas Syauqi sebagai entry point institusional. Program UMKM AI sebagai flagship. Detail belum terdokumentasi",    link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1598/2kzmurw1-1158" },
  { no:8,  tglMasuk:"2026-04-17", sales:"Regita",      nama:"Telkomsel",                                                  channel:"Perusahaan", produk:"Multi-Product / Bundle", pic:"Bang Fadli; Pak Sunam; Pak Jemi Mulia (GM); Pak Kwok Wai (GM)", kontakInfo:"",                             stage:"3. Follow Up / Kit",  tglUpdate:"2026-04-17", nextAction:"Share akun demo ke Bang Fadli + buka komunikasi dengan Pak Sunam",                                                              estUmkm:null,   estNilai:null,       prob:0.30, hari:6,  sla:"At Risk",  catatan:"Tsel belum punya produk UMKM. 2 jalur paralel: bottom-up (Fadli+Kwok) & top-down (Sunam→Jemi). Peluang ekspansi ke Stackez/Singtel via Bu Anna", link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1578/2kzmurw1-1138" },
  { no:9,  tglMasuk:"2026-04-17", sales:"Erik Palupi", nama:"SNBC / Daya",                                                channel:"Perusahaan", produk:"SmartWhiz",             pic:"",                                                       kontakInfo:"",                                  stage:"2. Outreach (Email/WA)", tglUpdate:"2026-04-17", nextAction:"Initial meeting tim Daya + mapping peluang kolaborasi",                                                                 estUmkm:null,   estNilai:null,       prob:0.20, hari:6,  sla:"Stuck",    catatan:"Introduction meeting awal. Detail belum terdokumentasi. Follow-up meeting dengan tim Daya dijadwalkan",                          link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1638/2kzmurw1-1198" },
  { no:10, tglMasuk:"2026-04-20", sales:"Nova",        nama:"Kementerian Kebudayaan RI",                                  channel:"Perusahaan", produk:"FinanceWhiz",           pic:"Wamen Giring Ganesha",                                   kontakInfo:"",                                  stage:"3. Follow Up / Kit",  tglUpdate:"2026-04-20", nextAction:"Follow-up matching lembaga + jajaki Dana Raya Indonesia + kajian teknis Candi Plaosan",                                        estUmkm:null,   estNilai:null,       prob:0.30, hari:3,  sla:"On Track", catatan:"Presentasi FinanceWhiz/CreateWhiz/ReportWhiz ke Wamen. Wacana digitalisasi Candi Plaosan via dana trustee. Integrasi ke ekosistem Dana Raya Indonesia", link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1538/2kzmurw1-1118" },
  { no:11, tglMasuk:"2026-04-20", sales:"Dimas",       nama:"KataData Foundation",                                        channel:"Impact+",    produk:"Multi-Product / Bundle", pic:"Mira Hanim (Project Manager)",                           kontakInfo:"",                                  stage:"6. Proposal Formal",  tglUpdate:"2026-04-20", nextAction:"Susun deck & proposal versi foundation-friendly (impact-driven bukan komersial)",                                               estUmkm:500,    estNilai:null,       prob:0.55, hari:3,  sla:"On Track", catatan:"Funding via Grant Fund. Narasi harus impact-driven. Model bisa jadi template untuk NGO/foundation lain. Prob: 55%",               link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1458/2kzmurw1-1038" },
  { no:12, tglMasuk:"2026-04-20", sales:"Dimas",       nama:"KADIN DKI Jakarta",                                          channel:"Asosiasi",   produk:"Multi-Product / Bundle", pic:"Mahir (WKU Koordinator II Bidang Perekonomian)",          kontakInfo:"",                                  stage:"6. Proposal Formal",  tglUpdate:"2026-04-20", nextAction:"Susun whitelabel program design + deck khusus KADIN + jadwal follow-up meeting",                                               estUmkm:500,    estNilai:null,       prob:0.60, hari:3,  sla:"On Track", catatan:"Dana CSR dari anggota KADIN sebagai funding. Whitelabel AI for UMKM + MWX Academy berbranding KADIN. Replikable ke KADIN daerah. Prob: 60%", link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1438/2kzmurw1-1018" },
  { no:13, tglMasuk:"2026-04-20", sales:"Riany",       nama:"Victoria Care Indonesia",                                    channel:"Perusahaan", produk:"CreateWhiz",            pic:"Ibu Winny (VP Corporate Communication)",                 kontakInfo:"",                                  stage:"2. Outreach (Email/WA)", tglUpdate:"2026-04-20", nextAction:"Nurture relasi + kirim proposal untuk kebutuhan mendatang",                                                            estUmkm:null,   estNilai:null,       prob:0.15, hari:3,  sla:"On Track", catatan:"STALLED. Sudah punya Komunitas Pengguna & Affiliator sendiri. Tidak ada rencana agency saat ini. Keep warm untuk kebutuhan mendatang", link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1518/2kzmurw1-1098" },
  { no:14, tglMasuk:"2026-04-20", sales:"Riqsa",       nama:"Istiqlal × Voyage",                                          channel:"Komunitas",  produk:"Multi-Product / Bundle", pic:"Mas Pungkas (Dewan Pengurus Istiqlal)",                  kontakInfo:"",                                  stage:"7. Negosiasi",        tglUpdate:"2026-04-22", nextAction:"Meeting Board of Directors Istiqlal + siapkan mockup landing page berbranding Istiqlal",                                      estUmkm:null,   estNilai:null,       prob:0.65, hari:1,  sla:"On Track", catatan:"Voyage sebagai operator + Istiqlal sebagai komunitas + MWX sebagai teknologi. Whitelabel termasuk landing page khusus. Program inklusif & berbasis komunitas keumatan. Prob: 65%", link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1478/2kzmurw1-1058" },
  { no:15, tglMasuk:"2026-04-20", sales:"Riany",       nama:"Djarum × Blibli",                                            channel:"Perusahaan", produk:"Multi-Product / Bundle", pic:"Mas Tri (Corcom Djarum)",                                kontakInfo:"",                                  stage:"1. Lead/Prospek",     tglUpdate:"2026-04-20", nextAction:"Kirim proposal formal ke Djarum & Blibli untuk proses internal",                                                              estUmkm:null,   estNilai:null,       prob:0.25, hari:3,  sla:"At Risk",  catatan:"Masuk via DRP (Djarum Retail Program) & Blibli. Tema #banggabuatanindonesia. Harus via jalur internal proposal dulu. Prob: 25%", link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1498/2kzmurw1-1078" },
  { no:16, tglMasuk:"2026-04-20", sales:"Dimas",       nama:"Yayasan Astra YDBA",                                         channel:"Impact+",    produk:"SmartWhiz",             pic:"Pak Edison (Program Dept Head)",                         kontakInfo:"",                                  stage:"6. Proposal Formal",  tglUpdate:"2026-04-20", nextAction:"Follow up Pak Edison + susun konsep aktivasi offline & online untuk 1300 UMKM binaan",                                        estUmkm:1300,   estNilai:null,       prob:0.30, hari:3,  sla:"On Track", catatan:"±1300 UMKM binaan. Tidak ada CSR funding - posisi sebagai distribution partner. Eksplorasi revenue share/freemium/bundling. Introduction meeting", link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1758/2kzmurw1-1218" },
  { no:17, tglMasuk:"2026-04-22", sales:"Riany",       nama:"CEDEA",                                                      channel:"Komunitas",  produk:"Multi-Product / Bundle", pic:"Tim CEDEA",                                              kontakInfo:"",                                  stage:"3. Follow Up / Kit",  tglUpdate:"2026-04-22", nextAction:"Susun proposal 3 tier (Rp100jt/150jt/200jt) + rekomendasi lokasi workshop",                                                   estUmkm:250,    estNilai:150000000,  prob:0.40, hari:1,  sla:"On Track", catatan:"3 opsi budget. MWX kuasi & own komunitas 200-300 UMKM. Framing: Marketing/Brand Activation bukan CSR. Komunitas bisa di-reactivate. Recurring potential", link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1838/2kzmurw1-1298" },
  { no:18, tglMasuk:"2026-04-22", sales:"Dimas",       nama:"Elnusa & Gekrafs DKI Jakarta",                               channel:"Asosiasi",   produk:"SmartWhiz",             pic:"Farazandy (Komisaris Elnusa / Ketua Umum Gekrafs DKI)",   kontakInfo:"",                                  stage:"5. Demo/Presentasi",  tglUpdate:"2026-04-22", nextAction:"Susun pendekatan kerja sama via Gekrafs DKI + materi IMPACT+ untuk UMKM ekraf",                                               estUmkm:31000,  estNilai:null,       prob:0.30, hari:1,  sla:"On Track", catatan:"31.000 UMKM Jakpreneur potensial. Farazandy dual role (Elnusa+Gekrafs). Gekrafs = entry point tercepat & paling realistis. Model replikable ke asosiasi ekraf kota lain", link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1798/2kzmurw1-1258" },
  { no:19, tglMasuk:"2026-04-22", sales:"Erik Palupi", nama:"Kementerian UMKM",                                           channel:"Impact+",    produk:"Multi-Product / Bundle", pic:"Nova Zabrina (MediaWave); 4 perwakilan Kemenkop",         kontakInfo:"",                                  stage:"4. Meeting Discovery", tglUpdate:"2026-04-22", nextAction:"Diskusi form kurasi & scoring logic + koordinasi teknis integrasi database MWX × Kemenkop",                               estUmkm:null,   estNilai:null,       prob:0.50, hari:1,  sla:"On Track", catatan:"Skema integrasi database: MWX susun indikator, Kemenkop sharing data, dijait jadi joined DB. Form scoring sebagai top-of-funnel IMPACT+. Event PLUT Surakarta & Nagoya Batam", link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1778/2kzmurw1-1238" },
  { no:20, tglMasuk:"2026-04-17", sales:"Tessa",       nama:"Komunitas Karya Kami",                                       channel:"Komunitas",  produk:"SmartWhiz",             pic:"Pak Ari",                                                kontakInfo:"",                                  stage:"2. Outreach (Email/WA)", tglUpdate:"2026-04-17", nextAction:"Jadwalkan meeting offline dengan pengurus Komunitas Karya Kami di Jakarta",                                              estUmkm:1000,   estNilai:null,       prob:0.25, hari:6,  sla:"Stuck",    catatan:"",                                                                                                                                                                               link:"" },
  { no:21, tglMasuk:"2026-04-22", sales:"Regita",      nama:"BSI (Bank Syariah Indonesia)",                               channel:"Perusahaan", produk:"SmartWhiz",             pic:"Pak Nana; Pak Hadrian; Pak Bana; Bu Wien",               kontakInfo:"",                                  stage:"3. Follow Up / Kit",  tglUpdate:"2026-04-23", nextAction:"Follow up penjadwalan webinar dengan UMKM Center BSI (Aceh/Jogja/Surabaya/Makassar)",                                          estUmkm:500,    estNilai:null,       prob:0.30, hari:0,  sla:"On Track", catatan:"",                                                                                                                                                                               link:"" },
  { no:22, tglMasuk:"2026-04-23", sales:"Afif",        nama:"11thSpace (Event XLR8)",                                     channel:"Komunitas",  produk:"FinanceWhiz",           pic:"Tim 11thSpace",                                          kontakInfo:"",                                  stage:"3. Follow Up / Kit",  tglUpdate:"2026-04-23", nextAction:"Siapkan assets FAQ lengkap (PDF Whiz, video tutorial, profil MWX). Email free trial H-1 acara (02/06/2026)",                  estUmkm:8,      estNilai:null,       prob:0.65, hari:0,  sla:"On Track", catatan:"",                                                                                                                                                                               link:"" },
  { no:23, tglMasuk:"2026-04-23", sales:"Riany",       nama:"Paxel",                                                      channel:"Perusahaan", produk:"CreateWhiz",            pic:"Eldi; Mayang; Kiki (Paxel)",                             kontakInfo:"",                                  stage:"3. Follow Up / Kit",  tglUpdate:"2026-04-23", nextAction:"Susun proposal program: online training 3 bln + reward activation + pendampingan. Kirim ke Paxel untuk review",                estUmkm:25,     estNilai:50000000,   prob:0.35, hari:0,  sla:"On Track", catatan:"",                                                                                                                                                                               link:"" },
  { no:24, tglMasuk:"2026-04-23", sales:"Dimas",       nama:"Staff Khusus Presiden (SKP) Bidang UMKM & Teknologi Digital", channel:"Impact+",   produk:"Multi-Product / Bundle", pic:"Dimas Wisnu Banass (Staf SKP)",                           kontakInfo:"",                                  stage:"3. Follow Up / Kit",  tglUpdate:"2026-04-23", nextAction:"Susun whitepaper adopsi AI pada UMKM (behavior, usage, impact) + peta stakeholder pendanaan di Jawa Barat",               estUmkm:1000,   estNilai:null,       prob:0.35, hari:0,  sla:"Stuck",    catatan:"Follow-up meeting. Target awal Jabar ±1.000 UMKM. SKP butuh whitepaper sebelum komitmen. Perlu partner pembiayaan lokal. Potensi besar (akses ke kebijakan & ekosistem UMKM nasional via kantor Presiden)", link:"" },
];

const insertProspect = db.prepare(`
  INSERT INTO Prospect (id, tglMasuk, salesId, namaProspek, channel, produkFokus, kontakPIC, kontakInfo,
    stage, tglUpdateStage, nextAction, estUmkmReach, estNilaiDeal, probability,
    weightedUmkm, weightedNilai, hariDiStage, statusSLA, reasonLost, linkDokumen, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

const prospectMap = {}; // nama → id

for (const p of prospects) {
  const salesId = getSalesId(p.sales);
  if (!salesId) {
    console.log(`  ⚠ Sales not found: ${p.sales}`);
    continue;
  }
  const id = cuid();
  const wUmkm = p.estUmkm && p.prob ? p.estUmkm * p.prob : 0;
  const wNilai = p.estNilai && p.prob ? p.estNilai * p.prob : 0;

  insertProspect.run(
    id,
    p.tglMasuk,
    salesId,
    p.nama,
    p.channel,
    p.produk,
    p.pic,
    p.kontakInfo,
    p.stage,
    p.tglUpdate,
    p.nextAction,
    p.estUmkm,
    p.estNilai,
    p.prob,
    wUmkm,
    wNilai,
    p.hari,
    p.sla,
    p.catatan,
    p.link
  );
  prospectMap[p.nama.toLowerCase()] = id;
  console.log(`  + Prospect #${p.no}: ${p.nama} → ${p.sales}`);
}

// ─── 4. Seed Activity Log ──────────────────────────────────────────────────
console.log("📞 Seeding activities...");

const activities = [
  { tgl:"2026-04-07", sales:"Dimas",       tipe:"Meeting Offline",  nama:"SMESCO",                                                    pic:"Tim Bu Astika",                                                topik:"Persiapan teknis Workshop Bandung 15-16 Apr — lobi Walikota, setup peserta, materi, doorprize, logistik", nextStage:"5. Demo/Presentasi",  catatan:"Deadline TOR/undangan ke Walikota 9 Apr. Form peserta dari SMESCO H-2 (13 Apr). Eksplorasi Pandi & Road to Campus",                    link:"https://app.clickup.com/90182607745/docs/2kzmurw1-318/2kzmurw1-338" },
  { tgl:"2026-04-10", sales:"Riqsa",       tipe:"Meeting Offline",  nama:"INDOWIRA",                                                  pic:"Pak Hery (Pengurus Pusat)",                                     topik:"Introduction MWX ke INDOWIRA — ±600 anggota wirausaha aktif, familiar AI, punya program Sekolah Wirausaha",  nextStage:"3. Follow Up / Kit",  catatan:"Disepakati jadwalkan demo offline. Produk relevan: SmartWhiz, SMEwhiz, Reportwhiz untuk Sekolah Wirausaha",                            link:"https://app.clickup.com/90182607745/docs/2kzmurw1-378/2kzmurw1-398" },
  { tgl:"2026-04-14", sales:"Kreshna",     tipe:"Meeting Offline",  nama:"SMESCO",                                                    pic:"Pak Ade (SMESCO)",                                              topik:"Evaluasi konversi user, teknis whitelabel SMESCO, perencanaan Webinar Series 2 mingguan",                     nextStage:"7. Negosiasi",        catatan:"28 user bayar, ~10 aktif. Webinar Series Rabu/Kamis 10.00 Rp150-170rb. Dirut SMESCO terlibat langsung di review dashboard",           link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1078/2kzmurw1-958" },
  { tgl:"2026-04-15", sales:"Dimas",       tipe:"Demo",             nama:"SMESCO",                                                    pic:"Peserta Workshop Bandung",                                      topik:"Workshop offline MWX × SMESCO — edukasi AI + onboarding CreateWhiz ke peserta UMKM Bandung",                 nextStage:"5. Demo/Presentasi",  catatan:"Slot MWX 90 menit. Hari ke-1 dari 2 hari workshop (15-16 Apr 2026)",                                                                   link:"https://app.clickup.com/90182607745/docs/2kzmurw1-318/2kzmurw1-338" },
  { tgl:"2026-04-15", sales:"Riqsa",       tipe:"Meeting Offline",  nama:"APEKSI × Bank BTN",                                         pic:"Devy Munir (APEKSI); Dodi (EO BTN)",                            topik:"Kolaborasi pelatihan UMKM go digital via CSR Bank BTN — 98 kota anggota APEKSI, KPI 50-100 UMKM/event",      nextStage:"3. Follow Up / Kit",  catatan:"MWX sebagai penyedia AI + trainer. APEKSI susun proposal. Skema referral fee & special rate EO perlu disusun. Next: minggu ke-3 Apr",   link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1218/2kzmurw1-998" },
  { tgl:"2026-04-16", sales:"Regita",      tipe:"Meeting Offline",  nama:"InJourney",                                                  pic:"",                                                              topik:"Meeting lanjutan — pembahasan program CSR 30 UMKM binaan, 2 skema penawaran (3 bln & 6 bln) sudah dikirim",  nextStage:"6. Proposal Formal",  catatan:"FinanceWhiz sudah ada di vendor lain. Fokus ke CreateWhiz/SmartWhiz. Skema 6 bln lebih ideal untuk impact",                             link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1618/2kzmurw1-1178" },
  { tgl:"2026-04-16", sales:"Nova",        tipe:"Meeting Offline",  nama:"Kementerian UMKM",                                           pic:"Tim Kementerian UMKM",                                          topik:"Evaluasi rangkaian event onboarding UMKM di berbagai kota + roadmap event MWX × Kementerian 2026",             nextStage:"4. Meeting Discovery", catatan:"Kementerian izinkan nama mereka sebagai backing Impact Plus. Rencana MWX Academy Offline. Event Wonosobo 23-26 Apr & Surakarta minggu ke-4", link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1198/2kzmurw1-978" },
  { tgl:"2026-04-17", sales:"Dimas",       tipe:"Meeting Offline",  nama:"Pemda Lahat",                                                pic:"Mas Syauqi (Pemda Lahat)",                                      topik:"Inisiasi kolaborasi MWX × Pemda Lahat — rencana kunjungan, launching yayasan, program UMKM AI sebagai flagship", nextStage:"1. Lead/Prospek",    catatan:"Masih outline awal. Detail perlu dilengkapi setelah kunjungan ke Lahat",                                                               link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1598/2kzmurw1-1158" },
  { tgl:"2026-04-17", sales:"Regita",      tipe:"Meeting Offline",  nama:"Telkomsel",                                                  pic:"Bang Fadli; Pak Jemi Mulia (GM); Pak Kwok Wai (GM); Pak Sunam", topik:"Eksplorasi partnership produk UMKM Telkomsel — MWX isi kekosongan produk UMKM Tsel, 2 jalur paralel",      nextStage:"3. Follow Up / Kit",  catatan:"Jalur: bottom-up (Fadli+Kwok) & top-down (Sunam→Jemi). Stackez (Singtel lokal) via Bu Anna. Notes dikirim via WA 21 Apr",              link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1578/2kzmurw1-1138" },
  { tgl:"2026-04-17", sales:"Regita",      tipe:"Meeting Offline",  nama:"SNBC / Daya",                                                pic:"",                                                              topik:"Introduction meeting antara MWX dan SNBC (Daya) — penjajakan awal potensi kolaborasi",                        nextStage:"2. Outreach (Email/WA)", catatan:"Notes sangat minimal. Detail belum terdokumentasi. Initial meeting formal dengan tim Daya dijadwalkan berikutnya",                    link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1638/2kzmurw1-1198" },
  { tgl:"2026-04-20", sales:"Nova",        tipe:"Demo",             nama:"Kementerian Kebudayaan RI",                                  pic:"Wamen Giring Ganesha",                                          topik:"Presentasi FinanceWhiz, CreateWhiz, ReportWhiz ke Wamen — wacana digitalisasi Candi Plaosan & integrasi Dana Raya Indonesia", nextStage:"3. Follow Up / Kit", catatan:"MWX akan di-matching ke badan/lembaga relevan Kemendikbud. Budget Candi Plaosan via dana trustee.",             link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1538/2kzmurw1-1118" },
  { tgl:"2026-04-20", sales:"Dimas",       tipe:"Meeting Offline",  nama:"KataData Foundation",                                        pic:"Mira Hanim (Project Manager)",                                  topik:"Eksplorasi IMPACT+ via Grant Fund — program naik kelas UMKM binaan, pendanaan dari dana grant KataData Foundation", nextStage:"6. Proposal Formal", catatan:"Narasi harus impact-driven bukan komersial. Susun deck foundation-friendly + framework impact measurement. Prob: 55%",               link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1458/2kzmurw1-1038" },
  { tgl:"2026-04-20", sales:"Dimas",       tipe:"Meeting Offline",  nama:"KADIN DKI Jakarta",                                          pic:"Mahir (WKU Koordinator II)",                                    topik:"Kolaborasi IMPACT+ & whitelabel MWX Academy berbranding KADIN — CSR dari anggota KADIN sebagai sumber funding", nextStage:"6. Proposal Formal", catatan:"Whitelabel AI for UMKM + MWX Academy. Replikable ke KADIN daerah. Susun program design + deck. Prob: 60%",                             link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1438/2kzmurw1-1018" },
  { tgl:"2026-04-20", sales:"Riany",       tipe:"Meeting Offline",  nama:"Victoria Care Indonesia",                                    pic:"Ibu Winny (VP Corcom)",                                         topik:"Eksplorasi kolaborasi program pemberdayaan UMKM AI — Victoria Care sudah punya komunitas & affiliator sendiri", nextStage:"2. Outreach (Email/WA)", catatan:"STALLED. Tidak ada rencana agency saat ini. Keep warm. Kirim proposal untuk kebutuhan mendatang.",                                 link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1518/2kzmurw1-1098" },
  { tgl:"2026-04-20", sales:"Dimas",       tipe:"Meeting Offline",  nama:"Istiqlal × Voyage",                                          pic:"Mas Pungkas (Dewan Pengurus Istiqlal)",                          topik:"Kolaborasi whitelabel program UMKM AI — Voyage sebagai operator + Istiqlal sebagai komunitas + MWX sebagai teknologi", nextStage:"7. Negosiasi",    catatan:"Whitelabel + landing page branding Istiqlal. Program inklusif & berbasis komunitas keumatan. Meeting BoD dijadwalkan 22 Apr.",          link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1478/2kzmurw1-1058" },
  { tgl:"2026-04-20", sales:"Riany",       tipe:"Meeting Offline",  nama:"Djarum × Blibli",                                            pic:"Mas Tri (Corcom Djarum)",                                       topik:"Eksplorasi kolaborasi UMKM AI via DRP (Djarum Retail Program) dan Blibli — tema #banggabuatanindonesia",      nextStage:"1. Lead/Prospek",     catatan:"Harus kirim proposal formal dulu sebelum bisa meeting teknis. Entry via jalur internal. Prob: 25%",                                     link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1498/2kzmurw1-1078" },
  { tgl:"2026-04-20", sales:"Dimas",       tipe:"Meeting Offline",  nama:"Yayasan Astra YDBA",                                         pic:"Pak Edison (Program Dept Head); Ibu Ema; Pak Agung",            topik:"Introduction — sosialisasi IMPACT+ ke ±1.300 UMKM binaan YDBA, terbuka untuk aktivasi offline & online",     nextStage:"2. Outreach (Email/WA)", catatan:"Tidak ada CSR funding. Posisi YDBA: distribution partner. Eksplorasi revenue share/freemium/bundling.",                            link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1758/2kzmurw1-1218" },
  { tgl:"2026-04-22", sales:"Riany",       tipe:"Meeting Offline",  nama:"CEDEA",                                                      pic:"Tim CEDEA",                                                     topik:"Eksplorasi komunitas UMKM 200-300 orang via workshop offline — MWX kuasi & own komunitas untuk jangka panjang", nextStage:"3. Follow Up / Kit", catatan:"3 tier budget: Rp100jt/150jt/200jt. Framing: Marketing/Brand Activation bukan CSR. Komunitas bisa di-reactivate recurring",           link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1838/2kzmurw1-1298" },
  { tgl:"2026-04-22", sales:"Dimas",       tipe:"Meeting Offline",  nama:"Elnusa & Gekrafs DKI Jakarta",                               pic:"Farazandy (Komisaris Elnusa / Ketua Gekrafs DKI)",              topik:"Eksplorasi IMPACT+ via Gekrafs DKI sebagai channel edukasi AI untuk 31.000 UMKM Jakpreneur",                   nextStage:"2. Outreach (Email/WA)", catatan:"Farazandy dual role. Gekrafs = entry point tercepat. Model replikable ke asosiasi ekraf kota lain",                                  link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1798/2kzmurw1-1258" },
  { tgl:"2026-04-22", sales:"Regita",      tipe:"Meeting Offline",  nama:"Kementerian UMKM",                                           pic:"Nova Zabrina (MediaWave); 4 perwakilan Kemenkop",               topik:"Meeting lanjutan — skema integrasi database MWX × Kemenkop, form scoring kurasi UMKM siap digitalisasi",     nextStage:"4. Meeting Discovery", catatan:"Joined database MWX+Kemenkop. Form scoring = top-of-funnel IMPACT+. Event PLUT Surakarta & Nagoya Batam sebagai activation point",   link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1778/2kzmurw1-1238" },
  { tgl:"2026-04-22", sales:"Dimas",       tipe:"Meeting Offline",  nama:"Istiqlal × Voyage",                                          pic:"Board of Directors Istiqlal",                                   topik:"Meeting lanjutan dengan BoD Istiqlal — pembahasan teknis whitelabel dan konfirmasi arah kolaborasi",            nextStage:"7. Negosiasi",        catatan:"Follow-up dari meeting 20 Apr. Mockup landing page perlu siap sebelum/sesaat setelah meeting ini",                                     link:"https://app.clickup.com/90182607745/docs/2kzmurw1-1478/2kzmurw1-1058" },
  { tgl:"2026-04-17", sales:"Tessa",       tipe:"Meeting Online",   nama:"Komunitas Karya Kami",                                       pic:"Pak Ari",                                                       topik:"Introduction MWX ke Komunitas Karya Kami — ±1.000 anggota aktif Indonesia, secara aktif menyelenggarakan program pelatihan", nextStage:"2. Outreach (Email/WA)", catatan:"Next: jadwalkan pertemuan offline dengan pengurus di Jakarta",                                                    link:"" },
  { tgl:"2026-04-22", sales:"Regita",      tipe:"Meeting Offline",  nama:"BSI (Bank Syariah Indonesia)",                               pic:"Pak Nana; Pak Hadrian; Pak Bana; Bu Wien",                      topik:"Penjajakan kolaborasi program UMKM — BSI punya 5.000 UMKM binaan + UMKM Center di Aceh/Jogja/Surabaya/Makassar", nextStage:"2. Outreach (Email/WA)", catatan:"FU untuk webinar dengan UMKM Center BSI. Skala program perlu disesuaikan dengan keterbatasan Ziswaf",                       link:"" },
  { tgl:"2026-04-23", sales:"Afif",        tipe:"Meeting Online",   nama:"11thSpace (Event XLR8)",                                     pic:"Tim 11thSpace",                                                 topik:"MWX masuk batch 7 XLR8 tanggal 03/06/2026 — event offline di Kedoya, intimate 7-8 user. Fokus FinanceWhiz sesuai tema literasi keuangan bisnis", nextStage:"3. Follow Up / Kit", catatan:"Siapkan assets FAQ: PDF hasil Whiz, video tutorial, profile MWX Market/Academy, link terkait. Email free trial H-1 acara", link:"" },
  { tgl:"2026-04-23", sales:"Riany",       tipe:"Meeting Offline",  nama:"Paxel",                                                      pic:"Eldi; Mayang; Kiki (Paxel)",                                    topik:"Kolaborasi program pemberdayaan UMKM berbasis AI — reward program untuk 20-30 UMKM top users Paxel. Format: online training 3 bln + offline 1 hari.", nextStage:"3. Follow Up / Kit", catatan:"Budget maks Rp50jt. MWX susun proposal. Paxel tentukan shortlist UMKM & kaji alokasi budget", link:"" },
  { tgl:"2026-04-23", sales:"Dimas",       tipe:"Meeting Online",   nama:"Staff Khusus Presiden (SKP) Bidang UMKM & Teknologi Digital", pic:"Dimas Wisnu Banass (Staf SKP Bidang UMKM & Teknologi Digital)", topik:"Follow-up meeting pendalaman kolaborasi IMPACT+ — fokus wilayah Jawa Barat, target ±1.000 UMKM. SKP butuh whitepaper perilaku adopsi AI pada UMKM sebelum keputusan kolaborasi", nextStage:"3. Follow Up / Kit", catatan:"Challenge: butuh whitepaper data & insight kuat + pemetaan partner pembiayaan lokal di Jabar", link:"" },
];

const insertActivity = db.prepare(`
  INSERT INTO Activity (id, tanggal, salesId, prospectId, tipeAktivitas, namaProspek, pic, topikHasil, nextStage, catatan, linkMOM, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

for (const a of activities) {
  const salesId = getSalesId(a.sales);
  if (!salesId) { console.log(`  ⚠ Sales not found: ${a.sales}`); continue; }

  // Try to link to prospect
  const prospectId = prospectMap[a.nama.toLowerCase()] || null;

  insertActivity.run(
    cuid(),
    a.tgl,
    salesId,
    prospectId,
    a.tipe,
    a.nama,
    a.pic,
    a.topik,
    a.nextStage,
    a.catatan,
    a.link
  );
  console.log(`  + Activity: ${a.tgl} | ${a.sales} | ${a.nama}`);
}

db.close();
console.log("\n✅ Seed selesai!");
console.log("   Prospects:", prospects.length);
console.log("   Activities:", activities.length);
console.log("   Sales users seeded with password: sales123");
