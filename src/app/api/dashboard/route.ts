import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = session.role === "sales" ? { salesId: session.userId } : {};

  const [prospects, activities, config] = await Promise.all([
    prisma.prospect.findMany({ where, include: { sales: { select: { name: true } } } }),
    prisma.activity.findMany({ where, orderBy: { tanggal: "desc" }, take: 10, include: { sales: { select: { name: true } } } }),
    prisma.config.findMany(),
  ]);

  const configMap = Object.fromEntries(config.map((c) => [c.key, c.value]));
  const northstar = parseInt(configMap.target_northstar_nasional || "100000");
  const targetPerSales = parseInt(configMap.target_per_sales_bulan || "2000");

  const closedWon = prospects.filter((p) => p.stage === "7. Closed Won");
  const totalUmkmClosed = closedWon.reduce((s, p) => s + (p.estUmkmReach || 0), 0);
  const openProspects = prospects.filter((p) => !p.stage.includes("Closed"));

  const stageCount = prospects.reduce(
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

  const salesPerf = prospects.reduce(
    (acc: Record<string, { name: string; closed: number; pipeline: number; total: number }>, p) => {
      const name = p.sales.name;
      if (!acc[name]) acc[name] = { name, closed: 0, pipeline: 0, total: 0 };
      if (p.stage === "7. Closed Won") acc[name].closed += p.estUmkmReach || 0;
      else if (!p.stage.includes("Closed")) acc[name].pipeline += p.weightedUmkm || 0;
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
      weightedPipeline: openProspects.reduce((s, p) => s + (p.weightedUmkm || 0), 0),
      targetPerSales,
    },
    stageCount,
    slaStatus,
    recentActivities: activities,
    salesPerformance: Object.values(salesPerf),
  });
}
