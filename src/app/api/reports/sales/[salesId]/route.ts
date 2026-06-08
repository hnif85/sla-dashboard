import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCachedFunnelStages } from "@/lib/server-cache";
import { getSessionFromRequest } from "@/lib/auth";
import { differenceInDays, subDays, startOfDay, format } from "date-fns";

function computeSLAStatus(stage: string, effectiveDate: Date, slaMax: number): string {
  if (stage.includes("Closed")) return "Closed";
  const days = differenceInDays(new Date(), effectiveDate);
  if (days <= slaMax * 0.5) return "On Track";
  if (days <= slaMax) return "At Risk";
  return "Overdue";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salesId: string }> }
) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { salesId } = await params;

  // Sales hanya bisa akses laporan dirinya sendiri
  if (session.role === "sales" && session.userId !== salesId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Trainer & CRM tidak punya akses
  if (session.role === "trainer" || session.role === "crm") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse query params untuk filter activity chart
  const url = new URL(req.url);
  const activityDays = parseInt(url.searchParams.get("days") || "30");
  const chartFrom = startOfDay(subDays(new Date(), activityDays - 1));

  try {
    // Load user info, funnel stages, dan semua data paralel
    const [salesUser, funnelStages, prospects, activities, moms, stageHistory] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: salesId },
          select: { id: true, name: true, region: true, role: true, active: true },
        }),
        getCachedFunnelStages(),
        prisma.prospect.findMany({
          where: { salesId, deletedAt: null },
          select: {
            id: true,
            namaProspek: true,
            channel: true,
            produkFokus: true,
            stage: true,
            tglMasuk: true,
            tglUpdateStage: true,
            estUmkmReach: true,
            estNilaiDeal: true,
            probability: true,
            weightedUmkm: true,
            statusSLA: true,
            reasonLost: true,
            activities: {
              select: { tanggal: true },
              orderBy: { tanggal: "desc" },
              take: 1,
            },
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.activity.findMany({
          where: { salesId },
          select: {
            id: true,
            tanggal: true,
            tipeAktivitas: true,
            namaProspek: true,
            topikHasil: true,
            catatan: true,
            nextStage: true,
            prospectId: true,
            prospect: { select: { id: true, namaProspek: true } },
          },
          orderBy: { tanggal: "desc" },
        }),
        prisma.mOM.findMany({
          where: { salesId },
          select: {
            id: true,
            title: true,
            tanggal: true,
            prospectId: true,
            prospect: { select: { namaProspek: true } },
            participants: true,
            agenda: true,
          },
          orderBy: { tanggal: "desc" },
          take: 20,
        }),
        prisma.pipelineHistory.findMany({
          where: { changedById: salesId, fieldName: "Stage" },
          select: {
            id: true,
            changedAt: true,
            oldValue: true,
            newValue: true,
            notes: true,
            prospect: { select: { id: true, namaProspek: true } },
          },
          orderBy: { changedAt: "desc" },
          take: 100,
        }),
      ]);

    if (!salesUser) {
      return NextResponse.json({ error: "Sales not found" }, { status: 404 });
    }

    const stageMap = Object.fromEntries(funnelStages.map((s) => [s.name, s]));
    if (stageMap["3. Follow Up / Kit"]) stageMap["3. Follow Up"] = stageMap["3. Follow Up / Kit"];
    if (stageMap["3. Follow Up"] && !stageMap["3. Follow Up / Kit"]) stageMap["3. Follow Up / Kit"] = stageMap["3. Follow Up"];
    const isClosedWon = (s: string) => s === "9. Deal/Closed Won";
    const isClosedLost = (s: string) => s === "10. Closed Lost";
    const isClosed = (s: string) => s.includes("Closed");

    // ── Summary ─────────────────────────────────────────────────────────────
    let closedWonUmkm = 0;
    let closedLostCount = 0;
    let activePipelineCount = 0;
    let weightedPipelineTotal = 0;
    let closedWonCount = 0;

    const activePipelineList: {
      id: string;
      namaProspek: string;
      stage: string;
      statusSLA: string;
      hariDiStage: number;
      estUmkmReach: number | null;
      estNilaiDeal: number | null;
      probability: number | null;
      weightedUmkm: number | null;
      tglUpdateStage: Date;
      channel: string | null;
      produkFokus: string | null;
    }[] = [];

    const overdueProspects: {
      id: string;
      namaProspek: string;
      stage: string;
      hariDiStage: number;
      statusSLA: string;
    }[] = [];

    const slaCount = { onTrack: 0, atRisk: 0, overdue: 0 };

    // Funnel stage count
    const stageDist: Record<string, number> = {};

    for (const p of prospects) {
      const lastActivity = p.activities[0]?.tanggal;
      const effectiveDate =
        lastActivity && new Date(lastActivity) > new Date(p.tglUpdateStage)
          ? new Date(lastActivity)
          : new Date(p.tglUpdateStage);

      const slaMax = stageMap[p.stage]?.slaMax ?? 7;
      const statusSLA = computeSLAStatus(p.stage, effectiveDate, slaMax);
      const hariDiStage = differenceInDays(new Date(), effectiveDate);

      const normStage = p.stage === "3. Follow Up / Kit" ? "3. Follow Up" : p.stage;
      stageDist[normStage] = (stageDist[normStage] || 0) + 1;

      if (isClosedWon(p.stage)) {
        closedWonUmkm += p.estUmkmReach || 0;
        closedWonCount += 1;
      } else if (isClosedLost(p.stage)) {
        closedLostCount += 1;
      } else {
        activePipelineCount += 1;
        weightedPipelineTotal += Number(p.weightedUmkm) || 0;

        activePipelineList.push({
          id: p.id,
          namaProspek: p.namaProspek,
          stage: p.stage,
          statusSLA,
          hariDiStage,
          estUmkmReach: p.estUmkmReach,
          estNilaiDeal: p.estNilaiDeal,
          probability: p.probability,
          weightedUmkm: p.weightedUmkm,
          tglUpdateStage: effectiveDate,
          channel: p.channel,
          produkFokus: p.produkFokus,
        });

        if (statusSLA === "On Track") slaCount.onTrack += 1;
        else if (statusSLA === "At Risk") slaCount.atRisk += 1;
        else if (statusSLA === "Overdue") {
          slaCount.overdue += 1;
          overdueProspects.push({ id: p.id, namaProspek: p.namaProspek, stage: p.stage, hariDiStage, statusSLA });
        }
      }
    }

    const totalProspects = prospects.length;
    const totalClosed = closedWonCount + closedLostCount;
    const winRate = totalClosed > 0 ? closedWonCount / totalClosed : 0;
    const avgDealSize = closedWonCount > 0 ? closedWonUmkm / closedWonCount : 0;

    // At risk list for SLA section
    const atRiskProspects = activePipelineList
      .filter((p) => p.statusSLA === "At Risk")
      .map((p) => ({ id: p.id, namaProspek: p.namaProspek, stage: p.stage, hariDiStage: p.hariDiStage, statusSLA: p.statusSLA }));

    // ── Funnel Conversion ───────────────────────────────────────────────────
    const funnelConversion = funnelStages.map((fs) => ({
      stage: fs.name,
      order: fs.order,
      count: stageDist[fs.name] || 0,
      convRateTarget: fs.convRateTarget,
      pctOfTotal: totalProspects > 0 ? ((stageDist[fs.name] || 0) / totalProspects) : 0,
    })).sort((a, b) => a.order - b.order);

    // ── Activity Growth Chart (Cumulative) ──────────────────────────────────
    // All activity types ever used by this sales
    const normalizeType = (t: string) => t === "WA/Call" ? "Follow Up" : t;
    const allTypes = [...new Set(activities.map((a) => normalizeType(a.tipeAktivitas || "Lainnya")))];

    // Baseline: count of each type BEFORE chartFrom (activities older than window)
    const baseline: Record<string, number> = {};
    for (const type of allTypes) baseline[type] = 0;
    for (const a of activities) {
      if (new Date(a.tanggal) < chartFrom) {
        const type = a.tipeAktivitas || "Lainnya";
        baseline[type] = (baseline[type] || 0) + 1;
      }
    }

    // Build per-day delta map for the window
    const deltaMap: Record<string, Record<string, number>> = {};
    for (let i = 0; i < activityDays; i++) {
      const d = format(subDays(new Date(), activityDays - 1 - i), "yyyy-MM-dd");
      deltaMap[d] = {};
    }
    for (const a of activities) {
      const aDate = new Date(a.tanggal);
      if (aDate < chartFrom) continue;
      const day = format(aDate, "yyyy-MM-dd");
      if (!deltaMap[day]) continue; // outside window
      const type = normalizeType(a.tipeAktivitas || "Lainnya");
      deltaMap[day][type] = (deltaMap[day][type] || 0) + 1;
    }

    // Build cumulative — running total per type across the window
    const running: Record<string, number> = { ...baseline };
    const activityGrowth = Object.entries(deltaMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, delta]) => {
        for (const type of allTypes) {
          running[type] = (running[type] || 0) + (delta[type] || 0);
        }
        const point: Record<string, string | number> = { date };
        let total = 0;
        for (const type of allTypes) {
          point[type] = running[type];
          total += running[type];
        }
        point.total = total;
        return point;
      });

    // ── Timeline (30 hari terakhir) ──────────────────────────────────────────
    const timelineFrom = startOfDay(subDays(new Date(), 29));

    type TimelineItem = {
      type: "activity" | "stage_change" | "mom";
      date: string;
      label: string;
      detail: string;
      prospectId?: string | null;
      prospectName?: string | null;
      linkId?: string;
    };

    const timelineItems: TimelineItem[] = [];

    // Activities in last 30 days
    for (const a of activities) {
      if (new Date(a.tanggal) < timelineFrom) continue;
      timelineItems.push({
        type: "activity",
        date: a.tanggal instanceof Date ? a.tanggal.toISOString() : String(a.tanggal),
        label: a.tipeAktivitas || "Aktivitas",
        detail: a.topikHasil || a.catatan || a.namaProspek || "",
        prospectId: a.prospectId,
        prospectName: a.prospect?.namaProspek || a.namaProspek,
        linkId: a.id,
      });
    }

    // Stage changes in last 30 days
    for (const h of stageHistory) {
      if (new Date(h.changedAt) < timelineFrom) continue;
      timelineItems.push({
        type: "stage_change",
        date: h.changedAt instanceof Date ? h.changedAt.toISOString() : String(h.changedAt),
        label: "Perubahan Stage",
        detail: `${h.oldValue || "?"} → ${h.newValue || "?"}`,
        prospectId: h.prospect?.id,
        prospectName: h.prospect?.namaProspek,
        linkId: h.id,
      });
    }

    // MOMs in last 30 days
    for (const m of moms) {
      if (new Date(m.tanggal) < timelineFrom) continue;
      timelineItems.push({
        type: "mom",
        date: m.tanggal instanceof Date ? m.tanggal.toISOString() : String(m.tanggal),
        label: "MOM",
        detail: m.title,
        prospectId: m.prospectId,
        prospectName: m.prospect?.namaProspek,
        linkId: m.id,
      });
    }

    timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // ── Recent Activities (all, for detail section) ──────────────────────────
    const activitiesFormatted = activities.slice(0, 50).map((a) => ({
      id: a.id,
      tanggal: a.tanggal,
      tipeAktivitas: a.tipeAktivitas,
      namaProspek: a.namaProspek || a.prospect?.namaProspek,
      topikHasil: a.topikHasil,
      catatan: a.catatan,
      prospectId: a.prospectId,
    }));

    return NextResponse.json({
      salesInfo: salesUser,
      summary: {
        totalProspects,
        closedWonCount,
        closedWonUmkm,
        closedLostCount,
        activePipelineCount,
        weightedPipeline: weightedPipelineTotal,
        winRate,
        avgDealSize,
      },
      funnelConversion,
      slaHealth: {
        ...slaCount,
        overdueProspects,
        atRiskProspects,
      },
      activePipeline: activePipelineList,
      activityGrowth,
      activityTypes: allTypes,
      activityChartDays: activityDays,
      recentActivities: activitiesFormatted,
      moms: moms.slice(0, 10).map((m) => ({
        id: m.id,
        title: m.title,
        tanggal: m.tanggal,
        prospectId: m.prospectId,
        prospectName: m.prospect?.namaProspek,
        participants: m.participants,
        agenda: m.agenda,
      })),
      timeline: timelineItems.slice(0, 60),
    });
  } catch (error) {
    console.error("[api/reports/sales] failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
