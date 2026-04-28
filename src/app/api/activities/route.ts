import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { getCachedFunnelStages } from "@/lib/server-cache";
import { differenceInDays } from "date-fns";

function computeSLAStatus(stage: string, tglUpdateStage: Date, slaMax: number): string {
  if (stage.includes("Closed")) return "Closed";
  const days = differenceInDays(new Date(), tglUpdateStage);
  if (days <= slaMax * 0.5) return "On Track";
  if (days <= slaMax) return "At Risk";
  return "Overdue";
}

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const prospectId = url.searchParams.get("prospectId") || undefined;
  const dateFrom = url.searchParams.get("dateFrom") || undefined;
  const dateTo = url.searchParams.get("dateTo") || undefined;

  const where: Record<string, unknown> = session.role === "sales" ? { salesId: session.userId } : {};
  if (prospectId) where.prospectId = prospectId;
  if (dateFrom || dateTo) {
    where.tanggal = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
    };
  }

  const activities = await prisma.activity.findMany({
    where,
    include: { sales: { select: { name: true } }, prospect: { select: { id: true, namaProspek: true } } },
    orderBy: { tanggal: "desc" },
  });

  return NextResponse.json(activities);
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const salesId = session.role === "sales" ? session.userId : (body.salesId || session.userId);

  const shouldCreateMom = !!(body.mom && typeof body.mom.title === "string" && body.mom.title.trim());

  const result = await prisma.$transaction(async (tx) => {
    let momLink: string | undefined;

    if (shouldCreateMom) {
      const mom = await tx.mOM.create({
        data: {
          title: body.mom.title.trim(),
          salesId,
          prospectId: body.prospectId || null,
          participants: body.mom.participants,
          agenda: body.mom.agenda,
          discussion: body.mom.discussion,
          decisions: body.mom.decisions,
          actionItems: body.mom.actionItems,
          nextMeeting: body.mom.nextMeeting ? new Date(body.mom.nextMeeting) : null,
          tanggal: body.tanggal ? new Date(body.tanggal) : new Date(),
        },
      });
      momLink = `/mom/${mom.id}`;
    }

    const activity = await tx.activity.create({
      data: {
        salesId,
        prospectId: body.prospectId || null,
        tipeAktivitas: body.tipeAktivitas,
        namaProspek: body.namaProspek,
        pic: body.pic,
        topikHasil: body.topikHasil,
        nextStage: body.nextStage,
        catatan: body.catatan,
        linkMOM: momLink || body.linkMOM,
        tanggal: body.tanggal ? new Date(body.tanggal) : new Date(),
      },
      include: { sales: { select: { name: true } } },
    });

    // Auto-update stage pipeline jika nextStage diisi dan berbeda dari stage saat ini
    if (body.prospectId && body.nextStage) {
      const prospect = await tx.prospect.findUnique({
        where: { id: body.prospectId },
        select: { stage: true },
      });

      if (prospect && prospect.stage !== body.nextStage) {
        const funnelStages = await getCachedFunnelStages();
        const stageInfo = funnelStages.find((s) => s.name === body.nextStage);
        const slaMax = stageInfo?.slaMax ?? 7;
        // Gunakan tanggal activity (bukan now) agar SLA dihitung dari waktu meeting sebenarnya
        const stageChangeDate = body.tanggal ? new Date(body.tanggal) : new Date();
        const statusSLA = computeSLAStatus(body.nextStage, stageChangeDate, slaMax);

        await tx.prospect.update({
          where: { id: body.prospectId },
          data: {
            stage: body.nextStage,
            tglUpdateStage: stageChangeDate,
            statusSLA,
          },
        });

        // Catat perubahan stage ke pipeline history (dalam tx agar atomic)
        const notes = [body.tipeAktivitas, body.topikHasil].filter(Boolean).join(" — ");
        await tx.pipelineHistory.create({
          data: {
            prospectId: body.prospectId,
            changedById: salesId,
            fieldName: "Stage",
            oldValue: prospect.stage,
            newValue: body.nextStage,
            notes: notes ? `Via Activity: ${notes}` : "Via Activity Log",
            changedAt: stageChangeDate,
          },
        });
      }
    }

    return { activity };
  });

  return NextResponse.json(result.activity, { status: 201 });
}
