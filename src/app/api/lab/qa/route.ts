import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const quarantineBatches = await prisma.milk_Batches.findMany({
      where: {
        // THE FIX: We added 'Pending' so it perfectly matches your batches route! 
        // Keeping 'QA Review' just in case old test batches are stuck in there.
        lab_status: {
          in: ['Pending', 'QA Review', 'Flagged']
        }
      },
      orderBy: { batch_id: 'asc' }
    });

    return NextResponse.json(quarantineBatches, { status: 200 });
  } catch (error) {
    console.error("QA Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch QA batches" }, { status: 500 });
  }
}

// POST: Handle the Pass/Discard Buttons
export async function POST(request: Request) {
  try {
    const { batchId, decision } = await request.json(); 

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