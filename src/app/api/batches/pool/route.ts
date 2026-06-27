import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { collection_ids } = await request.json();

    if (!collection_ids || collection_ids.length === 0) {
      return NextResponse.json({ error: "No bottles selected for pooling." }, { status: 400 });
    }

    // 1. Fetch the raw bottles to calculate total volume
    const bottles = await prisma.raw_Collections.findMany({
      where: { collection_id: { in: collection_ids } }
    });

    const totalVolume = bottles.reduce((sum, b) => sum + b.raw_volume_ml, 0);

    // 2. The Atomic Transaction: Create Batch & Link Bottles
    await prisma.$transaction(async (tx) => {
      // A. Create the master batch
      const newBatch = await tx.milk_Batches.create({
        data: {
          pooled_volume: totalVolume,
          current_volume: totalVolume, // Starts full
          lab_status: "Pending",       // Waiting for pasteurization
        }
      });

      // B. Link all selected raw bottles to this new batch
      await tx.raw_Collections.updateMany({
        where: { collection_id: { in: collection_ids } },
        data: { batch_id: newBatch.batch_id }
      });
    });

    return NextResponse.json({ message: `Successfully pooled ${totalVolume}mL into a new batch.` }, { status: 201 });

  } catch (error) {
    console.error("POOLING ERROR:", error);
    return NextResponse.json({ error: "Failed to pool milk." }, { status: 500 });
  }
}