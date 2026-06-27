import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const quarantineBatches = await prisma.milk_Batches.findMany({
      where: {
        // Look specifically for the statuses our Logger just created!
        lab_status: { in: ['Pasteurized', 'Flagged'] } 
      },
      orderBy: { batch_id: 'asc' }
    });
    return NextResponse.json(quarantineBatches, { status: 200 });
  } catch (error) {
    console.error("QA FETCH ERROR:", error);
    return NextResponse.json({ error: "Failed to load QA queue." }, { status: 500 });
  }
}

// POST: Handle the Lab Tech clicking "Clear" or "Discard"
export async function POST(request: Request) {
  try {
    const { batchId, decision } = await request.json();

    if (!batchId || !decision) {
      return NextResponse.json({ error: "Missing required QA fields." }, { status: 400 });
    }

    // Map the button click to the final database status
    const newStatus = decision === 'Passed' ? 'Passed' : 'Discarded';

    const updatedBatch = await prisma.milk_Batches.update({
      where: { batch_id: batchId },
      data: { lab_status: newStatus }
    });

    return NextResponse.json({ message: `Batch #${batchId} officially marked as ${newStatus}.` }, { status: 200 });
  } catch (error) {
    console.error("QA UPDATE ERROR:", error);
    return NextResponse.json({ error: "Failed to update QA decision." }, { status: 500 });
  }
}