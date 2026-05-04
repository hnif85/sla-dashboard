import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCachedFunnelStages, getCachedConfig } from "@/lib/server-cache";
import { getSessionFromRequest } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { subDays, startOfDay } from "date-fns";

function isDatabaseUnreachable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code === "P1001";
  return (error as { code?: unknown } | null)?.code === "P1001";
}

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prospectWhere = session.role === "sales"
    ? { salesId: session.userId, deletedAt: null }
    : { deletedAt: null };

  const activityWhere = session.role === "sales"
    ? { salesId: session.userId }
    : {};

  try {
    // Prospects: select only fields needed for aggregation (no large text fields)
    const [prospects, activities, funnelStages, config] = await Promise.all([
      prisma.prospect.findMany({
        where: prospectWhere,
        select: {
          stage: true,
          tglUpdateStage: true,
          estUmkmReach: true,
          weightedUmkm: true,
          salesId: true,
          sales: { select: { name: true } },
        },
      }),
      prisma.activity.findMany({
        where: activityWhere,
        orderBy: { tanggal: "desc" },
        take: 10,
        select: {
          id: true,
          tanggal: true,
          tipeAktivitas: true,
          namaProspek: true,
          topikHasil: true,
          sales: { select: { name: true } },
          prospect: { select: { namaProspek: true } },
        },
      }),
      getCachedFunnelStages(),
      getCachedConfig(),
    ]);

    const stageMap = Object.fromEntries(funnelStages.map((s) => [s.name, s]));

    const computeSLA = (stage: string, tglUpdate: Date) => {
      if (stage.includes("Closed")) return "Closed";
      const days = Math.floor((Date.now() - tglUpdate.getTime()) / 86400000);
      const slaMax = stageMap[stage]?.slaMax ?? 7;
      if (days <= slaMax * 0.5) return "On Track";
      if (days <= slaMax) return "At Risk";
      return "Overdue";
    };

    const configMap = Object.fromEntries(config.map((c) => [c.key, c.value]));
    const northstar = parseInt(configMap.target_northstar_nasional || "100000");
    const targetPerSales = parseInt(configMap.target_per_sales_bulan || "2000");

    const isClosedWon = (s: string) => s === "9. Deal/Closed Won";
    const isClosed = (s: string) => s.includes("Closed");

    let totalUmkmClosed = 0;
    let weightedPipeline = 0;
    let totalPipelineOpen = 0;
    const stageCount: Record<string, number> = {};
    const slaStatus: Record<string, number> = {};
    const salesPerf: Record<string, {
      name: string; closed: number; pipeline: number; total: number;
      onTrack: number; atRisk: number; overdue: number;
    }> = {};

    for (const p of prospects) {
      const sl = computeSLA(p.stage, new Date(p.tglUpdateStage));
      const name = p.sales.name;
      stageCount[p.stage] = (stageCount[p.stage] || 0) + 1;

      if (!salesPerf[name]) salesPerf[name] = { name, closed: 0, pipeline: 0, total: 0, onTrack: 0, atRisk: 0, overdue: 0 };
      salesPerf[name].total += 1;

      if (isClosedWon(p.stage)) {
        totalUmkmClosed += p.estUmkmReach || 0;
        salesPerf[name].closed += p.estUmkmReach || 0;
      } else if (!isClosed(p.stage)) {
        totalPipelineOpen += 1;
        weightedPipeline += Number(p.weightedUmkm) || 0;
        slaStatus[sl] = (slaStatus[sl] || 0) + 1;
        salesPerf[name].pipeline += Number(p.weightedUmkm) || 0;
        if (sl === "On Track") salesPerf[name].onTrack += 1;
        else if (sl === "At Risk") salesPerf[name].atRisk += 1;
        else if (sl === "Overdue") salesPerf[name].overdue += 1;
      }
    }

    // ── Weekly Summary (admin only) ──────────────────────────────────────────
    let weeklySummary = null;
    if (session.role === "admin") {
      const weekStart = startOfDay(subDays(new Date(), 6)); // last 7 days inclusive

      const [weekActivities, weekProspects, weekHistory] = await Promise.all([
        prisma.activity.findMany({
          where: { tanggal: { gte: weekStart } },
          select: {
            id: true,
            tipeAktivitas: true,
            namaProspek: true,
            tanggal: true,
            topikHasil: true,
            sales: { select: { name: true } },
          },
        }),
        prisma.prospect.findMany({
          where: { createdAt: { gte: weekStart }, deletedAt: null },
          select: {
            id: true,
            namaProspek: true,
            stage: true,
            createdAt: true,
            sales: { select: { name: true } },
          },
        }),
        prisma.pipelineHistory.findMany({
          where: { changedAt: { gte: weekStart }, fieldName: "Stage" },
          select: {
            id: true,
            prospectId: true,
            oldValue: true,
            newValue: true,
            changedAt: true,
            changedBy: { select: { name: true } },
            prospect: { select: { namaProspek: true } },
          },
        }),
      ]);

      // Activities by type
      const byType: Record<string, number> = {};
      const bySales: Record<string, number> = {};
      for (const a of weekActivities) {
        const t = a.tipeAktivitas || "Lainnya";
        byType[t] = (byType[t] || 0) + 1;
        const s = a.sales.name;
        bySales[s] = (bySales[s] || 0) + 1;
      }

      // Closed Won this week
      const closedWonThisWeek = weekHistory.filter(
        (h) => h.newValue === "9. Deal/Closed Won"
      );

      weeklySummary = {
        weekStart: weekStart.toISOString(),
        totalActivities: weekActivities.length,
        newProspects: weekProspects.length,
        stageChanges: weekHistory.length,
        closedWon: closedWonThisWeek.length,
        activitiesByType: Object.entries(byType)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => ({ type, count })),
        activitiesBySales: Object.entries(bySales)
          .sort(([, a], [, b]) => b - a)
          .map(([name, count]) => ({ name, count })),
        recentClosedWon: closedWonThisWeek.slice(0, 5).map((h) => ({
          prospectName: h.prospect?.namaProspek || "-",
          salesName: h.changedBy?.name || "-",
          changedAt: h.changedAt,
        })),
        recentNewProspects: weekProspects.slice(0, 5).map((p) => ({
          namaProspek: p.namaProspek,
          stage: p.stage,
          salesName: p.sales.name,
          createdAt: p.createdAt,
        })),
      };
    }

    return NextResponse.json({
      summary: {
        totalUmkmClosed,
        northstarPct: totalUmkmClosed / northstar,
        totalPipelineOpen,
        weightedPipeline,
        targetPerSales,
      },
      stageCount,
      slaStatus,
      recentActivities: activities,
      salesPerformance: Object.values(salesPerf),
      weeklySummary,
    });
  } catch (error) {
    console.error("[api/dashboard] failed", error);
    if (isDatabaseUnreachable(error)) {
      return NextResponse.json(
        { error: "Database unreachable", code: "P1001", hint: "Check DATABASE_URL." },
        { status: 503, headers: { "Retry-After": "5" } }
      );
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
