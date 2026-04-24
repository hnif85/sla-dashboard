import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = session.role === "sales" ? { salesId: session.userId } : {};

  const moms = await prisma.mOM.findMany({
    where,
    include: {
      sales: { select: { name: true } },
      prospect: { select: { namaProspek: true } },
    },
    orderBy: { tanggal: "desc" },
  });

  return NextResponse.json(moms);
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const salesId = session.role === "sales" ? session.userId : (body.salesId || session.userId);

  const mom = await prisma.mOM.create({
    data: {
      title: body.title,
      salesId,
      prospectId: body.prospectId || null,
      participants: body.participants,
      agenda: body.agenda,
      discussion: body.discussion,
      decisions: body.decisions,
      actionItems: body.actionItems,
      nextMeeting: body.nextMeeting ? new Date(body.nextMeeting) : null,
      tanggal: body.tanggal ? new Date(body.tanggal) : new Date(),
    },
    include: {
      sales: { select: { name: true } },
      prospect: { select: { namaProspek: true } },
    },
  });

  return NextResponse.json(mom, { status: 201 });
}
