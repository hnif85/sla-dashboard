import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = session.role === "sales" ? { salesId: session.userId } : {};

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

  const activity = await prisma.activity.create({
    data: {
      salesId,
      prospectId: body.prospectId || null,
      tipeAktivitas: body.tipeAktivitas,
      namaProspek: body.namaProspek,
      pic: body.pic,
      topikHasil: body.topikHasil,
      nextStage: body.nextStage,
      catatan: body.catatan,
      linkMOM: body.linkMOM,
      tanggal: body.tanggal ? new Date(body.tanggal) : new Date(),
    },
    include: { sales: { select: { name: true } } },
  });

  return NextResponse.json(activity, { status: 201 });
}
