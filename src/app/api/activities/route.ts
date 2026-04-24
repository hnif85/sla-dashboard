import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const prospectId = url.searchParams.get("prospectId") || undefined;

  const where: Record<string, unknown> = session.role === "sales" ? { salesId: session.userId } : {};
  if (prospectId) where.prospectId = prospectId;

  const activities = await prisma.activity.findMany({
    where,
    include: { sales: { select: { name: true } }, prospect: { select: { namaProspek: true } } },
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

    return { activity };
  });

  return NextResponse.json(result.activity, { status: 201 });
}
