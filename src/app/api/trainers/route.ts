import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trainers = await prisma.user.findMany({
    where: { role: "trainer", active: true },
    select: { id: true, name: true, email: true, region: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(trainers);
}
