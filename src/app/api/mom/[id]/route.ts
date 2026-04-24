import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const mom = await prisma.mOM.findUnique({
    where: { id },
    include: { sales: { select: { name: true } }, prospect: { select: { namaProspek: true } } },
  });

  if (!mom) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role === "sales" && mom.salesId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(mom);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.mOM.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role === "sales" && existing.salesId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const mom = await prisma.mOM.update({
    where: { id },
    data: {
      title: body.title ?? existing.title,
      participants: body.participants ?? existing.participants,
      agenda: body.agenda ?? existing.agenda,
      discussion: body.discussion ?? existing.discussion,
      decisions: body.decisions ?? existing.decisions,
      actionItems: body.actionItems ?? existing.actionItems,
      nextMeeting: body.nextMeeting ? new Date(body.nextMeeting) : existing.nextMeeting,
      tanggal: body.tanggal ? new Date(body.tanggal) : existing.tanggal,
    },
    include: { sales: { select: { name: true } }, prospect: { select: { namaProspek: true } } },
  });

  return NextResponse.json(mom);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.mOM.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role === "sales" && existing.salesId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.mOM.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
