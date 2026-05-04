import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

const INCLUDE = {
  sales: { select: { id: true, name: true } },
  prospect: { select: { id: true, namaProspek: true, stage: true } },
  trainers: {
    orderBy: { order: "asc" as const },
    include: { trainer: { select: { id: true, name: true, email: true, region: true } } },
  },
} as const;

function parseTrainers(raw: unknown) {
  if (!Array.isArray(raw)) return null; // null = "not provided, keep existing"
  return (raw as { trainerId?: string; topik?: string }[])
    .filter((t) => typeof t.trainerId === "string" && t.trainerId.trim())
    .map((t, i) => ({
      trainerId: t.trainerId!.trim(),
      topik: t.topik?.trim() || null,
      order: i,
    }));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, include: INCLUDE });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role === "sales" && event.salesId !== session.userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (session.role === "trainer") {
    const isAssigned = event.trainers.some((t) => t.trainerId === session.userId);
    if (!isAssigned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(event);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "trainer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role === "sales" && existing.salesId !== session.userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const salesId = session.role === "admin" ? (body.salesId || existing.salesId) : existing.salesId;
  const trainers = parseTrainers(body.trainers);

  const event = await prisma.$transaction(async (tx) => {
    // Replace trainers only when the array was explicitly provided
    if (trainers !== null) {
      await tx.eventTrainer.deleteMany({ where: { eventId: id } });
      if (trainers.length > 0) {
        await tx.eventTrainer.createMany({
          data: trainers.map((t) => ({ ...t, eventId: id })),
        });
      }
    }

    return tx.event.update({
      where: { id },
      data: {
        namaEvent: body.namaEvent?.trim() ?? existing.namaEvent,
        tanggal: body.tanggal ? new Date(body.tanggal) : existing.tanggal,
        lokasiType: body.lokasiType ?? existing.lokasiType,
        lokasiDetail: "lokasiDetail" in body ? (body.lokasiDetail?.trim() || null) : existing.lokasiDetail,
        salesId,
        prospectId: "prospectId" in body ? (body.prospectId || null) : existing.prospectId,
        target: "target" in body ? (body.target?.trim() || null) : existing.target,
        jumlahPeserta: body.jumlahPeserta != null ? parseInt(body.jumlahPeserta) : existing.jumlahPeserta,
        jumlahAplikasi: body.jumlahAplikasi != null ? parseInt(body.jumlahAplikasi) : existing.jumlahAplikasi,
        resume: "resume" in body ? (body.resume?.trim() || null) : existing.resume,
      },
      include: INCLUDE,
    });
  });

  return NextResponse.json(event);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "trainer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role === "sales" && existing.salesId !== session.userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // EventTrainer rows deleted automatically via cascade
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
