import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

// GET: Feed the QA Desk Table
export async function GET() {
  try {
    const qaBatches = await prisma.milk_Batches.findMany({
      where: { lab_status: "Pending" }, // Waiting for MBT results
      orderBy: { batch_id: 'asc' }
    });
    return NextResponse.json(qaBatches, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load QA desk" }, { status: 500 });
  }
}

// POST: Handle the Pass/Discard Buttons
export async function POST(request: Request) {
  try {
    const { batchId, decision } = await request.json(); // 'Passed' or 'Failed'

    let finalStatus = "Cleared";
    let expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 6); // Good for 6 months

    if (decision === "Failed") {
      finalStatus = "Discarded";
      expiryDate = new Date(0); 
    }

    await prisma.milk_Batches.update({
      where: { batch_id: batchId },
      data: {
        lab_status: finalStatus,
        expiry_date: expiryDate
      }
    });

    return NextResponse.json({ 
      message: finalStatus === "Cleared" ? "Milk moved to Safe Vault." : "Contaminated batch destroyed." 
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to log QA decision" }, { status: 500 });
  }
}