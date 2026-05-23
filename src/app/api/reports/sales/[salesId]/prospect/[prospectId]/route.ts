import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCachedFunnelStages } from "@/lib/server-cache";
import { getSessionFromRequest } from "@/lib/auth";
import { differenceInDays } from "date-fns";
import crypto from "crypto";

function computeSLAStatus(stage: string, effectiveDate: Date, slaMax: number): string {
  if (stage.includes("Closed")) return "Closed";
  const days = differenceInDays(new Date(), effectiveDate);
  if (days <= slaMax * 0.5) return "On Track";
  if (days <= slaMax) return "At Risk";
  return "Overdue";
}

function buildDataHash(activitiesCount: number, momsCount: number, lastActivityDate: Date | null, lastMomDate: Date | null): string {
  const raw = `${activitiesCount}:${momsCount}:${lastActivityDate?.toISOString() ?? ""}:${lastMomDate?.toISOString() ?? ""}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salesId: string; prospectId: string }> }
) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { salesId, prospectId } = await params;

  if (session.role === "sales" && session.userId !== salesId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "trainer" || session.role === "crm") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [prospect, funnelStages] = await Promise.all([
      prisma.prospect.findUnique({
        where: { id: prospectId, salesId, deletedAt: null },
        select: {
          id: true,
          namaProspek: true,
          channel: true,
          produkFokus: true,
          kontakPIC: true,
          kontakInfo: true,
          stage: true,
          tglMasuk: true,
          tglUpdateStage: true,
          estUmkmReach: true,
          estNilaiDeal: true,
          probability: true,
          weightedUmkm: true,
          nextAction: true,
          reasonLost: true,
          linkDokumen: true,
          activities: {
            select: {
              id: true,
              tanggal: true,
              tipeAktivitas: true,
              namaProspek: true,
              pic: true,
              topikHasil: true,
              catatan: true,
              nextStage: true,
              linkMOM: true,
            },
            orderBy: { tanggal: "desc" },
          },
          moms: {
            select: {
              id: true,
              title: true,
              tanggal: true,
              participants: true,
              agenda: true,
              discussion: true,
              decisions: true,
              actionItems: true,
              nextMeeting: true,
            },
            orderBy: { tanggal: "desc" },
          },
          history: {
            where: { fieldName: "Stage" },
            select: {
              id: true,
              changedAt: true,
              oldValue: true,
              newValue: true,
              notes: true,
              changedBy: { select: { name: true } },
            },
            orderBy: { changedAt: "desc" },
          },
          summaryCache: {
            select: {
              id: true,
              summary: true,
              dataHash: true,
              activitiesCount: true,
              momsCount: true,
              generatedAt: true,
              generatedBy: { select: { name: true } },
            },
          },
        },
      }),
      getCachedFunnelStages(),
    ]);

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Compute effective date & SLA
    const lastActivityDate = prospect.activities[0]?.tanggal ?? null;
    const effectiveDate =
      lastActivityDate && new Date(lastActivityDate) > new Date(prospect.tglUpdateStage)
        ? new Date(lastActivityDate)
        : new Date(prospect.tglUpdateStage);

    const stageMap = Object.fromEntries(funnelStages.map((s) => [s.name, s]));
    const slaMax = stageMap[prospect.stage]?.slaMax ?? 7;
    const statusSLA = computeSLAStatus(prospect.stage, effectiveDate, slaMax);
    const hariDiStage = differenceInDays(new Date(), effectiveDate);

    // Compute current hash to check if summary is stale
    const lastMomDate = prospect.moms[0]?.tanggal ?? null;
    const currentHash = buildDataHash(
      prospect.activities.length,
      prospect.moms.length,
      lastActivityDate ? new Date(lastActivityDate) : null,
      lastMomDate ? new Date(lastMomDate) : null
    );

    const cachedSummary = prospect.summaryCache
      ? {
          summary: prospect.summaryCache.summary,
          generatedAt: prospect.summaryCache.generatedAt,
          generatedBy: prospect.summaryCache.generatedBy.name,
          isStale: prospect.summaryCache.dataHash !== currentHash,
          activitiesCount: prospect.summaryCache.activitiesCount,
          momsCount: prospect.summaryCache.momsCount,
        }
      : null;

    return NextResponse.json({
      prospect: {
        id: prospect.id,
        namaProspek: prospect.namaProspek,
        channel: prospect.channel,
        produkFokus: prospect.produkFokus,
        kontakPIC: prospect.kontakPIC,
        kontakInfo: prospect.kontakInfo,
        stage: prospect.stage,
        tglMasuk: prospect.tglMasuk,
        tglUpdateStage: effectiveDate,
        estUmkmReach: prospect.estUmkmReach,
        estNilaiDeal: prospect.estNilaiDeal,
        probability: prospect.probability,
        weightedUmkm: prospect.weightedUmkm,
        nextAction: prospect.nextAction,
        reasonLost: prospect.reasonLost,
        linkDokumen: prospect.linkDokumen,
        statusSLA,
        hariDiStage,
      },
      activities: prospect.activities,
      moms: prospect.moms,
      stageHistory: prospect.history,
      cachedSummary,
      currentHash,
    });
  } catch (error) {
    console.error("[api/reports/prospect] failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
