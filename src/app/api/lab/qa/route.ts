import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all milk batches currently quarantined awaiting QA clearance
export async function GET() {
  try {
    const quarantinedBatches = await prisma.milk_Batches.findMany({
      where: { lab_status: 'Pending' },
      orderBy: { batch_id: 'desc' }
    });
    return NextResponse.json(quarantinedBatches, { status: 200 });
  } catch (error) {
    console.error("QA FETCH ERROR:", error);
    return NextResponse.json({ error: "Failed to load quarantined inventory." }, { status: 500 });
  }
}

// POST: Commit the final clinical verdict (Passed or Failed) for a batch
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { batchId, decision } = data; // decision is 'Passed' or 'Failed'

    if (!batchId || !decision) {
      return NextResponse.json({ error: "Missing batchId or screening decision text parameters." }, { status: 400 });
    }

    // Update the batch status
    const updatedBatch = await prisma.milk_Batches.update({
      where: { batch_id: Number(batchId) },
      data: { lab_status: decision }
    });

    return NextResponse.json({ 
      message: `Batch #${batchId} has been officially marked as '${decision}' and updated inside inventory logs.` 
    }, { status: 200 });

  } catch (error) {
    console.error("QA STATUS SUBMIT ERROR:", error);
    return NextResponse.json({ error: "Failed to update biological asset status." }, { status: 500 });
  }
}