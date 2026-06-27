import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const pendingBatches = await prisma.milk_Batches.findMany({
      where: { 
        lab_status: "Pending Pasteurization" 
      },
      orderBy: { batch_id: 'asc' }
    });

    return NextResponse.json(pendingBatches, { status: 200 });
  } catch (error) {
    console.error("FETCH PENDING BATCHES ERROR:", error);
    return NextResponse.json({ error: "Failed to load pending batches." }, { status: 500 });
  }
}