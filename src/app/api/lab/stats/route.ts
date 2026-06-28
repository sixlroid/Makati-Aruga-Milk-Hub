import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const pendingBatches = await prisma.milk_Batches.findMany({ 
      where: { lab_status: 'Pending' } 
    });
    
    const clearedBatches = await prisma.milk_Batches.findMany({ 
      where: { lab_status: "Cleared" } 
    });

    const pending_raw_ml = pendingBatches.reduce((sum, b) => sum + b.current_volume, 0);
    const total_pasteurized_ml = clearedBatches.reduce((sum, b) => sum + b.current_volume, 0);
    const active_batch_count = clearedBatches.length;

    return NextResponse.json({
      pending_raw_ml,
      total_pasteurized_ml,
      active_batch_count
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}