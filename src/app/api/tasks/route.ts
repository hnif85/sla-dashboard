import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const salesId = url.searchParams.get("salesId") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const prospectId = url.searchParams.get("prospectId") || undefined;
  const dateFrom = url.searchParams.get("dateFrom") || undefined;
  const dateTo = url.searchParams.get("dateTo") || undefined;

  const where: Record<string, unknown> = {};

  // Sales: only own tasks. Admin: all, with optional salesId filter
  if (session.role === "sales") {
    where.salesId = session.userId;
  } else if (salesId) {
    where.salesId = salesId;
  }

  if (status) where.status = status;
  if (prospectId) where.prospectId = prospectId;

  if (dateFrom || dateTo) {
    where.tanggalRencana = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
    };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      sales: { select: { id: true, name: true } },
      prospect: { select: { id: true, namaProspek: true } },
      activity: { select: { id: true } },
    },
    orderBy: { tanggalRencana: "asc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // Admin bisa assign ke sales lain; sales hanya untuk dirinya sendiri
  const salesId = session.role === "sales" ? session.userId : (body.salesId || session.userId);

  const task = await prisma.task.create({
    data: {
      salesId,
      prospectId: body.prospectId || null,
      judul: body.judul,
      tipeAktivitas: body.tipeAktivitas,
      tanggalRencana: new Date(body.tanggalRencana),
      catatan: body.catatan || null,
      status: "planned",
    },
    include: {
      sales: { select: { id: true, name: true } },
      prospect: { select: { id: true, namaProspek: true } },
      activity: { select: { id: true } },
    },
  });

  return NextResponse.json(task, { status: 201 });
}
