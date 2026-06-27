import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { collection_ids } = await request.json();

    if (!collection_ids || collection_ids.length === 0) {
      return NextResponse.json({ error: "No bottles selected." }, { status: 400 });
    }

    // 1. Fetch the exact bottles they selected to calculate the total volume
    const bottles = await prisma.raw_Collections.findMany({
      where: { collection_id: { in: collection_ids }, batch_id: null }
    });

    if (bottles.length !== collection_ids.length) {
      return NextResponse.json({ error: "Some selected bottles have already been pooled." }, { status: 400 });
    }

    const totalVolume = bottles.reduce((sum, b) => sum + b.raw_volume_ml, 0);

    // 2. ATOMIC TRANSACTION: Create the Batch & Link the Bottles instantly
    const newBatch = await prisma.$transaction(async (tx) => {
      const batch = await tx.milk_Batches.create({
        data: {
          pooled_volume: totalVolume,
          current_volume: totalVolume,
          lab_status: "Pending Pasteurization" // Marks it ready for Phase 7!
        }
      });

      await tx.raw_Collections.updateMany({
        where: { collection_id: { in: collection_ids } },
        data: { batch_id: batch.batch_id }
      });

      return batch;
    });

    return NextResponse.json({ 
      message: `Success! Batch #${newBatch.batch_id} created with ${totalVolume} mL. Proceed to Pasteurization.`, 
      batch: newBatch 
    }, { status: 201 });

  } catch (error) {
    console.error("POOLING ERROR:", error);
    return NextResponse.json({ error: "Failed to pool batches." }, { status: 500 });
  }
}