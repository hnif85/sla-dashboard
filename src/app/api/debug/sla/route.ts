import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCachedFunnelStages } from "@/lib/server-cache";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const funnelStages = await getCachedFunnelStages();
    const stageMap = Object.fromEntries(funnelStages.map((s) => [s.name, s]));

    const prospectWhere = session.role === "sales"
      ? { salesId: session.userId, deletedAt: null }
      : { deletedAt: null };

    const prospects = await prisma.prospect.findMany({
      where: prospectWhere,
      select: {
        id: true,
        namaProspek: true,
        stage: true,
        tglUpdateStage: true,
      },
    });

    const isClosed = (s: string) => s.includes("Closed");

    const computeSLA = (stage: string, tglUpdate: Date | null) => {
      if (isClosed(stage)) return "Closed";
      if (!tglUpdate) return "Unknown";
      const days = Math.floor((Date.now() - new Date(tglUpdate).getTime()) / 86400000);
      const slaMax = stageMap[stage]?.slaMax ?? 7;
      if (days <= slaMax * 0.5) return "On Track";
      if (days <= slaMax) return "At Risk";
      return "Overdue";
    };

    const details: Record<string, { count: number; prospects: { nama: string; stage: string; hari: number; slaMax: number }[] }> = {
      "On Track": { count: 0, prospects: [] },
      "At Risk": { count: 0, prospects: [] },
      "Overdue": { count: 0, prospects: [] },
      "Closed": { count: 0, prospects: [] },
      "Unknown": { count: 0, prospects: [] },
    };

    for (const p of prospects) {
      const status = computeSLA(p.stage, p.tglUpdateStage);
      const days = p.tglUpdateStage
        ? Math.floor((Date.now() - new Date(p.tglUpdateStage).getTime()) / 86400000)
        : -1;
      const slaMax = stageMap[p.stage]?.slaMax ?? 7;

      details[status].count += 1;
      details[status].prospects.push({
        nama: p.namaProspek,
        stage: p.stage,
        hari: days,
        slaMax,
      });
    }

    return NextResponse.json({
      totalProspects: prospects.length,
      funnelStages: Object.fromEntries(
        Object.entries(stageMap).map(([k, v]) => [k, v.slaMax])
      ),
      summary: {
        onTrack: details["On Track"].count,
        atRisk: details["At Risk"].count,
        overdue: details["Overdue"].count,
        closed: details["Closed"].count,
        unknown: details["Unknown"].count,
      },
      details,
    });
  } catch (error) {
    console.error("[debug/sla] failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}