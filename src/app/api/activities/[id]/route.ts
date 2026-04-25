import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Admin bisa hapus semua; sales hanya milik sendiri
  if (session.role !== "admin" && activity.salesId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Jika ada task yang terhubung via activityId, putuskan relasi dulu
  await prisma.task.updateMany({
    where: { activityId: id },
    data: { activityId: null },
  });

  await prisma.activity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
