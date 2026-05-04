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
  if (!Array.isArray(raw)) return [];
  return (raw as { trainerId?: string; topik?: string }[])
    .filter((t) => typeof t.trainerId === "string" && t.trainerId.trim())
    .map((t, i) => ({
      trainerId: t.trainerId!.trim(),
      topik: t.topik?.trim() || null,
      order: i,
    }));
}

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const dateFrom = url.searchParams.get("dateFrom") || undefined;
    const dateTo = url.searchParams.get("dateTo") || undefined;

    const where: Record<string, unknown> = {};

    if (session.role === "sales") {
      where.salesId = session.userId;
    } else if (session.role === "trainer") {
      // Trainers see only events they are assigned to
      where.trainers = { some: { trainerId: session.userId } };
    }
    // admin sees all

    if (dateFrom || dateTo) {
      where.tanggal = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
      };
    }

    const events = await prisma.event.findMany({
      where,
      include: INCLUDE,
      orderBy: { tanggal: "desc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("GET /api/events failed:", error);
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "trainer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const salesId = session.role === "sales" ? session.userId : (body.salesId || session.userId);

  if (!body.namaEvent?.trim())
    return NextResponse.json({ error: "Nama event diperlukan" }, { status: 400 });
  if (!body.tanggal)
    return NextResponse.json({ error: "Tanggal event diperlukan" }, { status: 400 });

  const trainers = parseTrainers(body.trainers);

  const event = await prisma.event.create({
    data: {
      namaEvent: body.namaEvent.trim(),
      tanggal: new Date(body.tanggal),
      lokasiType: body.lokasiType || "online",
      lokasiDetail: body.lokasiDetail?.trim() || null,
      salesId,
      prospectId: body.prospectId || null,
      target: body.target?.trim() || null,
      jumlahPeserta: body.jumlahPeserta != null ? parseInt(body.jumlahPeserta) : null,
      jumlahAplikasi: body.jumlahAplikasi != null ? parseInt(body.jumlahAplikasi) : null,
      resume: body.resume?.trim() || null,
      trainers: trainers.length > 0 ? { createMany: { data: trainers } } : undefined,
    },
    include: INCLUDE,
  });

  return NextResponse.json(event, { status: 201 });
}
