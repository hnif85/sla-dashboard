import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only owner or admin can edit
  if (session.role !== "admin" && task.salesId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(body.judul !== undefined && { judul: body.judul }),
      ...(body.tipeAktivitas !== undefined && { tipeAktivitas: body.tipeAktivitas }),
      ...(body.tanggalRencana !== undefined && { tanggalRencana: new Date(body.tanggalRencana) }),
      ...(body.catatan !== undefined && { catatan: body.catatan }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.activityId !== undefined && { activityId: body.activityId }),
      ...(body.prospectId !== undefined && { prospectId: body.prospectId || null }),
    },
    include: {
      sales: { select: { id: true, name: true } },
      prospect: { select: { id: true, namaProspek: true } },
      activity: { select: { id: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role !== "admin" && task.salesId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
