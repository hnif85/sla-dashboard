import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { logPipelineChange } from "@/lib/pipeline-history";
import { differenceInDays } from "date-fns";

function computeSLAStatus(stage: string, tglUpdateStage: Date, slaMax: number): string {
  if (stage.includes("Closed")) return "Closed";
  const days = differenceInDays(new Date(), tglUpdateStage);
  if (days <= slaMax * 0.5) return "On Track";
  if (days <= slaMax) return "At Risk";
  return "Overdue";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const prospect = await prisma.prospect.findUnique({
    where: { id },
    include: {
      sales: { select: { id: true, name: true, email: true } },
      history: {
        include: { changedBy: { select: { id: true, name: true } } },
        orderBy: { changedAt: "desc" },
      },
      activities: {
        include: { sales: { select: { name: true } } },
        orderBy: { tanggal: "desc" },
      },
      moms: {
        include: { sales: { select: { name: true } } },
        orderBy: { tanggal: "desc" },
      },
    },
  });

  if (!prospect) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role === "sales" && prospect.salesId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(prospect);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.prospect.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role === "sales" && existing.salesId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const stageChanged = body.stage && body.stage !== existing.stage;
  const tglUpdateStage = stageChanged ? new Date() : existing.tglUpdateStage;

  const stage = await prisma.funnelStage.findFirst({ where: { name: body.stage || existing.stage } });
  const slaMax = stage?.slaMax ?? 7;
  const statusSLA = computeSLAStatus(body.stage || existing.stage, tglUpdateStage, slaMax);

  const probability = body.probability != null ? parseFloat(body.probability) : existing.probability;
  const estUmkm = body.estUmkmReach != null ? parseInt(body.estUmkmReach) : existing.estUmkmReach;
  const estNilai = body.estNilaiDeal != null ? parseFloat(body.estNilaiDeal) : existing.estNilaiDeal;

  const updated = await prisma.prospect.update({
    where: { id },
    data: {
      namaProspek: body.namaProspek ?? existing.namaProspek,
      channel: body.channel ?? existing.channel,
      produkFokus: body.produkFokus ?? existing.produkFokus,
      kontakPIC: body.kontakPIC ?? existing.kontakPIC,
      kontakInfo: body.kontakInfo ?? existing.kontakInfo,
      stage: body.stage ?? existing.stage,
      tglUpdateStage,
      nextAction: body.nextAction ?? existing.nextAction,
      estUmkmReach: estUmkm,
      estNilaiDeal: estNilai,
      probability,
      weightedUmkm: (estUmkm || 0) * (probability || 0),
      weightedNilai: (estNilai || 0) * (probability || 0),
      statusSLA,
      reasonLost: body.reasonLost ?? existing.reasonLost,
      linkDokumen: body.linkDokumen ?? existing.linkDokumen,
    },
    include: { sales: { select: { id: true, name: true } } },
  });

  await logPipelineChange(
    id,
    session.userId,
    existing as unknown as Record<string, unknown>,
    updated as unknown as Record<string, unknown>,
    body.notes
  );

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  await prisma.prospect.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
