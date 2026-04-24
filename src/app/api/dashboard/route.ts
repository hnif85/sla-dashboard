import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { Prisma } from "@prisma/client";

function isDatabaseUnreachable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P1001";
  }

  return (error as { code?: unknown } | null)?.code === "P1001";
}

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = session.role === "sales" ? { salesId: session.userId } : {};

  try {
    const [prospects, activities, config, funnelStages] = await Promise.all([
      prisma.prospect.findMany({ where, include: { sales: { select: { name: true } } } }),
      prisma.activity.findMany({
        where,
        orderBy: { tanggal: "desc" },
        take: 10,
        include: { sales: { select: { name: true } } },
      }),
      prisma.config.findMany(),
      prisma.funnelStage.findMany(),
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
    const prospectsWithSLA = prospects.map((p) => ({
      ...p,
      statusSLA: computeSLA(p.stage, new Date(p.tglUpdateStage)),
    }));

    const configMap = Object.fromEntries(config.map((c: { key: string; value: string }) => [c.key, c.value])) as Record<
      string,
      string
    >;
    const northstar = parseInt(configMap.target_northstar_nasional || "100000");
    const targetPerSales = parseInt(configMap.target_per_sales_bulan || "2000");

    const isClosedWon = (s: string) => s === "9. Deal/Closed Won";
    const isClosed = (s: string) => s.includes("Closed");
    const closedWon = prospectsWithSLA.filter((p) => isClosedWon(p.stage));
    const totalUmkmClosed = closedWon.reduce((s, p) => s + (p.estUmkmReach || 0), 0);
    const openProspects = prospectsWithSLA.filter((p) => !isClosed(p.stage));

    const stageCount = prospectsWithSLA.reduce(
      (acc: Record<string, number>, p) => {
        acc[p.stage] = (acc[p.stage] || 0) + 1;
        return acc;
      },
      {}
    );

    const slaStatus = openProspects.reduce(
      (acc: Record<string, number>, p) => {
        acc[p.statusSLA] = (acc[p.statusSLA] || 0) + 1;
        return acc;
      },
      {}
    );

    const salesPerf = prospectsWithSLA.reduce(
      (acc: Record<string, { name: string; closed: number; pipeline: number; total: number; onTrack: number; atRisk: number; overdue: number }>, p) => {
        const name = p.sales.name;
        if (!acc[name]) acc[name] = { name, closed: 0, pipeline: 0, total: 0, onTrack: 0, atRisk: 0, overdue: 0 };
        if (isClosedWon(p.stage)) {
          acc[name].closed += p.estUmkmReach || 0;
        } else if (!isClosed(p.stage)) {
          acc[name].pipeline += Number(p.weightedUmkm) || 0;
          if (p.statusSLA === "On Track") acc[name].onTrack += 1;
          else if (p.statusSLA === "At Risk") acc[name].atRisk += 1;
          else if (p.statusSLA === "Overdue") acc[name].overdue += 1;
        }
        acc[name].total += 1;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      summary: {
        totalUmkmClosed,
        northstarPct: totalUmkmClosed / northstar,
        totalPipelineOpen: openProspects.length,
        weightedPipeline: openProspects.reduce((s, p) => s + (Number(p.weightedUmkm) || 0), 0),
        targetPerSales,
      },
      stageCount,
      slaStatus,
      recentActivities: activities,
      salesPerformance: Object.values(salesPerf),
    });
  } catch (error) {
    console.error("[api/dashboard] failed", error);

    if (isDatabaseUnreachable(error)) {
      return NextResponse.json(
        {
          error: "Database unreachable",
          code: "P1001",
          hint: "Check DATABASE_URL and ensure your database is running/reachable from this machine.",
        },
        { status: 503, headers: { "Retry-After": "5" } }
      );
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
