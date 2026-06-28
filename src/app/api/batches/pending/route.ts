import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Look for auto-generated Batches that have NOT been given a temperature yet
    const pendingBatches = await prisma.milk_Batches.findMany({
      where: { 
        lab_status: 'Pending',
        pasteurization_temp: null 
      },
      orderBy: { batch_id: 'asc' } 
    });

    return NextResponse.json(pendingBatches, { status: 200 });
  } catch (error) {
    console.error("FETCH PENDING BATCHES ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch pending batches." }, { status: 500 });
  }
}