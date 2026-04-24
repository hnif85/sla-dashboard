import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
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

  const where = session.role === "sales" ? { salesId: session.userId } : {};

  const prospects = await prisma.prospect.findMany({
    where,
    include: { sales: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(prospects);
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const salesId = session.role === "sales" ? session.userId : (body.salesId || session.userId);

  const stage = await prisma.funnelStage.findFirst({ where: { name: body.stage } });
  const slaMax = stage?.slaMax ?? 7;
  const statusSLA = computeSLAStatus(body.stage || "1. Lead/Prospek", new Date(), slaMax);

  const weighted_umkm = (body.estUmkmReach || 0) * (body.probability || 0);
  const weighted_nilai = (body.estNilaiDeal || 0) * (body.probability || 0);

  const prospect = await prisma.prospect.create({
    data: {
      salesId,
      namaProspek: body.namaProspek,
      channel: body.channel,
      produkFokus: body.produkFokus,
      kontakPIC: body.kontakPIC,
      kontakInfo: body.kontakInfo,
      stage: body.stage || "1. Lead/Prospek",
      tglMasuk: body.tglMasuk ? new Date(body.tglMasuk) : new Date(),
      tglUpdateStage: new Date(),
      nextAction: body.nextAction,
      estUmkmReach: body.estUmkmReach ? parseInt(body.estUmkmReach) : null,
      estNilaiDeal: body.estNilaiDeal ? parseFloat(body.estNilaiDeal) : null,
      probability: body.probability ? parseFloat(body.probability) : null,
      weightedUmkm: weighted_umkm,
      weightedNilai: weighted_nilai,
      statusSLA,
      reasonLost: body.reasonLost,
      linkDokumen: body.linkDokumen,
    },
    include: { sales: { select: { id: true, name: true } } },
  });

  return NextResponse.json(prospect, { status: 201 });
}
