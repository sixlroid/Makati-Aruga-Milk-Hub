import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all independent raw bottles awaiting thermal loops
export async function GET() {
  try {
    const pendingBottles = await prisma.raw_Collections.findMany({
      where: { batch_id: null },
      include: {
        donor: { select: { tracking_no: true } }
      },
      orderBy: { date_collected: 'asc' }
    });
    return NextResponse.json(pendingBottles, { status: 200 });
  } catch (error) {
    console.error("FETCH QUEUE ERROR:", error);
    return NextResponse.json({ error: "Failed to load bottle queue." }, { status: 500 });
  }
}

// POST: Process custom arrays or full bulk bottle actions safely
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { ids } = data; // Expecting an array of numbers: [1, 2, 4]

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No storage units selected for run entry." }, { status: 400 });
    }

    // Fetch only the unprocessed rows out of the target selection
    const targetBottles = await prisma.raw_Collections.findMany({
      where: {
        collection_id: { in: ids },
        batch_id: null
      }
    });

    if (targetBottles.length === 0) {
      return NextResponse.json({ error: "No matching valid unpasteurized targets found." }, { status: 404 });
    }

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 6);
    const results = [];

    // Loop through each independently to maintain discrete bio-asset boundaries
    for (const bottle of targetBottles) {
      const newBatch = await prisma.milk_Batches.create({
        data: {
            pooled_volume: bottle.raw_volume_ml,
            current_volume: bottle.raw_volume_ml,
            lab_status: "Pending", // <-- CHANGED FROM "Passed" TO "Pending"
            expiry_date: expiry,
            tested_by: 2 
        }
        });

      await prisma.raw_Collections.update({
        where: { collection_id: bottle.collection_id },
        data: { batch_id: newBatch.batch_id }
      });

      results.push({
        batchId: newBatch.batch_id,
        volume: bottle.raw_volume_ml,
        expiryDate: expiry.toLocaleDateString('en-GB')
      });
    }

    return NextResponse.json({
      message: `Manually executed runs for ${results.length} independent storage files.`,
      results
    }, { status: 201 });

  } catch (error) {
    console.error("PASTEURIZATION EXECUTION ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error during loop run." }, { status: 500 });
  }
}