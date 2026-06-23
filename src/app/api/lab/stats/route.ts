import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 1. Calculate how much raw milk is waiting to be pooled (batch_id is null)
    const rawPending = await prisma.raw_Collections.aggregate({
      _sum: { raw_volume_ml: true },
      where: { batch_id: null }
    });

    // 2. Calculate the total safe milk currently available to dispense
    const activeBatches = await prisma.milk_Batches.aggregate({
      _sum: { current_volume: true },
      where: { current_volume: { gt: 0 }, lab_status: 'Passed' }
    });

    // 3. Count how many active batches are in the freezer
    const batchCount = await prisma.milk_Batches.count({
      where: { current_volume: { gt: 0 }, lab_status: 'Passed' }
    });

    return NextResponse.json({
      pending_raw_ml: rawPending._sum.raw_volume_ml || 0,
      total_pasteurized_ml: activeBatches._sum.current_volume || 0,
      active_batch_count: batchCount || 0
    }, { status: 200 });

  } catch (error) {
    console.error("LAB STATS API ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch lab stats" }, { status: 500 });
  }
}