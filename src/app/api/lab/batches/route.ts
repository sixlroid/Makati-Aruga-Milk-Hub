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

// POST: Process custom arrays with strict thermal parameter validation
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { ids, temperature, duration } = data;

    // TC-PL-04: Verify system validation for required input fields
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No storage units selected for run entry." }, { status: 400 });
    }
    if (!temperature || !duration) {
      return NextResponse.json({ error: "Fields Required: Temperature and Duration must be specified." }, { status: 400 });
    }

    const tempValue = parseFloat(temperature);
    const timeValue = parseInt(duration, 10);

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

    // Evaluate Quality Control Parameters
    let finalStatus = "Pasteurized";
    let warningFlag = null;

    // TC-PL-02 & TC-PL-03: Sub-optimal temperature or insufficient duration
    if (tempValue < 62.5 || timeValue < 30) {
      finalStatus = "Flagged";
      warningFlag = "Warning: Discard Recommended - Insufficient thermal load.";
    }

    // Loop through each independently to maintain discrete bio-asset boundaries
    for (const bottle of targetBottles) {
      const newBatch = await prisma.milk_Batches.create({
        data: {
            pooled_volume: bottle.raw_volume_ml,
            current_volume: bottle.raw_volume_ml,
            lab_status: finalStatus,
            expiry_date: expiry,
            pasteurization_temp: tempValue,
            pasteurization_time: timeValue,
            safety_flags: warningFlag,
            tested_by: 2 // Hardcoded staff ID for now
        }
      });

      await prisma.raw_Collections.update({
        where: { collection_id: bottle.collection_id },
        data: { batch_id: newBatch.batch_id }
      });

      results.push({
        batchId: newBatch.batch_id,
        volume: bottle.raw_volume_ml,
        status: finalStatus,
        warning: warningFlag
      });
    }

    // Determine the overall response message
    const responseMessage = warningFlag 
      ? `System Warning: Discard Recommended for ${results.length} batches.`
      : `Successfully Pasteurized ${results.length} batches.`;

    return NextResponse.json({
      message: responseMessage,
      results
    }, { status: 201 });

  } catch (error) {
    console.error("PASTEURIZATION EXECUTION ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error during loop run." }, { status: 500 });
  }
}