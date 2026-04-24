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

  const toStr = (v: unknown) => Array.isArray(v) ? v.join("\n") : (v as string) || null;

  const mom = await prisma.mOM.create({
    data: {
      title: body.title,
      salesId,
      prospectId: body.prospectId || null,
      participants: toStr(body.participants),
      agenda: toStr(body.agenda),
      discussion: toStr(body.discussion),
      decisions: toStr(body.decisions),
      actionItems: toStr(body.actionItems),
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
