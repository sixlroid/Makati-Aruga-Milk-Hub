import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const pendingBatches = await prisma.milk_Batches.findMany({
      where: {
        pasteurization_temp: null 
      },
      orderBy: { batch_id: 'asc' } // <--- CHANGED THIS FROM created_at
    });

    return NextResponse.json(pendingBatches, { status: 200 });
  } catch (error) {
    console.error("Pasteurization Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch pending batches" }, { status: 500 });
  }
}