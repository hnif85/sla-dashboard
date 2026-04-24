import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stages = await prisma.funnelStage.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(stages);
}

export async function PUT(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();
  const stage = await prisma.funnelStage.update({
    where: { id: body.id },
    data: {
      slaMin: body.slaMin,
      slaTarget: body.slaTarget,
      slaMax: body.slaMax,
      convRateTarget: body.convRateTarget,
      description: body.description,
    },
  });

  return NextResponse.json(stage);
}
