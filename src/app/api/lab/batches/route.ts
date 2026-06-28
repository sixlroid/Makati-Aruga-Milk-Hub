import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Fetch bottles that haven't been pooled yet
    const rawQueue = await prisma.raw_Collections.findMany({
      where: { batch_id: null },
      include: { donor: true },
      orderBy: { date_collected: 'asc' }
    });
    return NextResponse.json(rawQueue, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load raw queue" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { ids, temperature, duration, mbt_result } = await request.json();

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: "No bottles selected." }, { status: 400 });
    }

    const tempNum = Number(temperature);
    const timeNum = Number(duration);
    
    // Evaluate Safety Rules automatically
    let safetyFlags = null;
    
    // THE FIX: This MUST be exactly "Pending" to show up in your QA Tab!
    let initialStatus = "Pending"; 

    if (tempNum < 62.5 || timeNum < 30 || mbt_result === "Failed") {
      safetyFlags = `Failed params: Temp ${tempNum}°C, Time ${timeNum}m, MBT: ${mbt_result}`;
      initialStatus = "Flagged"; // Still goes to QA, but highlighted in Red
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Calculate total pooled volume
      const bottles = await tx.raw_Collections.findMany({
        where: { collection_id: { in: ids } }
      });
      const pooledVol = bottles.reduce((sum, b) => sum + b.raw_volume_ml, 0);

      // 2. Create the unified batch record
      const newBatch = await tx.milk_Batches.create({
        data: {
          pooled_volume: pooledVol,
          current_volume: pooledVol,
          lab_status: initialStatus,
          pasteurization_temp: tempNum,
          pasteurization_time: timeNum,
          safety_flags: safetyFlags
        }
      });

      // 3. Link the raw bottles to this new batch ID
      await tx.raw_Collections.updateMany({
        where: { collection_id: { in: ids } },
        data: { batch_id: newBatch.batch_id }
      });

      return newBatch;
    });

    return NextResponse.json({ 
      message: safetyFlags ? "Batch created but Flagged for Discard Recommended." : "Batch processed and sent to QA.",
      results: {
        batch_id: result.batch_id,
        volume: result.pooled_volume,
        temp: result.pasteurization_temp,
        time: result.pasteurization_time
      }
    }, { status: 200 });

  } catch (error) {
    console.error("BATCH PROCESSING ERROR:", error);
    return NextResponse.json({ error: "Failed to process batch." }, { status: 500 });
  }
}