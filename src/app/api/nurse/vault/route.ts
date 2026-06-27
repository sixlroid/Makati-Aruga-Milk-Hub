import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const vault = await prisma.milk_Batches.findMany({
      where: { lab_status: 'Cleared', current_volume: { gt: 0 } },
      orderBy: { batch_id: 'desc' }
    });
    return NextResponse.json(vault, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load vault" }, { status: 500 });
  }
}