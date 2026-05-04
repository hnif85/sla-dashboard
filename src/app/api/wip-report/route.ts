import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: "dateFrom and dateTo are required" }, { status: 400 });
  }

  const from = new Date(dateFrom);
  const to = new Date(dateTo + "T23:59:59.999Z");
  const isAdmin = session.role === "admin";
  const byOwner = isAdmin ? {} : { salesId: session.userId };
  const byChanger = isAdmin ? {} : { changedById: session.userId };

  const [activities, newProspects, stageChanges, moms] = await Promise.all([
    prisma.activity.findMany({
      where: { ...byOwner, tanggal: { gte: from, lte: to } },
      select: {
        id: true,
        tipeAktivitas: true,
        namaProspek: true,
        topikHasil: true,
        tanggal: true,
        sales: { select: { name: true } },
        prospect: { select: { id: true, namaProspek: true } },
      },
      orderBy: { tanggal: "desc" },
    }),

    prisma.prospect.findMany({
      where: { ...byOwner, deletedAt: null, createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        namaProspek: true,
        channel: true,
        stage: true,
        estUmkmReach: true,
        probability: true,
        createdAt: true,
        sales: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.pipelineHistory.findMany({
      where: { ...byChanger, fieldName: "Stage", changedAt: { gte: from, lte: to } },
      select: {
        id: true,
        oldValue: true,
        newValue: true,
        changedAt: true,
        notes: true,
        changedBy: { select: { name: true } },
        prospect: { select: { id: true, namaProspek: true } },
      },
      orderBy: { changedAt: "desc" },
    }),

    prisma.mOM.findMany({
      where: { ...byOwner, tanggal: { gte: from, lte: to } },
      select: {
        id: true,
        title: true,
        tanggal: true,
        participants: true,
        decisions: true,
        actionItems: true,
        sales: { select: { name: true } },
        prospect: { select: { id: true, namaProspek: true } },
      },
      orderBy: { tanggal: "desc" },
    }),
  ]);

  // Build activities matrix: salesName → tipeAktivitas → count
  const activitiesMatrix: Record<string, Record<string, number>> = {};
  for (const a of activities) {
    const s = a.sales.name;
    const t = a.tipeAktivitas || "Lainnya";
    if (!activitiesMatrix[s]) activitiesMatrix[s] = {};
    activitiesMatrix[s][t] = (activitiesMatrix[s][t] || 0) + 1;
  }

  const closedWon = stageChanges.filter((h) => h.newValue === "9. Deal/Closed Won");

  return NextResponse.json({
    period: { from: from.toISOString(), to: to.toISOString() },
    summary: {
      totalActivities: activities.length,
      newProspects: newProspects.length,
      stageChanges: stageChanges.length,
      closedWon: closedWon.length,
      totalMoms: moms.length,
    },
    activitiesMatrix,
    activities,
    newProspects,
    stageChanges,
    closedWon,
    moms,
  });
}
