import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const configs = await prisma.config.findMany({ orderBy: { category: "asc" } });
  return NextResponse.json(configs);
}

export async function PUT(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();
  const updates = Array.isArray(body) ? body : [body];

  const results = await Promise.all(
    updates.map((u: { key: string; value: string }) =>
      prisma.config.update({ where: { key: u.key }, data: { value: u.value } })
    )
  );

  return NextResponse.json(results);
}
